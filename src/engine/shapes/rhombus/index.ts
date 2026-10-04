import type { ShapeModel } from '../../model/types';
import { flatBox } from '../../render/flat/box';
import { orientedPath } from '../../render/geometry/orient';
import { isoBlock } from '../../render/iso/block';
import type { ShapeDefinition } from '../types';

/** Losange inscrit dans les bornes, sommets au milieu des côtés (mxRhombus), orienté comme draw.io. */
function outline(shape: ShapeModel) {
  return orientedPath(shape.bounds, shape.style, (w, h) => [
    { x: w / 2, y: 0 },
    { x: w, y: h / 2 },
    { x: w / 2, y: h },
    { x: 0, y: h / 2 },
  ]);
}

/** Losange (`rhombus`, « Diamond » de la palette draw.io) : prisme du contour en iso / 3D. */
export const definition: ShapeDefinition = {
  kind: 'rhombus',
  outline,
  flat: flatBox(outline),
  iso: isoBlock(outline),
  templates: [
    {
      id: 'rhombus',
      name: 'Losange',
      category: 'general',
      order: 90,
      keywords: ['rhombus', 'diamond', 'décision', 'condition'],
      style: 'rhombus;whiteSpace=wrap;html=1;',
      value: '',
      width: 80,
      height: 80,
      icon: '<path d="M20 3L32 14L20 25L8 14z"/>',
    },
  ],
};
