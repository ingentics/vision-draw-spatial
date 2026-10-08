import type { Point } from '../model/types';
import type { ReadonlyShapeModel as ShapeModel } from '../model/readonly';
import { rectPath } from '../model/geometry';
import type { MinimapPainter } from './types';

const DEFAULT_FILL = '#ffffff';
/** Contour par défaut (paramètre `minimap.outlineColor`). */
const OUTLINE_STROKE = '#9aa0a6';

/**
 * Repli mini-carte : le contour de la forme (ou ses bornes), rempli de sa couleur de fond,
 * avec un trait fin gris.
 */
export function outlinePainter(definition: { outline?: (shape: ShapeModel) => Point[] | undefined }): MinimapPainter {
  return (brush, shape, map) => {
    const outline = definition.outline?.(shape) ?? rectPath(shape.bounds);
    const fill = shape.style.fillColor;
    brush.polygon(
      outline.map((p) => map.toMinimap(p)),
      {
        fill: fill === 'none' ? undefined : !fill || fill === 'default' ? DEFAULT_FILL : fill,
        stroke: map.colors?.outline ?? OUTLINE_STROKE,
      },
    );
  };
}
