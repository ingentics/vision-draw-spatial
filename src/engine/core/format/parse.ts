import type { Element } from '@xmldom/xmldom';
import type {
  DocumentModel,
  EdgeLabelModel,
  EdgeLabelPlacement,
  EdgeModel,
  PageModel,
  ParseWarning,
  Point,
  Rect,
  ShapeModel,
} from '../model/types';
import { computeBounds } from '../model/bounds';
import { SPATIAL, SPATIAL_PREFIX, spatialValue } from '../spatial';
import { resolvePlaceholders } from './labelText';
import { htmlToText, isRich, parseRichHtml } from './richText';
import { parseLink } from './link';
import { parseStyle, resolveShapeKind } from './style';
import { type DrawioTree, type PageTree, readDrawioTree } from './xmlTree';
import { CellIndex } from './cellIndex';
import type { RawCell, RawGeometry } from './cellIndex';
import { styleFlag } from '../model/styleValues';

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

/** Modèle d'une seule page de l'arbre, sans ses avertissements (ex. formes qu'on vient d'y coller). */
export function pageFromTree(page: PageTree): PageModel {
  return parsePage(page, []);
}

// ---------------------------------------------------------------------------
// Pages

function parsePage(page: PageTree, warnings: ParseWarning[]): PageModel {
  if (page.encoding === 'unreadable') warnings.push({ pageId: page.id, message: `Page illisible : ${page.error}` });
  if (!page.model) return emptyPage(page);
  return parseGraphModel(page, warnings);
}

function emptyPage({ id, name, diagram }: PageTree): PageModel {
  const bounds = { x: 0, y: 0, width: 0, height: 0 };
  return { id, name, layers: [], shapes: [], edges: [], attributes: pageAttributes(diagram), bounds };
}

/** Attributs spatiaux de la page (`spatial.…` de `<diagram>`) : mode de la page et ses données. */
function pageAttributes(diagram: Element | undefined): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (let i = 0; i < (diagram?.attributes.length ?? 0); i++) {
    const attr = diagram!.attributes.item(i);
    if (attr?.name.startsWith(SPATIAL_PREFIX)) attributes[attr.name] = attr.value;
  }
  return attributes;
}

// ---------------------------------------------------------------------------
// Construction du modèle d'une page

function parseGraphModel(page: PageTree, warnings: ParseWarning[]): PageModel {
  const index = new CellIndex(page, warnings);
  const shapes: ShapeModel[] = [];
  const edges: EdgeModel[] = [];
  const edgeById = new Map<string, EdgeModel>();
  const pendingEdgeLabels: Array<{ cell: RawCell; edgeId: string }> = [];

  for (const cell of index.cells) {
    if (index.isRoot(cell) || index.isLayer(cell)) continue;
    if (index.byId.get(cell.id) !== cell) continue; // doublon déjà signalé

    const parsed = parseStyle(cell.styleString);
    const parent = cell.parent ? index.byId.get(cell.parent) : undefined;
    if (cell.vertex && parent?.edge) {
      pendingEdgeLabels.push({ cell, edgeId: parent.id });
      continue;
    }

    const base = elementBase(cell, parsed.values, parent?.vertex ? parent.id : undefined, index);
    if (cell.edge) {
      const edge = readEdge(cell, base, index);
      edges.push(stripUndefined(edge));
      edgeById.set(edge.id, edge);
    } else if (cell.vertex) {
      // `spatial.kind` impose la forme dessinée ici (le style draw.io reste intact) ; sinon, devinée du style.
      const kind = spatialValue(base, SPATIAL.kind)?.trim() || resolveShapeKind(parsed);
      shapes.push(stripUndefined({ ...base, kind, bounds: index.absoluteBounds(cell) }));
    }
    // Ni vertex ni edge, hors calque : cellule technique sans rendu, ignorée.
  }

  for (const { cell, edgeId } of pendingEdgeLabels) edgeById.get(edgeId)?.labels.push(edgeLabelOf(cell));

  const attributes = pageAttributes(page.diagram);
  return {
    id: page.id,
    name: page.name,
    layers: index.layers,
    shapes,
    edges,
    attributes,
    bounds: computeBounds(shapes, edges),
  };
}

/**
 * Forme qu'un style créerait à `bounds`, sans rien écrire (sujet 481 : forme de la palette qu'on glisse au-dessus de la
 * page, pour les places proposées par le mode) : sans texte, hors calque, d'id `id`.
 */
export function shapeFromStyle(id: string, styleString: string, bounds: Rect): ShapeModel {
  const parsed = parseStyle(styleString);
  const base = { id, label: '', style: parsed.values, layerId: '', visible: true, z: 0, attributes: {} };
  const kind = spatialValue(base, SPATIAL.kind)?.trim() || resolveShapeKind(parsed);
  return { ...base, raw: { styleString }, kind, bounds };
}

/** Champs communs à une forme et à une arête. */
function elementBase(cell: RawCell, style: Record<string, string>, parentId: string | undefined, index: CellIndex) {
  return {
    id: cell.id,
    label: labelOf(cell, style),
    rich: richOf(cell, style),
    style,
    link: linkOf(cell, index),
    parentId,
    layerId: index.layerOf(cell),
    visible: cell.visible,
    z: cell.order,
    attributes: cell.attributes,
    raw: { styleString: cell.styleString },
  };
}

/** Arête : points ramenés en coordonnées de page (relatifs au parent vertex), extrémités introuvables signalées. */
function readEdge(cell: RawCell, base: ReturnType<typeof elementBase>, index: CellIndex): EdgeModel {
  const origin = index.parentVertexBounds(cell) ?? { x: 0, y: 0 };
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
    if (ref && !index.byId.has(ref)) index.warn(cell.id, `Extrémité ${key} introuvable : ${ref}`);
  }
  return edge;
}

/** Label enfant d'une arête (vertex dont le parent est l'arête). */
function edgeLabelOf(cell: RawCell): EdgeLabelModel {
  const style = parseStyle(cell.styleString).values;
  return {
    id: cell.id,
    label: labelOf(cell, style),
    rich: richOf(cell, style),
    placement: edgeLabelPlacement(cell.geometry),
    style,
  };
}

function labelOf(cell: RawCell, style: Record<string, string>): string {
  let label = cell.label;
  if (cell.placeholders || styleFlag(style, 'placeholders')) label = resolvePlaceholders(label, cell.attributes);
  return styleFlag(style, 'html') ? htmlToText(label) : label;
}

/** Mise en forme partielle d'un label HTML (gras sur un mot, taille d'une ligne…), sinon undefined. */
function richOf(cell: RawCell, style: Record<string, string>) {
  if (!styleFlag(style, 'html') || !/<|&/.test(cell.label)) return undefined;
  let label = cell.label;
  if (cell.placeholders || styleFlag(style, 'placeholders')) label = resolvePlaceholders(label, cell.attributes);
  const lines = parseRichHtml(label);
  return isRich(lines) ? lines : undefined;
}

function linkOf(cell: RawCell, index: CellIndex) {
  const link = parseLink(cell.link);
  if (cell.link && !link && !cell.link.startsWith('data:action/'))
    index.warn(cell.id, `Lien non pris en charge : ${cell.link}`);
  return link;
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

/** Retire les clés à `undefined` pour garder un modèle propre (et des égalités de test simples). */
function stripUndefined<T extends object>(obj: T): T {
  for (const key of Object.keys(obj) as Array<keyof T>) if (obj[key] === undefined) delete obj[key];
  return obj;
}
