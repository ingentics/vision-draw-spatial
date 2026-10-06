import type { PageModel, ShapeModel } from '../../model/types';
import type { ModeEdit } from '../types';

/**
 * Régions du mode RDD (sujet 182) : rectangles posés derrière les tables, qui emportent leur contenu quand on les
 * déplace. Le contenu est calculé (coin haut-gauche dans la région), rien n'en est écrit dans le fichier.
 */

export const REGION_KIND = 'rdd-region';

/** Fond d'une région : opacité (`fillOpacity`, en %) ; bordure : la couleur du fond assombrie. */
export const REGION = { fillOpacity: 10, strokeDarken: 0.6, width: 400, height: 260 } as const;

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
 * Région qui contient une forme du mode : la plus petite dont le coin haut-gauche de la forme est dedans ; une région
 * n'est contenue que dans une région plus grande qu'elle (deux régions de même taille ne se contiennent pas).
 */
export function regionOf(page: PageModel, shape: ShapeModel): ShapeModel | undefined {
  if (!isModeShape(shape)) return undefined;
  let owner: ShapeModel | undefined;
  for (const region of page.shapes) {
    if (!isRegion(region) || region.id === shape.id || !cornerIn(shape, region)) continue;
    if (isRegion(shape) && area(region) <= area(shape)) continue;
    if (!owner || area(region) < area(owner)) owner = region;
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

/** Bordure d'une région : sa couleur de fond (#rrggbb) assombrie, canal par canal. */
export function regionStroke(color: string): string {
  const channel = (offset: number) =>
    Math.floor(parseInt(color.slice(offset, offset + 2), 16) * REGION.strokeDarken)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/** Couleur d'une région : fond (`fillColor`) et bordure assortie (`strokeColor`), pour draw.io aussi. */
export function setRegionColor(edit: ModeEdit, shape: ShapeModel, color: string | undefined): void {
  if (!isRegion(shape) || !color) return;
  edit.setElementStyle(shape.id, 'fillColor', color);
  edit.setElementStyle(shape.id, 'strokeColor', regionStroke(color));
}
