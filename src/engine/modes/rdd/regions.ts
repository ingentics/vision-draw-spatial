import type { PageModel, Rect, ShapeModel } from '../../model/types';
import { readableOn } from '../../render/styleValues';
import type { ModeEdit } from '../types';

/**
 * Régions du mode RDD (sujet 182) : rectangles posés derrière les tables, qui emportent leur contenu quand on les
 * déplace. Le contenu est calculé (coin haut-gauche dans la région), rien n'en est écrit dans le fichier.
 */

export const REGION_KIND = 'rdd-region';

/**
 * Fond d'une région : opaque (sujet 232) ; bordure grise (sujet 233) ; label : taille du texte,
 * sur un onglet au fond et à la bordure de la région (sujets 226, 227).
 */
export const REGION = {
  /** Marge de sécurité autour d'une forme qui dépasse de sa région, qui s'agrandit (sujet 183). */
  margin: 20,
  /** Bordure des régions, quelle que soit leur couleur (sujet 233). */
  stroke: '#969696',
  fontSize: 9,
  /**
   * Onglet du nom (sujets 227, 228) : hauteur, marge du texte (à gauche jusqu'au bord, à droite jusqu'au milieu du S),
   * largeur du S qui le termine.
   */
  tab: { height: 16, padding: 6, curve: 10 },
  width: 200,
  height: 80,
} as const;

export const isRegion = (shape: ShapeModel) => shape.kind === REGION_KIND;

/** Forme du mode RDD (table ou région) : elle peut être contenue dans une région. */
const isModeShape = (shape: ShapeModel) => shape.kind.startsWith('rdd-');

const area = (shape: ShapeModel) => shape.bounds.width * shape.bounds.height;

/** Le coin haut-gauche de `shape` est-il dans `region` (bords compris) ? */
function cornerIn(shape: ShapeModel, region: ShapeModel): boolean {
  const { x, y } = shape.bounds;
  const r = region.bounds;
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

/**
 * Une région peut-elle contenir `region`, dont le coin haut-gauche est dedans (sujet 231) ? Oui, quelle que soit sa
 * taille, comme une table ; seul cas ambigu, deux coins au même point : la plus grande contient l'autre, à taille
 * égale celle de derrière (pas de cycle).
 */
function canContainRegion(parent: ShapeModel, region: ShapeModel): boolean {
  if (parent.bounds.x !== region.bounds.x || parent.bounds.y !== region.bounds.y) return true;
  return area(parent) > area(region) || (area(parent) === area(region) && parent.z < region.z);
}

/**
 * Région qui contient une forme du mode : la plus petite dont le coin haut-gauche de la forme est dedans, à taille
 * égale celle de devant (la plus imbriquée).
 */
export function regionOf(page: PageModel, shape: ShapeModel): ShapeModel | undefined {
  if (!isModeShape(shape)) return undefined;
  let owner: ShapeModel | undefined;
  for (const region of page.shapes) {
    if (!isRegion(region) || region.id === shape.id || !cornerIn(shape, region)) continue;
    if (isRegion(shape) && !canContainRegion(region, shape)) continue;
    if (!owner || area(region) < area(owner) || (area(region) === area(owner) && region.z > owner.z)) owner = region;
  }
  return owner;
}

/** Contenu d'une région : les formes qu'elle contient, et celles des régions qu'elle contient. */
export function regionContent(page: PageModel, region: ShapeModel): string[] {
  if (!isRegion(region)) return [];
  const owned = new Map<string, string[]>();
  for (const shape of page.shapes) {
    const owner = regionOf(page, shape);
    if (owner) owned.set(owner.id, [...(owned.get(owner.id) ?? []), shape.id]);
  }
  const content: string[] = [];
  const stack = [...(owned.get(region.id) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === region.id || content.includes(id)) continue;
    content.push(id);
    stack.push(...(owned.get(id) ?? []));
  }
  return content;
}

/** Couleurs proposées pour une région, dans l'ordre (sujet 233) : rose, lavande, bleu, vert, jaune, pêche. */
export const REGION_COLORS = ['#fdebef', '#eae4f1', '#e7f5fd', '#e7f3e7', '#fefce8', '#feefe3'] as const;

/** Couleur d'une région neuve. */
export const DEFAULT_REGION_COLOR = REGION_COLORS[0];

/**
 * Couleur du texte du nom d'une région de fond `color` : noir ou blanc, lisible sur ce fond posé à `opacity` (0–1) sur
 * du blanc (l'onglet a le fond de la région, sujet 227 ; opaque depuis le sujet 232, plus léger dans un fichier qui
 * porte un `fillOpacity`).
 */
export function regionTextColor(color: string, opacity = 1): string {
  const channel = (offset: number) =>
    Math.round(255 * (1 - opacity) + parseInt(color.slice(offset, offset + 2), 16) * opacity)
      .toString(16)
      .padStart(2, '0');
  return readableOn(`#${channel(1)}${channel(3)}${channel(5)}`);
}

/**
 * Label d'une région de fond `color` pour draw.io : cadre de la couleur de la bordure autour du nom (l'onglet n'y est
 * pas dessiné), texte lisible sur le fond.
 */
export function regionLabelStyle(color: string): string {
  return `labelBorderColor=${REGION.stroke};fontColor=${regionTextColor(color)};`;
}

/**
 * Couleur d'une région : fond opaque (`fillColor`), bordure grise (`strokeColor`) et cadre du nom (`labelBorderColor`,
 * `fontColor`), pour draw.io aussi.
 */
export function setRegionColor(edit: ModeEdit, shape: ShapeModel, color: string | undefined): void {
  if (!isRegion(shape) || !color) return;
  const stroke = REGION.stroke;
  edit.setElementStyle(shape.id, 'fillColor', color);
  // Fond opaque (sujet 232) : l'opacité des régions posées avant est retirée.
  edit.setElementStyle(shape.id, 'fillOpacity', undefined);
  edit.setElementStyle(shape.id, 'strokeColor', stroke);
  edit.setElementStyle(shape.id, 'labelBackgroundColor', undefined);
  edit.setElementStyle(shape.id, 'labelBorderColor', stroke);
  edit.setElementStyle(shape.id, 'fontColor', regionTextColor(color));
}

/**
 * Formes posées (déplacées ou ajoutées, sujet 183) : une forme du mode qui dépasse de la région qui la contient (coin
 * haut-gauche dedans) l'agrandit vers la droite et / ou le bas, pour la contenir avec la marge de sécurité ; la région
 * agrandie fait de même avec la sienne, de proche en proche. Une région ne rétrécit jamais ici.
 */
export function growRegions(edit: ModeEdit, shapeIds: string[]): void {
  const { page } = edit;
  /** Bornes des régions déjà agrandies par cette opération. */
  const grown = new Map<string, Rect>();
  const boundsOf = (shape: ShapeModel) => grown.get(shape.id) ?? shape.bounds;
  for (const id of shapeIds) {
    let shape = page.shapes.find((s) => s.id === id);
    const seen = new Set<string>();
    while (shape && !seen.has(shape.id)) {
      seen.add(shape.id);
      // L'appartenance se lit sur les bornes d'origine : agrandir vers la droite et le bas ne déplace pas un coin.
      const region = regionOf(page, shape);
      if (!region) break;
      const inner = boundsOf(shape);
      const outer = boundsOf(region);
      const width = Math.max(outer.width, inner.x + inner.width + REGION.margin - outer.x);
      const height = Math.max(outer.height, inner.y + inner.height + REGION.margin - outer.y);
      const fits = inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
      if (fits || (width === outer.width && height === outer.height)) break;
      const next = { ...outer, width, height };
      grown.set(region.id, next);
      edit.setShapeBounds(region.id, next);
      shape = region;
    }
  }
}

/** Profondeur d'une forme dans les régions : 0 hors de toute région, 1 dans une région, 2 dans une région d'une région… */
function depthOf(page: PageModel, shape: ShapeModel): number {
  let depth = 0;
  const seen = new Set<string>();
  for (let region = regionOf(page, shape); region && !seen.has(region.id); region = regionOf(page, region)) {
    seen.add(region.id);
    depth++;
  }
  return depth;
}

/**
 * Ordre de dessin des régions (sujet 230) : toutes au fond de la pile, les plus englobantes derrière, chaque région
 * devant celle qui la contient ; leur contenu est ainsi toujours devant elles. À égalité, l'ordre en place est gardé.
 */
export function orderRegions(edit: ModeEdit): void {
  const { page } = edit;
  const regions = page.shapes
    .filter(isRegion)
    .map((region) => ({ region, depth: depthOf(page, region) }))
    .sort((a, b) => a.depth - b.depth || a.region.z - b.region.z)
    .map(({ region }) => region.id);
  if (regions.length > 0) edit.sendToBack(regions);
}

/** Formes posées (sujets 183, 230) : régions agrandies pour les contenir, puis remises en ordre de dessin. */
export function placeInRegions(edit: ModeEdit, shapeIds: string[]): void {
  growRegions(edit, shapeIds);
  orderRegions(edit);
}

/**
 * Ajuste une région à son contenu (touche « f », sujet 184) : rectangle englobant des formes qu'elle contient, plus
 * la marge de sécurité de chaque côté (le nom est sur l'onglet, au-dessus) ; elle grandit ou rétrécit. Région vide :
 * rien ne change. L'ordre de dessin des régions est ensuite remis en place (sujet 230).
 */
export function fitRegion(edit: ModeEdit, region: ShapeModel): void {
  const { page } = edit;
  const content = regionContent(page, region)
    .map((id) => page.shapes.find((s) => s.id === id))
    .filter((shape): shape is ShapeModel => shape !== undefined);
  if (!isRegion(region) || content.length === 0) return;
  const left = Math.min(...content.map((s) => s.bounds.x)) - REGION.margin;
  const top = Math.min(...content.map((s) => s.bounds.y)) - REGION.margin;
  const right = Math.max(...content.map((s) => s.bounds.x + s.bounds.width)) + REGION.margin;
  const bottom = Math.max(...content.map((s) => s.bounds.y + s.bounds.height)) + REGION.margin;
  edit.setShapeBounds(region.id, { x: left, y: top, width: right - left, height: bottom - top });
  orderRegions(edit);
}
