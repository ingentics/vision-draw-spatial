import type { ModeKey, ModeProperty, ModeTarget } from '../../types';
import type { ShapeModel } from '../../../model/types';
import { shapeTarget } from '../editing/tableTargets';
import { REGION_COLORS, fitRegion, isRegion, setRegionColor } from './regionLayout';

/** Réglages et touche d'une région du mode RDD (sujets 182, 184, 233). */

/** Région du mode sélectionnée (sujet 182). */
const regionTarget = (target: ModeTarget): ShapeModel | undefined => {
  const shape = shapeTarget(target);
  return shape && isRegion(shape) ? shape : undefined;
};

/** Réglages d'une région (sujets 182, 233) : sa propre palette, bordure grise. */
export const REGION_PROPERTIES: ModeProperty[] = [
  {
    type: 'select',
    key: 'rdd.regionColor',
    label: 'Couleur',
    title: 'Couleur du fond de la région (fillColor)',
    options: () => REGION_COLORS.map((color) => ({ value: color, label: color, color })),
    value: (_page, target) => regionTarget(target)?.style.fillColor,
    write: (edit, target, value) => {
      const shape = regionTarget(target);
      if (shape) setRegionColor(edit, shape, value);
    },
    hidden: (_page, target) => !regionTarget(target),
  },
];

/** « f » : région ajustée à son contenu (sujet 184) ; sur un autre élément, la touche garde son effet. */
export const FIT_REGION_KEY: ModeKey = {
  label: 'Ajuster la région',
  applies: (_page, target) => regionTarget(target) !== undefined,
  run: (edit, target) => {
    const region = regionTarget(target);
    if (region) fitRegion(edit, region);
  },
};
