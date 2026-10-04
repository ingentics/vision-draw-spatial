import type { ShapeModel } from '../../model/types';
import { halfEllipseTo } from '../../render/geometry/curves';
import { tagProperty } from '../utils/building';
import type { CylinderDrawing } from '../utils/cylinder';
import { cylinderFlat } from '../utils/cylinder';
import { isoQueue, QUEUE_TAG } from '../utils/queue';
import type { ShapeDefinition } from '../types';

/** `shape=mxgraph.flowchart.direct_data` : cylindre couché, bouts arrondis sur 9/98 de la largeur (draw.io), bout droit visible. */
function directDataDrawing(shape: ShapeModel): CylinderDrawing {
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

const directDataFlat = cylinderFlat(directDataDrawing);

/** Queue : « Direct Data » des organigrammes draw.io ; en iso, demi-cylindre couché dans le sens de la largeur. */
export const definition: ShapeDefinition = {
  kind: 'mxgraph.flowchart.direct_data',
  outline: (shape) => directDataDrawing(shape).silhouette,
  flat: directDataFlat,
  iso: isoQueue(directDataFlat, () => false),
  properties: [tagProperty(QUEUE_TAG)],
};
