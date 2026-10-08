import type { ModeKey, ModeTarget, ShapeModel } from '../../../../core/plugins';
import { shapeTarget } from '../../../../core/plugins';
import { fitRegion, isRegion } from './regionLayout';

/**
 * Touche d'une région du mode RDD (sujets 182, 184) ; sa couleur se choisit dans la section Style du panneau (sujet 345).
 */

/** Région du mode sélectionnée (sujet 182). */
const regionTarget = (target: ModeTarget): ShapeModel | undefined => {
  const shape = shapeTarget(target);
  return shape && isRegion(shape) ? shape : undefined;
};

/** « f » : région ajustée à son contenu (sujet 184) ; sur un autre élément, la touche garde son effet. */
export const FIT_REGION_KEY: ModeKey = {
  label: 'Ajuster la région',
  applies: (_page, target) => regionTarget(target) !== undefined,
  run: (edit, target) => {
    const region = regionTarget(target);
    if (region) fitRegion(edit, region);
  },
};
