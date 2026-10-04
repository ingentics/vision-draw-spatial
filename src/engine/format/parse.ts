import type { Element } from '@xmldom/xmldom';
import type {
  DocumentModel,
  EdgeLabelModel,
  EdgeLabelPlacement,
  EdgeModel,
  LayerModel,
  PageModel,
  ParseWarning,
  Point,
  Rect,
  ShapeModel,
} from '../model/types';
import { computeBounds } from '../model/bounds';
import { SPATIAL, spatialValue } from '../spatial';
import { htmlToText, resolvePlaceholders } from './label';
import { isRich, parseRichHtml } from './richText';
import { parseLink } from './link';
import { parseStyle, resolveShapeKind } from './style';
import { childElements, type DrawioTree, type PageTree, readDrawioTree } from './xmlTree';

export { DrawioParseError } from './xmlTree';

/**
 * Lecture d'un fichier draw.io (SPEC §7) : `<mxfile>` → `DocumentModel`.
 *
 * Seul un XML illisible fait échouer le parsing. Tout le reste (page corrompue, parent
 * manquant, lien vers une page absente…) produit un avertissement dans `warnings`.
 */

export function parseDrawio(xml: string): DocumentModel {
  return readDrawio(xml).document;
}

/**
 * Lecture avec conservation de l'arbre XML d'origine (SPEC §14.2) : les ids du modèle
 * (pages, formes, arêtes, labels) sont les clés de `tree.pages[i].cells`.
 */
export function readDrawio(xml: string): { document: DocumentModel; tree: DrawioTree } {
  const tree = readDrawioTree(xml);
  return { document: documentFromTree(tree), tree };
}

/** Modèle d'un arbre XML (aussi pour le reconstruire après une modification de l'arbre). */
export function documentFromTree(tree: DrawioTree): DocumentModel {
  const warnings: ParseWarning[] = [];
  const pages = tree.pages.map((page) => parsePage(page, warnings));
  checkPageLinks(pages, warnings);
  return { pages, warnings };
}

// ---------------------------------------------------------------------------
// Pages

function parsePage(page: PageTree, warnings: ParseWarning[]): PageModel {
  if (page.encoding === 'unreadable') warnings.push({ pageId: page.id, message: `Page illisible : ${page.error}` });
  if (!page.model) return emptyPage(page.id, page.name);
  return parseGraphModel(page, warnings);
}

function emptyPage(id: string, name: string): PageModel {
  return { id, name, layers: [], shapes: [], edges: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };
}

// ---------------------------------------------------------------------------
// Cellules brutes

interface RawGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  relative: boolean;
  points: Point[];
  sourcePoint?: Point;
  targetPoint?: Point;
  offset?: Point;
}

interface RawCell {
  id: string;
  parent?: string;
  label: string;
  styleString: string;
  vertex: boolean;
  edge: boolean;
  source?: string;
  target?: string;
  visible: boolean;
  geometry?: RawGeometry;
  attributes: Record<string, string>;
  link?: string;
  placeholders: boolean;
  order: number;
}

/** Attributs de `<object>` / `<UserObject>` qui ne sont pas des attributs personnalisés. */
const OBJECT_RESERVED_ATTRIBUTES = new Set(['id', 'label', 'link', 'placeholders']);

function readCells(page: PageTree, warnings: ParseWarning[]): RawCell[] {
  return page.cellList.map((nodes, order) => {
    const { id, cell: cellEl, wrapper, element } = nodes;
    if (nodes.generatedId) {
      warnings.push({ pageId: page.id, message: `Cellule sans id (<${element.tagName}>), identifiant généré : ${id}` });
    }

    const attributes: Record<string, string> = {};
    if (wrapper) {
      for (let i = 0; i < wrapper.attributes.length; i++) {
        const attr = wrapper.attributes.item(i);
        if (attr && !OBJECT_RESERVED_ATTRIBUTES.has(attr.name)) attributes[attr.name] = attr.value;
      }
    }

    return {
      id,
      parent: cellEl?.getAttribute('parent') || undefined,
      label: (wrapper ? wrapper.getAttribute('label') : cellEl?.getAttribute('value')) ?? '',
      styleString: cellEl?.getAttribute('style') ?? '',
      vertex: cellEl?.getAttribute('vertex') === '1',
      edge: cellEl?.getAttribute('edge') === '1',
      source: cellEl?.getAttribute('source') || undefined,
      target: cellEl?.getAttribute('target') || undefined,
      visible: cellEl?.getAttribute('visible') !== '0',
      geometry: nodes.geometry ? readGeometry(nodes.geometry) : undefined,
      attributes,
      link: wrapper?.getAttribute('link') ?? undefined,
      placeholders: wrapper?.getAttribute('placeholders') === '1',
      order,
    } satisfies RawCell;
  });
}

function readGeometry(el: Element): RawGeometry {
  const geometry: RawGeometry = {
    x: num(el, 'x'),
    y: num(el, 'y'),
    width: num(el, 'width'),
    height: num(el, 'height'),
    relative: el.getAttribute('relative') === '1',
    points: [],
  };

  for (const child of childElements(el)) {
    const as = child.getAttribute('as');
    if (child.tagName === 'mxPoint') {
      if (as === 'sourcePoint') geometry.sourcePoint = readPoint(child);
      else if (as === 'targetPoint') geometry.targetPoint = readPoint(child);
      else if (as === 'offset') geometry.offset = readPoint(child);
    } else if (child.tagName === 'Array' && as === 'points') {
      geometry.points = childElements(child, 'mxPoint').map(readPoint);
    }
  }
  return geometry;
}

function readPoint(el: Element): Point {
  return { x: num(el, 'x'), y: num(el, 'y') };
}

// ---------------------------------------------------------------------------
// Construction du modèle d'une page

function parseGraphModel(page: PageTree, warnings: ParseWarning[]): PageModel {
  const { id, name } = page;
  const cells = readCells(page, warnings);
  const byId = new Map<string, RawCell>();
  for (const cell of cells) {
    if (byId.has(cell.id)) warnings.push({ pageId: id, cellId: cell.id, message: 'Identifiant de cellule dupliqué' });
    else byId.set(cell.id, cell);
  }

  const rootIds = new Set(cells.filter((c) => !c.parent && !c.vertex && !c.edge).map((c) => c.id));
  const isLayer = (c: RawCell) => !c.vertex && !c.edge && c.parent !== undefined && rootIds.has(c.parent);
  const layerCells = cells.filter(isLayer);
  const layers: LayerModel[] = layerCells.map((c) => ({ id: c.id, name: c.label, visible: c.visible }));
  const fallbackLayerId = layers[0]?.id ?? '';

  const warn = (cellId: string, message: string) => warnings.push({ pageId: id, cellId, message });

  // Calque d'une cellule : on remonte les parents jusqu'à une cellule-calque.
  const layerCache = new Map<string, string>();
  const layerOf = (cell: RawCell): string => {
    const cached = layerCache.get(cell.id);
    if (cached !== undefined) return cached;
    let current: RawCell | undefined = cell;
    const seen = new Set<string>();
    let result = fallbackLayerId;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      if (isLayer(current)) {
        result = current.id;
        break;
      }
      current = current.parent ? byId.get(current.parent) : undefined;
    }
    layerCache.set(cell.id, result);
    return result;
  };

  // Emprise absolue des vertex : les coordonnées draw.io sont relatives au parent.
  const boundsCache = new Map<string, Rect>();
  const visiting = new Set<string>();
  const absoluteBounds = (cell: RawCell): Rect => {
    const cached = boundsCache.get(cell.id);
    if (cached) return cached;

    const geo = cell.geometry;
    const parentRect = parentVertexBounds(cell);
    let rect: Rect;
    if (!geo) {
      rect = { x: parentRect?.x ?? 0, y: parentRect?.y ?? 0, width: 0, height: 0 };
    } else if (geo.relative && parentRect) {
      // Géométrie relative (ex. port) : x, y sont des fractions de la taille du parent.
      rect = {
        x: parentRect.x + geo.x * parentRect.width + (geo.offset?.x ?? 0),
        y: parentRect.y + geo.y * parentRect.height + (geo.offset?.y ?? 0),
        width: geo.width,
        height: geo.height,
      };
    } else {
      rect = { x: (parentRect?.x ?? 0) + geo.x, y: (parentRect?.y ?? 0) + geo.y, width: geo.width, height: geo.height };
    }
    boundsCache.set(cell.id, rect);
    return rect;
  };

  /** Emprise du parent si c'est un vertex (groupe, conteneur), sinon undefined (calque : origine). */
  const parentVertexBounds = (cell: RawCell): Rect | undefined => {
    if (!cell.parent) return undefined;
    const parent = byId.get(cell.parent);
    if (!parent) {
      warn(cell.id, `Parent introuvable : ${cell.parent}`);
      return undefined;
    }
    if (!parent.vertex) return undefined;
    if (visiting.has(parent.id)) {
      warn(cell.id, 'Cycle dans la hiérarchie des parents');
      return undefined;
    }
    visiting.add(cell.id);
    const rect = absoluteBounds(parent);
    visiting.delete(cell.id);
    return rect;
  };

  const labelOf = (cell: RawCell, style: Record<string, string>): string => {
    let label = cell.label;
    if (cell.placeholders || style.placeholders === '1') label = resolvePlaceholders(label, cell.attributes);
    return style.html === '1' ? htmlToText(label) : label;
  };
  /** Mise en forme partielle d'un label HTML (gras sur un mot, taille d'une ligne…), sinon undefined. */
  const richOf = (cell: RawCell, style: Record<string, string>) => {
    if (style.html !== '1' || !/<|&/.test(cell.label)) return undefined;
    let label = cell.label;
    if (cell.placeholders || style.placeholders === '1') label = resolvePlaceholders(label, cell.attributes);
    const lines = parseRichHtml(label);
    return isRich(lines) ? lines : undefined;
  };

  const linkOf = (cell: RawCell) => {
    const link = parseLink(cell.link);
    if (cell.link && !link && !cell.link.startsWith('data:action/'))
      warn(cell.id, `Lien non pris en charge : ${cell.link}`);
    return link;
  };

  const shapes: ShapeModel[] = [];
  const edges: EdgeModel[] = [];
  const edgeById = new Map<string, EdgeModel>();
  const pendingEdgeLabels: Array<{ cell: RawCell; edgeId: string }> = [];

  for (const cell of cells) {
    if (rootIds.has(cell.id) || isLayer(cell)) continue;
    if (byId.get(cell.id) !== cell) continue; // doublon déjà signalé

    const parsed = parseStyle(cell.styleString);
    const style = parsed.values;
    const parent = cell.parent ? byId.get(cell.parent) : undefined;
    const parentId = parent?.vertex ? parent.id : undefined;

    if (cell.vertex && parent?.edge) {
      pendingEdgeLabels.push({ cell, edgeId: parent.id });
      continue;
    }

    const base = {
      id: cell.id,
      label: labelOf(cell, style),
      rich: richOf(cell, style),
      style,
      link: linkOf(cell),
      parentId,
      layerId: layerOf(cell),
      visible: cell.visible,
      z: cell.order,
      attributes: cell.attributes,
      raw: { styleString: cell.styleString },
    };

    if (cell.edge) {
      const origin = parentVertexBounds(cell) ?? { x: 0, y: 0 };
      const shift = (p: Point): Point => ({ x: p.x + origin.x, y: p.y + origin.y });
      const geo = cell.geometry;
      const edge: EdgeModel = {
        ...base,
        sourceId: cell.source,
        targetId: cell.target,
        sourcePoint: geo?.sourcePoint && shift(geo.sourcePoint),
        targetPoint: geo?.targetPoint && shift(geo.targetPoint),
        points: (geo?.points ?? []).map(shift),
        labelPlacement: edgeLabelPlacement(geo),
        labels: [],
      };
      for (const [key, ref] of [
        ['source', cell.source],
        ['target', cell.target],
      ] as const) {
        if (ref && !byId.has(ref)) warn(cell.id, `Extrémité ${key} introuvable : ${ref}`);
      }
      edges.push(stripUndefined(edge));
      edgeById.set(edge.id, edge);
    } else if (cell.vertex) {
      // `spatial.kind` impose la forme dessinée ici (le style draw.io reste intact) ; sinon, devinée du style.
      const kind = spatialValue(base, SPATIAL.kind)?.trim() || resolveShapeKind(parsed);
      shapes.push(stripUndefined({ ...base, kind, bounds: absoluteBounds(cell) }));
    }
    // Ni vertex ni edge, hors calque : cellule technique sans rendu, ignorée.
  }

  for (const { cell, edgeId } of pendingEdgeLabels) {
    const edge = edgeById.get(edgeId);
    if (!edge) continue;
    const style = parseStyle(cell.styleString).values;
    const label: EdgeLabelModel = {
      id: cell.id,
      label: labelOf(cell, style),
      rich: richOf(cell, style),
      placement: edgeLabelPlacement(cell.geometry),
      style,
    };
    edge.labels.push(label);
  }

  return { id, name, layers, shapes, edges, bounds: computeBounds(shapes, edges) };
}

/** Pour une arête et ses labels enfants, la géométrie relative encode x = position, y = distance. */
function edgeLabelPlacement(geo: RawGeometry | undefined): EdgeLabelPlacement {
  return {
    position: geo?.relative ? geo.x : 0,
    distance: geo?.relative ? geo.y : 0,
    offset: geo?.offset ?? { x: 0, y: 0 },
  };
}

function checkPageLinks(pages: PageModel[], warnings: ParseWarning[]): void {
  const pageIds = new Set(pages.map((p) => p.id));
  for (const page of pages) {
    for (const element of [...page.shapes, ...page.edges]) {
      if (element.link?.type === 'page' && !pageIds.has(element.link.pageId)) {
        warnings.push({
          pageId: page.id,
          cellId: element.id,
          message: `Lien vers une page absente : ${element.link.pageId}`,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Utilitaires XML

function num(el: Element, name: string): number {
  const value = parseFloat(el.getAttribute(name) ?? '');
  return Number.isFinite(value) ? value : 0;
}

/** Retire les clés à `undefined` pour garder un modèle propre (et des égalités de test simples). */
function stripUndefined<T extends object>(obj: T): T {
  for (const key of Object.keys(obj) as Array<keyof T>) if (obj[key] === undefined) delete obj[key];
  return obj;
}
