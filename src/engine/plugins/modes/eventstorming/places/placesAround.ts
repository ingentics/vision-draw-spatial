import { center, inflate, overlapLength, rectContains, rectSpan, rectsOverlap, SIDES } from '../../../../core/plugins';
import type { ModeDragPlaces, PageModel, Rect, ShapeModel, Side } from '../../../../core/plugins';
import { CONTACT_TOLERANCE, overlapping } from '../contacts/contacts';
import { COMMAND, otherStickies, stickyType } from '../kinds';
import type { StickyType } from '../kinds';
import { STICKY_RULES } from '../stickyRules';

/**
 * Cases où poser le post-it glissé (sujet 481) : collées à un côté d'un post-it voisin, selon la grammaire de
 * `stickyRules.ts` (celle de la lecture du mur, sujet 520), et l'échange avec le post-it sous son centre. Le moteur
 * les montre et y pose le post-it.
 */

/** Portée du voisinage : les post-it à moins d'une taille de post-it (160, celle de la palette) proposent des cases. */
const NEIGHBOR_REACH = 160;

/** Côtés du post-it `neighbor` où un post-it de type `dragged` peut se coller. */
export function sidesFor(dragged: StickyType, neighbor: StickyType): Side[] {
  const mine = STICKY_RULES[dragged.key];
  const theirs = STICKY_RULES[neighbor.key];
  if (mine.anywhere || theirs.anywhere) return [...SIDES];
  if (mine.glued?.[neighbor.key] || theirs.glued?.[dragged.key]) return [...SIDES];
  const sides = new Set<Side>();
  if (theirs.right?.[dragged.key] || theirs.through?.includes(dragged.key)) sides.add('e');
  if (mine.right?.[neighbor.key] || mine.through?.includes(neighbor.key)) sides.add('w');
  if (dragged === neighbor && mine.stacks) {
    sides.add('n');
    sides.add('s');
  }
  return SIDES.filter((side) => sides.has(side));
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
 * Case d'un post-it `astride` (une Constraint) à cheval sur une Command et le post-it collé à sa droite (sujet 486) : collée au-dessus des
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
    const next = STICKY_RULES[type.key].astride && neighborType === COMMAND && rightNeighbor(neighbor.bounds, others);
    if (next) add(astride(neighbor.bounds, next.bounds, bounds.width, bounds.height));
  }
  const middle = center(bounds);
  const swapWith = others.find((other) => rectContains(other.bounds, middle))?.id;
  return { places: [...places.values()], ...(swapWith && { swapWith }) };
}
