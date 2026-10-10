import { center, inflate, rectContains, rectsOverlap } from '../../../../core/plugins';
import type { ModeDragPlaces, PageModel, Rect, ShapeModel, Side } from '../../../../core/plugins';
import { overlapping } from '../contacts/contacts';
import { ACTOR, COMMAND, CONSTRAINT, EVENT, HOTSPOT, POLICY, QUERY, stickyType, SYSTEM } from '../kinds';
import type { StickyType } from '../kinds';
import { STICKY } from '../shapes/common/stickyLayout';

/**
 * Cases où poser le post-it glissé (sujet 481) : collées à un côté d'un post-it voisin, selon la grammaire de l'event
 * storming, et l'échange avec le post-it sous son centre. Le moteur les montre et y pose le post-it.
 */

/** Grammaire, flux de gauche à droite : [A, B] = A collé à gauche de B. Chaque règle vaut dans les deux sens. */
const BESIDE: ReadonlyArray<readonly [StickyType, StickyType]> = [
  [ACTOR, COMMAND],
  [COMMAND, EVENT],
  [EVENT, EVENT],
  [COMMAND, CONSTRAINT],
  [CONSTRAINT, EVENT],
  [COMMAND, SYSTEM],
  [SYSTEM, EVENT],
  [POLICY, COMMAND],
  [EVENT, QUERY],
  [QUERY, ACTOR],
];

/** [A, B] = B collé sous A. */
const BELOW: ReadonlyArray<readonly [StickyType, StickyType]> = [[EVENT, POLICY]];

const has = (rules: typeof BESIDE, a: StickyType, b: StickyType) => rules.some(([x, y]) => x === a && y === b);

/** Côtés du post-it `neighbor` où un post-it de type `dragged` peut se coller ; tous autour d'un Hotspot. */
export function sidesFor(dragged: StickyType, neighbor: StickyType): Side[] {
  if (dragged === HOTSPOT || neighbor === HOTSPOT) return ['n', 'e', 's', 'w'];
  const sides: Side[] = [];
  if (has(BELOW, dragged, neighbor)) sides.push('n');
  if (has(BESIDE, neighbor, dragged)) sides.push('e');
  if (has(BELOW, neighbor, dragged)) sides.push('s');
  if (has(BESIDE, dragged, neighbor)) sides.push('w');
  return sides;
}

/** Case de taille `width` × `height` collée au côté `side` de `rect`, alignée sur lui (haut, ou gauche). */
function placeBeside(rect: Rect, side: Side, width: number, height: number): Rect {
  if (side === 'n') return { x: rect.x, y: rect.y - height, width, height };
  if (side === 's') return { x: rect.x, y: rect.y + rect.height, width, height };
  if (side === 'w') return { x: rect.x - width, y: rect.y, width, height };
  return { x: rect.x + rect.width, y: rect.y, width, height };
}

/**
 * Cases du post-it `shape` glissé, à sa place courante `bounds` : autour des post-it voisins (à moins d'une taille de
 * post-it), libres (sans chevaucher un autre post-it), chacune une fois ; et le post-it sous son centre, pour l'échange.
 */
export function dragPlaces(page: PageModel, shape: ShapeModel, bounds: Rect): ModeDragPlaces | undefined {
  const type = stickyType(shape);
  if (!type) return undefined;
  const others = page.shapes.filter((other) => other.id !== shape.id && stickyType(other));
  const places = new Map<string, Rect>();
  const near = inflate(bounds, STICKY.size);
  for (const neighbor of others) {
    if (!rectsOverlap(near, neighbor.bounds)) continue;
    for (const side of sidesFor(type, stickyType(neighbor)!)) {
      const place = placeBeside(neighbor.bounds, side, bounds.width, bounds.height);
      if (others.some((other) => overlapping(place, other.bounds))) continue;
      places.set(`${place.x},${place.y}`, place);
    }
  }
  const middle = center(bounds);
  const swapWith = others.find((other) => rectContains(other.bounds, middle))?.id;
  return { places: [...places.values()], ...(swapWith && { swapWith }) };
}
