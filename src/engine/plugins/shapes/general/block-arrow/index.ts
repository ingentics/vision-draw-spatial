import type { ShapeDefinition } from '../../../../core/plugins';
import { definition as text } from '../text';

/**
 * Flèche pleine (« block arrow » de Miro, sujet 410) : élément de la palette seulement, comme la flèche libre (327).
 * Il crée une arête `shape=flexArrow`, toujours droite, dessinée en un polygone plein effilé de la couleur du trait.
 */
export const definition: ShapeDefinition = {
  ...text,
  id: 'block-arrow',
  kinds: [],
  matches: () => false,
  palette: {
    name: 'Flèche pleine',
    category: 'general',
    order: 112,
    keywords: ['flèche', 'fleche', 'pleine', 'block', 'arrow', 'grosse', 'épaisse', 'miro'],
    style: 'shape=flexArrow;strokeColor=#333333;',
    value: '',
    width: 100,
    height: 0,
    edge: true,
    icon: '<path d="M3.8 23.7L27.2 7.6L24.4 5.8L36 5L29.7 14.8L29.5 11.5L4.2 24.3z" fill="currentColor"/>',
  },
};
