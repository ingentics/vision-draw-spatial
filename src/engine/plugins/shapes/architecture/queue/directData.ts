import { halfEllipseTo } from '../../../../core/plugins';
import type { ShapeModel } from '../../../../core/plugins';
import type { CylinderDrawing } from '../../generic/cylinder';

/** Nom draw.io du « Direct Data » des organigrammes, l'autre façon d'écrire une queue. */
export const DIRECT_DATA = 'mxgraph.flowchart.direct_data';

/** `shape=mxgraph.flowchart.direct_data` : cylindre couché, bouts arrondis sur 9/98 de la largeur (draw.io), bout droit visible. */
export function directDataDrawing(shape: ShapeModel): CylinderDrawing {
  const { x, y, width: w, height: h } = shape.bounds;
  const rx = Math.min((w * 9) / 98, w / 2);
  const topRight = { x: x + w - rx, y };
  const bottomLeft = { x: x + rx, y: y + h };
  return {
    silhouette: [
      { x: x + rx, y },
      topRight,
      ...halfEllipseTo(topRight, { x: x + w - rx, y: y + h }, rx, 1),
      bottomLeft,
      ...halfEllipseTo(bottomLeft, { x: x + rx, y }, rx, -1),
    ],
    // Bord intérieur du bout droit : la face d'entrée de la file.
    lips: [[topRight, ...halfEllipseTo(topRight, { x: x + w - rx, y: y + h }, rx, -1)]],
    label: shape.bounds,
  };
}
