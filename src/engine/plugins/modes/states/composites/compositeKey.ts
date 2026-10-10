import type { ModeKey, ModeTarget, PageModel, ShapeModel } from '../../../../core/plugins';
import { shapeTarget } from '../../../../core/plugins';
import { isComposite } from '../kinds';
import { compositeOf, fitComposite } from './compositeLayout';

/**
 * Ensemble visé par « f » (sujet 435, comme la région RDD) : l'ensemble sélectionné, sinon celui qui contient la forme
 * sélectionnée ; aucun hors ensemble, la touche garde alors son effet global.
 */
const compositeTarget = (page: PageModel, target: ModeTarget): ShapeModel | undefined => {
  const shape = shapeTarget(target);
  if (!shape) return undefined;
  return isComposite(shape) ? shape : compositeOf(page, shape);
};

/** « f » : ensemble ajusté à son contenu ; hors ensemble, la touche garde son effet. */
export const FIT_COMPOSITE_KEY: ModeKey = {
  label: 'Ajuster l’ensemble',
  applies: (page, target) => compositeTarget(page, target) !== undefined,
  run: (edit, target) => {
    const composite = compositeTarget(edit.page, target);
    if (composite) fitComposite(edit, composite);
  },
};
