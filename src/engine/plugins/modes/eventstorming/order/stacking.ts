import type { ModeEdit } from '../../../../core/plugins';
import { contacts } from '../contacts/contacts';

/**
 * Ordre de dessin des post-it posés (sujets 484, 502) : un post-it dont le bas touche le haut d'un autre passe derrière
 * lui, pour que son ombre, qui déborde en bas, passe sous le post-it du dessous au lieu de le recouvrir. Vaut pour
 * toute colonne touchée par un post-it posé (post-it reliés de proche en proche par un contact haut / bas) ; les
 * autres gardent leur ordre.
 */
export function stackPlaced(edit: ModeEdit, shapeIds: readonly string[]): void {
  // Paires d'une colonne : `upper` collé au-dessus de `lower`.
  const pairs: Array<{ upper: string; lower: string }> = [];
  for (const { a, b } of contacts(edit.page).contacts) {
    if (a.side === 's') pairs.push({ upper: a.shapeId, lower: b.shapeId });
    else if (b.side === 's') pairs.push({ upper: b.shapeId, lower: a.shapeId });
  }
  const column = columnOf(pairs, shapeIds);
  const touched = pairs.filter((pair) => column.has(pair.upper));
  // Du bas vers le haut : un post-it n'est mis derrière celui du dessous qu'une fois celui-ci rangé derrière les siens.
  // `placeBehind` ne fait que reculer un post-it, si bien que ce qui est déjà rangé le reste.
  const height = heights(touched);
  touched.sort((p, q) => height(p.lower) - height(q.lower));
  for (const { upper, lower } of touched) edit.placeBehind(upper, lower);
}

/** Post-it reliés à `shapeIds` par des contacts haut / bas, de proche en proche (eux compris s'ils en ont). */
function columnOf(pairs: ReadonlyArray<{ upper: string; lower: string }>, shapeIds: readonly string[]): Set<string> {
  const column = new Set<string>();
  const queue = [...shapeIds];
  for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
    if (column.has(id)) continue;
    column.add(id);
    for (const { upper, lower } of pairs) {
      if (upper === id) queue.push(lower);
      else if (lower === id) queue.push(upper);
    }
  }
  return column;
}

/** Rang d'un post-it depuis le bas de sa colonne : 0 sans post-it collé dessous, sinon 1 de plus que le plus haut. */
function heights(pairs: ReadonlyArray<{ upper: string; lower: string }>): (id: string) => number {
  const known = new Map<string, number>();
  const height = (id: string): number => {
    const cached = known.get(id);
    if (cached !== undefined) return cached;
    const below = pairs.filter((pair) => pair.upper === id).map((pair) => height(pair.lower) + 1);
    const value = Math.max(0, ...below);
    known.set(id, value);
    return value;
  };
  return height;
}
