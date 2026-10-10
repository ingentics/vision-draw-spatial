import permanentMarker from '@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff?url';
import robotoBoldItalic from '@fontsource/roboto/files/roboto-latin-700-italic.woff?url';
import robotoBold from '@fontsource/roboto/files/roboto-latin-700-normal.woff?url';
import robotoItalic from '@fontsource/roboto/files/roboto-latin-400-italic.woff?url';
import robotoRegular from '@fontsource/roboto/files/roboto-latin-400-normal.woff?url';
import robotoMonoBold from '@fontsource/roboto-mono/files/roboto-mono-latin-700-normal.woff?url';
import robotoMono from '@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff?url';
import type { FontSet } from '../engine';
import { isMonospace } from '../engine';

/**
 * Polices des textes du plan, remises au moteur (rendu SDF et mesure) : Roboto et Roboto Mono, plus les polices
 * nommées choisies par `fontFamily` (sujet 476 : feutre des labels des post-it Event storming). L'éditeur en place
 * prend les mêmes, chargées en CSS (`main.tsx`).
 */
export const FONTS: FontSet = {
  regular: robotoRegular,
  bold: robotoBold,
  italic: robotoItalic,
  boldItalic: robotoBoldItalic,
  mono: robotoMono,
  monoBold: robotoMonoBold,
  families: { 'Permanent Marker': permanentMarker },
};

/** Police CSS de l'éditeur en place pour le `fontFamily` d'un style : celle du rendu. */
export function editorFontFamily(family: string | undefined): string {
  if (isMonospace(family)) return "'Roboto Mono', monospace";
  if (family && FONTS.families?.[family]) return `'${family}', 'Roboto', sans-serif`;
  return "'Roboto', sans-serif";
}
