import { center, inflate, overlapLength, rectContains, rectSpan, rectsOverlap } from '../../../../core/plugins';
import type { ModeDragPlaces, PageModel, Rect, ShapeModel, Side } from '../../../../core/plugins';
import { CONTACT_TOLERANCE, overlapping } from '../contacts/contacts';
import { ACTOR, COMMAND, CONSTRAINT, EVENT, HOTSPOT, otherStickies, POLICY, QUERY, stickyType, SYSTEM } from '../kinds';
import type { StickyType } from '../kinds';

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

/** [A, B] = B collé sous A. Les Constraint s'empilent (sujet 486). */
const BELOW: ReadonlyArray<readonly [StickyType, StickyType]> = [
  [EVENT, POLICY],
  [CONSTRAINT, CONSTRAINT],
];

/** Portée du voisinage : les post-it à moins d'une taille de post-it (160, celle de la palette) proposent des cases. */
const NEIGHBOR_REACH = 160;

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

/** Post-it collé à droite de `rect` (bords à moins de la tolérance, recouvrement vertical), parmi `others`. */
function rightNeighbor(rect: Rect, others: readonly ShapeModel[]): ShapeModel | undefined {
  const edge = rect.x + rect.width;
  return others.find(
    ({ bounds }) =>
      Math.abs(bounds.x - edge) <= CONTACT_TOLERANCE &&
      overlapLength(...rectSpan(rect, 'y'), ...rectSpan(bounds, 'y')) > CONTACT_TOLERANCE,
  );
}

/**
 * Case d'une Constraint à cheval sur une Command et le post-it collé à sa droite (sujet 486) : collée au-dessus des
 * deux, centrée sur leur jointure.
 */
function astride(command: Rect, next: Rect, width: number, height: number): Rect {
  return { x: command.x + command.width - width / 2, y: Math.min(command.y, next.y) - height, width, height };
}

/**
 * Cases du post-it `shape` glissé, à sa place courante `bounds` : autour des post-it voisins (à moins d'une taille de
 * post-it), libres (sans chevaucher un autre post-it), chacune une fois, dont celle d'une Constraint à cheval sur une
 * Command et son voisin ; et le post-it sous son centre, pour l'échange.
 */
export function dragPlaces(page: PageModel, shape: ShapeModel, bounds: Rect): ModeDragPlaces | undefined {
  const type = stickyType(shape);
  if (!type) return undefined;
  const others = otherStickies(page, shape);
  const places = new Map<string, Rect>();
  const near = inflate(bounds, NEIGHBOR_REACH);
  const add = (place: Rect) => {
    if (!others.some((other) => overlapping(place, other.bounds))) places.set(`${place.x},${place.y}`, place);
  };
  for (const neighbor of others) {
    if (!rectsOverlap(near, neighbor.bounds)) continue;
    const neighborType = stickyType(neighbor)!;
    for (const side of sidesFor(type, neighborType))
      add(placeBeside(neighbor.bounds, side, bounds.width, bounds.height));
    const next = type === CONSTRAINT && neighborType === COMMAND && rightNeighbor(neighbor.bounds, others);
    if (next) add(astride(neighbor.bounds, next.bounds, bounds.width, bounds.height));
  }
  const middle = center(bounds);
  const swapWith = others.find((other) => rectContains(other.bounds, middle))?.id;
  return { places: [...places.values()], ...(swapWith && { swapWith }) };
}
