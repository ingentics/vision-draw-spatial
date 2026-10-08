import type { ShapeDefinition } from '../../../../core/plugins';
import { definition as text } from '../text';

/**
 * Flèche libre (sujet 327) : élément de la palette seulement. Elle crée une arête sans forme attachée (la palette
 * « Général » de draw.io en propose une), qui n'est pas une forme : la condition ne reconnaît jamais de sommet.
 */
export const definition: ShapeDefinition = {
  ...text,
  id: 'arrow',
  kinds: [],
  matches: () => false,
  palette: {
    name: 'Flèche',
    category: 'general',
    order: 110,
    keywords: ['flèche', 'fleche', 'arrow', 'connecteur', 'connector', 'ligne', 'line'],
    style: 'endArrow=classic;',
    value: '',
    width: 100,
    height: 0,
    edge: true,
    icon: '<path d="M6 14H28"/><path d="M27 9L34 14L27 19z" fill="currentColor"/>',
  },
};
