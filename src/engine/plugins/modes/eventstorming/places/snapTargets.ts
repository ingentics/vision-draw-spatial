import type { ModeSnapTarget, PageModel, ShapeModel } from '../../../../core/plugins';
import { isSticky, otherStickies } from '../kinds';

/** Cibles de l'aimantation bord à bord (sujet 477) : un post-it se colle à tous les autres post-it. */
export function snapTargets(page: PageModel, shape: ShapeModel): ModeSnapTarget[] {
  return isSticky(shape) ? otherStickies(page, shape).map((other) => ({ id: other.id, rect: other.bounds })) : [];
}
