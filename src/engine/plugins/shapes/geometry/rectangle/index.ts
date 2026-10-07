import { boxOutline } from '../../../../core/plugins';
import type { ShapeDefinition, ShapeModel } from '../../../../core/plugins';
import { box } from '../../generic/box';

/** Contour : les bornes, aux coins arrondis si `rounded=1` (`arcSize`). */
function outline(shape: ShapeModel) {
  return boxOutline(shape.bounds, shape.style);
}

/** Rectangle : boîte du contour (bloc en iso, repli à plat sans fond). */
export const definition: ShapeDefinition = {
  id: 'rectangle',
  ...box(outline),
  // Toute la boîte se clique, coins arrondis compris.
  contains: () => true,
  properties: [{ type: 'toggle', key: 'rounded', label: 'Coins arrondis', section: 'border' }],
  palette: {
    name: 'Rectangle',
    category: 'geometry',
    order: 10,
    keywords: ['rect', 'carré', 'boîte', 'square', 'box'],
    style: 'rounded=0;whiteSpace=wrap;html=1;',
    value: '',
    width: 120,
    height: 60,
    icon: '<rect x="4" y="6" width="32" height="16"/>',
  },
};
