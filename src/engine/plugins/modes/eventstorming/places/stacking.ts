import type { ModeEdit } from '../../../../core/plugins';
import { contacts } from '../contacts/contacts';

/**
 * Ordre de dessin des post-it posés (sujet 484) : un post-it dont le bas touche le haut d'un autre passe juste derrière
 * lui, pour que son ombre, qui déborde en bas, passe sous le post-it du dessous au lieu de le recouvrir. Vaut pour les
 * post-it posés `shapeIds` et ceux collés au-dessus d'eux.
 */
export function stackPlaced(edit: ModeEdit, shapeIds: readonly string[]): void {
  const placed = new Set(shapeIds);
  for (const { a, b } of contacts(edit.page).contacts) {
    // `a` au-dessus de `b` (son bas contre le haut de `b`), ou l'inverse ; seuls les contacts d'un post-it posé.
    const [upper, lower] = a.side === 's' ? [a, b] : b.side === 's' ? [b, a] : [];
    if (upper && lower && (placed.has(upper.shapeId) || placed.has(lower.shapeId)))
      edit.placeBehind(upper.shapeId, lower.shapeId);
  }
}
