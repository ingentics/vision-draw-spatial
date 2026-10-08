import type { ModeKey, ModeTarget, PageModel, ShapeModel } from '../../../../core/plugins';
import { shapeTarget } from '../../../../core/plugins';
import { fitRegion, isRegion, regionOf } from './regionLayout';

/**
 * Touche d'une région du mode RDD (sujets 182, 184) ; sa couleur se choisit dans la section Style du panneau (sujet 345).
 */

/**
 * Région visée par « f » (sujet 374) : la région sélectionnée, sinon celle qui contient la forme sélectionnée (table,
 * champ d'une table) ; aucune hors région, la touche garde alors son effet global.
 */
const regionTarget = (page: PageModel, target: ModeTarget): ShapeModel | undefined => {
  const shape = shapeTarget(target);
  if (!shape) return undefined;
  return isRegion(shape) ? shape : regionOf(page, shape);
};

/** « f » : région ajustée à son contenu (sujets 184, 374) ; hors région, la touche garde son effet. */
export const FIT_REGION_KEY: ModeKey = {
  label: 'Ajuster la région',
  applies: (page, target) => regionTarget(page, target) !== undefined,
  run: (edit, target) => {
    const region = regionTarget(edit.page, target);
    if (region) fitRegion(edit, region);
  },
};
