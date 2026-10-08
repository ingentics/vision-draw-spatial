import { styleFlag } from '../../../../core/plugins';
import type { ShapeDefinition } from '../../../../core/plugins';
import { definition as left } from '../curly-bracket-left';

/** Accolade droite `}` : l'accolade gauche retournée (`flipH=1`), texte à droite. */
export const definition: ShapeDefinition = {
  ...left,
  id: 'curly-bracket-right',
  matches: (shape) => styleFlag(shape.style, 'flipH'),
  palette: {
    name: 'Accolade droite',
    category: 'general',
    order: 121,
    keywords: ['accolade', 'droite', 'curly', 'brace', 'bracket', 'right', 'crochet'],
    style:
      'shape=curlyBracket;whiteSpace=wrap;html=1;rounded=1;flipH=1;labelPosition=right;verticalLabelPosition=middle;align=left;verticalAlign=middle;',
    value: '',
    width: 20,
    height: 120,
    icon: '<path fill="none" d="M14 3C20 3 20 5 20 8V11C20 13 23 14 26 14C23 14 20 15 20 17V20C20 23 20 25 14 25"/>',
  },
};
