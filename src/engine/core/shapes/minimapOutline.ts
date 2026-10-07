import type { Point } from '../model/types';
import type { ReadonlyShapeModel as ShapeModel } from '../model/readonly';
import { rectPath } from '../render/geometry/paths';
import type { MinimapMapping, MinimapPainter } from './types';

const DEFAULT_FILL = '#ffffff';
/** Contour par défaut (paramètre `minimap.outlineColor`). */
const OUTLINE_STROKE = '#9aa0a6';

/**
 * Repli mini-carte : le contour de la forme (ou ses bornes), rempli de sa couleur de fond,
 * avec un trait fin gris.
 */
export function outlinePainter(definition: { outline?: (shape: ShapeModel) => Point[] | undefined }): MinimapPainter {
  return (context, shape, map) => {
    const outline = definition.outline?.(shape) ?? rectPath(shape.bounds);
    paintPolygon(context, outline, map, shape);
  };
}

function paintPolygon(
  context: CanvasRenderingContext2D,
  outline: Point[],
  map: MinimapMapping,
  shape: ShapeModel,
): void {
  if (outline.length < 2) return;
  context.beginPath();
  outline.forEach((p, i) => {
    const m = map.toMinimap(p);
    if (i === 0) context.moveTo(m.x, m.y);
    else context.lineTo(m.x, m.y);
  });
  context.closePath();
  const fill = shape.style.fillColor;
  if (fill !== 'none') {
    // Une couleur invalide est ignorée par le canvas : on part du blanc par défaut.
    context.fillStyle = DEFAULT_FILL;
    if (fill && fill !== 'default') context.fillStyle = fill;
    context.fill();
  }
  context.lineWidth = 0.75;
  context.strokeStyle = map.colors?.outline ?? OUTLINE_STROKE;
  context.stroke();
}
