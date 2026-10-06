import type { ShapeDefinition } from '../../../types';
import { definition as text } from '../text';

/** Taille et couleur du texte d'un titre : un texte qui les porte est reconnu comme un titre. */
const TITLE_FONT_SIZE = '64';
const TITLE_FONT_COLOR = '#DEDEDE';

/**
 * Titre (ticket 176) : la forme Texte (même rendu, même style `text` dans le fichier), en 64 pt gris clair, avec son
 * élément de palette.
 */
export const definition: ShapeDefinition = {
  ...text,
  id: 'title',
  kinds: ['text'],
  matches: (shape) =>
    shape.style.fontSize === TITLE_FONT_SIZE && shape.style.fontColor?.toUpperCase() === TITLE_FONT_COLOR,
  palette: {
    name: 'Titre',
    category: 'general',
    order: 101,
    keywords: ['titre', 'title', 'heading', 'texte'],
    style: `text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=${TITLE_FONT_SIZE};fontColor=${TITLE_FONT_COLOR};`,
    value: 'Titre',
    width: 240,
    height: 80,
    icon: '<text x="20" y="21" text-anchor="middle" style="font-size:20px;font-weight:700">T</text>',
  },
};
