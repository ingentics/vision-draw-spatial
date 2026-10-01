import { DOMParser, type Element } from '@xmldom/xmldom';
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
import { decodeDiagram } from './decode';
import { htmlToText, resolvePlaceholders } from './label';
import { parseLink } from './link';
import { parseStyle, resolveShapeKind } from './style';

/**
 * Lecture d'un fichier draw.io (SPEC §7) : `<mxfile>` → `DocumentModel`.
 *
 * Seul un XML illisible fait échouer le parsing. Tout le reste (page corrompue, parent
 * manquant, lien vers une page absente…) produit un avertissement dans `warnings`.
 */

export class DrawioParseError extends Error {
  override name = 'DrawioParseError';
}

export function parseDrawio(xml: string): DocumentModel {
  const root = parseXml(xml).documentElement;
  if (!root) throw new DrawioParseError('Document XML vide');

  const warnings: ParseWarning[] = [];
  let pages: PageModel[];

  if (root.tagName === 'mxfile') {
    pages = childElements(root, 'diagram').map((diagram, index) => parseDiagram(diagram, index, warnings));
  } else if (root.tagName === 'mxGraphModel') {
    // Ancien format : un unique modèle, sans enveloppe <mxfile>.
    pages = [parseGraphModel(root, 'page-1', 'Page-1', warnings)];
  } else {
    throw new DrawioParseError(`Racine inattendue <${root.tagName}> : ce n'est pas un fichier draw.io`);
  }

  checkPageLinks(pages, warnings);
  return { pages, warnings };
}

// ---------------------------------------------------------------------------
// Pages

function parseDiagram(diagram: Element, index: number, warnings: ParseWarning[]): PageModel {
  const id = diagram.getAttribute('id') || `page-${index + 1}`;
  const name = diagram.getAttribute('name') || `Page-${index + 1}`;

  const inline = childElements(diagram, 'mxGraphModel')[0];
  if (inline) return parseGraphModel(inline, id, name, warnings);

  const text = diagram.textContent ?? '';
  if (!text.trim()) return emptyPage(id, name);

  try {
    const decoded = decodeDiagram(text);
    const model = parseXml(decoded).documentElement;
    if (!model || model.tagName !== 'mxGraphModel') throw new Error('<mxGraphModel> attendu');
    return parseGraphModel(model, id, name, warnings);
  } catch (error) {
    warnings.push({ pageId: id, message: `Page illisible : ${errorMessage(error)}` });
    return emptyPage(id, name);
  }
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

function readCells(rootEl: Element, pageId: string, warnings: ParseWarning[]): RawCell[] {
  const cells: RawCell[] = [];
  let anonymous = 0;

  for (const el of childElements(rootEl)) {
    let cellEl: Element | undefined;
    let wrapper: Element | undefined;

    if (el.tagName === 'mxCell') {
      cellEl = el;
    } else if (el.tagName === 'UserObject' || el.tagName === 'object') {
      wrapper = el;
      cellEl = childElements(el, 'mxCell')[0];
    } else {
      continue;
    }

    let id = (wrapper ?? cellEl)?.getAttribute('id') || '';
    if (!id) {
      id = `__anonymous-${++anonymous}`;
      warnings.push({ pageId, message: `Cellule sans id (<${el.tagName}>), identifiant généré : ${id}` });
    }

    const attributes: Record<string, string> = {};
    if (wrapper) {
      for (let i = 0; i < wrapper.attributes.length; i++) {
        const attr = wrapper.attributes.item(i);
        if (attr && !OBJECT_RESERVED_ATTRIBUTES.has(attr.name)) attributes[attr.name] = attr.value;
      }
    }

    const geometryEl = cellEl ? childElements(cellEl, 'mxGeometry')[0] : undefined;

    cells.push({
      id,
      parent: cellEl?.getAttribute('parent') || undefined,
      label: (wrapper ? wrapper.getAttribute('label') : cellEl?.getAttribute('value')) ?? '',
      styleString: cellEl?.getAttribute('style') ?? '',
      vertex: cellEl?.getAttribute('vertex') === '1',
      edge: cellEl?.getAttribute('edge') === '1',
      source: cellEl?.getAttribute('source') || undefined,
      target: cellEl?.getAttribute('target') || undefined,
      visible: cellEl?.getAttribute('visible') !== '0',
      geometry: geometryEl ? readGeometry(geometryEl) : undefined,
      attributes,
      link: wrapper?.getAttribute('link') ?? undefined,
      placeholders: wrapper?.getAttribute('placeholders') === '1',
      order: cells.length,
    });
  }
  return cells;
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

function parseGraphModel(model: Element, id: string, name: string, warnings: ParseWarning[]): PageModel {
  const rootEl = childElements(model, 'root')[0];
  if (!rootEl) return emptyPage(id, name);

  const cells = readCells(rootEl, id, warnings);
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
      shapes.push(stripUndefined({ ...base, kind: resolveShapeKind(parsed), bounds: absoluteBounds(cell) }));
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

function computeBounds(shapes: ShapeModel[], edges: EdgeModel[]): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  for (const { bounds: b } of shapes) {
    add(b.x, b.y);
    add(b.x + b.width, b.y + b.height);
  }
  for (const edge of edges) {
    for (const p of [edge.sourcePoint, edge.targetPoint, ...edge.points]) if (p) add(p.x, p.y);
  }
  if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
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

function parseXml(xml: string) {
  try {
    return new DOMParser({ onError: onXmlError }).parseFromString(xml, 'text/xml');
  } catch (error) {
    throw new DrawioParseError(`XML invalide (${xmlErrorDetail(error)})`, { cause: error });
  }
}

function onXmlError(level: 'warning' | 'error' | 'fatalError', message: string): void {
  if (level !== 'warning') throw new Error(message);
}

function childElements(parent: Element, tagName?: string): Element[] {
  const result: Element[] = [];
  for (let node = parent.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === 1 && (!tagName || (node as Element).tagName === tagName)) result.push(node as Element);
  }
  return result;
}

function num(el: Element, name: string): number {
  const value = parseFloat(el.getAttribute(name) ?? '');
  return Number.isFinite(value) ? value : 0;
}

/** Détail lisible d'une erreur xmldom (« Reporting fatalError "x" caused Error: x » → « x »). */
function xmlErrorDetail(error: unknown): string {
  const message = errorMessage(error);
  const detail = /caused (?:\w*Error: )?(.+)$/s.exec(message)?.[1] ?? message;
  return detail.replace(/\s+/g, ' ').trim();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Retire les clés à `undefined` pour garder un modèle propre (et des égalités de test simples). */
function stripUndefined<T extends object>(obj: T): T {
  for (const key of Object.keys(obj) as Array<keyof T>) if (obj[key] === undefined) delete obj[key];
  return obj;
}
