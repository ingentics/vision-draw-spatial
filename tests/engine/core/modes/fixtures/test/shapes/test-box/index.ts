import type { ShapeDefinition } from '../../../../../../../../src/engine/core/shapes/types';
import { definition as rectangle } from '../../../../../../../../src/engine/plugins/shapes/geometry/rectangle';

/** Forme propre au mode de test (sujet 178) : un rectangle, id préfixé par celui du mode. */
export const definition: ShapeDefinition = {
  ...rectangle,
  id: 'test-box',
  palette: {
    name: 'Boîte de test',
    category: 'test',
    order: 1000,
    keywords: ['essai'],
    style: 'shape=test-box;whiteSpace=wrap;html=1;',
    value: '',
    width: 120,
    height: 60,
    icon: '<rect x="5" y="5" width="30" height="18"/>',
  },
};
