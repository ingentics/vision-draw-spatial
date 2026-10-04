import type { ShapeModel } from '../../model/types';
import { flatBox } from '../../render/flat/box';
import { cornerRadius, rectPath, roundedRectPath } from '../../render/geometry/paths';
import { isoBlock } from '../../render/iso/block';
import type { ShapeDefinition } from '../types';

function outline(shape: ShapeModel) {
  return shape.style.rounded === '1'
    ? roundedRectPath(shape.bounds, cornerRadius(shape.style, shape.bounds))
    : rectPath(shape.bounds);
}

/** Rectangle, arrondi ou non (`rounded=1`, `arcSize`). */
export const definition: ShapeDefinition = {
  kind: 'rectangle',
  outline,
  flat: flatBox(outline),
  // En iso : un bloc en volume (repli à plat sans fond).
  iso: isoBlock(outline),
  // Toute la boîte se clique, coins arrondis compris.
  contains: () => true,
  properties: [{ type: 'toggle', key: 'rounded', label: 'Coins arrondis', section: 'border' }],
  templates: [
    {
      id: 'rectangle',
      name: 'Rectangle',
      category: 'general',
      order: 10,
      keywords: ['rect', 'carré', 'boîte', 'square', 'box'],
      style: 'rounded=0;whiteSpace=wrap;html=1;',
      value: '',
      width: 120,
      height: 60,
      icon: '<rect x="4" y="6" width="32" height="16"/>',
    },
    {
      id: 'rounded',
      name: 'Rectangle arrondi',
      category: 'general',
      order: 20,
      keywords: ['rect', 'arrondi', 'rounded', 'boîte', 'box'],
      style: 'rounded=1;whiteSpace=wrap;html=1;',
      value: '',
      width: 120,
      height: 60,
      icon: '<rect x="4" y="6" width="32" height="16" rx="4"/>',
    },
  ],
  templateOf: (style) => (style.rounded === '1' ? 'rounded' : 'rectangle'),
};
