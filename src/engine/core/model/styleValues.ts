import type { RichLine } from './types';
import type { DeepReadonly } from './readonly';

/**
 * Lecture typée des valeurs de style du modèle neutre (chaînes de draw.io), avec les défauts de draw.io. Sans
 * Three.js : utilisable par le format, l'édition et le cœur ; les couleurs sont dans `render/styleColors.ts`.
 */

export function styleNumber(style: Record<string, string>, key: string, fallback: number): number {
  const value = parseFloat(style[key] ?? '');
  return Number.isFinite(value) ? value : fallback;
}

export function styleFlag(style: Record<string, string>, key: string): boolean {
  return style[key] === '1';
}

/**
 * Ajustement du texte à sa forme (`fitText`) : `shrink` (« Ajuster », `1`, sujet 57) réduit le texte qui dépasse ;
 * `fill` (« Remplir », post-it, sujet 411) l'agrandit aussi pour remplir la forme ; `off` sinon.
 */
export function fitTextMode(style: Record<string, string>): 'off' | 'shrink' | 'fill' {
  if (style.fitText === 'fill') return 'fill';
  return styleFlag(style, 'fitText') ? 'shrink' : 'off';
}

/** Opacité 0–1 à partir des clés draw.io en pourcentage (`opacity`, puis la clé spécifique). */
export function styleOpacity(style: Record<string, string>, key: string): number {
  return (styleNumber(style, 'opacity', 100) / 100) * (styleNumber(style, key, 100) / 100);
}

/** Bits de `fontStyle` : 1 gras, 2 italique, 4 souligné, 8 barré. */
export function fontStyleBits(style: Record<string, string>): {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
} {
  const bits = styleNumber(style, 'fontStyle', 0);
  return { bold: (bits & 1) !== 0, italic: (bits & 2) !== 0, underline: (bits & 4) !== 0, strike: (bits & 8) !== 0 };
}

/** Valeur de `fontStyle` (bits 1 gras, 2 italique, 4 souligné, 8 barré), l'inverse de `fontStyleBits` (sujet 307). */
export function fontStyleValue(marks: {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}): number {
  return (marks.bold ? 1 : 0) | (marks.italic ? 2 : 0) | (marks.underline ? 4 : 0) | (marks.strike ? 8 : 0);
}

/**
 * Format du texte d'un style (gras, italique, souligné, barré, police) et texte riche éventuel, pour
 * une `TextSpec`.
 */
export function textFormat(style: Record<string, string>, rich: DeepReadonly<RichLine[]> | undefined) {
  const bits = fontStyleBits(style);
  return {
    bold: bits.bold,
    italic: bits.italic,
    underline: bits.underline,
    strike: bits.strike,
    fontFamily: style.fontFamily,
    rich,
  };
}

/** `#rgb` ou `#rrggbb`, casse libre : la seule regex hexadécimale du moteur (`isHexColor`). */
const HEX_COLOR = /^#([0-9a-f]{3}){1,2}$/i;

/**
 * Couleur `#rrggbb` (casse libre), la forme qu'écrivent draw.io et l'appli (sujet 291) ; avec `short`, la forme courte
 * `#rgb` aussi (fond d'un label, couleur d'un texte riche HTML).
 */
export function isHexColor(value: string | undefined, short = false): value is string {
  return value !== undefined && HEX_COLOR.test(value) && (short || value.length === 7);
}
