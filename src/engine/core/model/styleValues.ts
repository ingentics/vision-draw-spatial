import type { RichLine } from './types';

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

/**
 * Format du texte d'un style (gras, italique, souligné, barré, police) et texte riche éventuel, pour
 * une `TextSpec`.
 */
export function textFormat(style: Record<string, string>, rich: RichLine[] | undefined) {
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

/** Couleur `#rrggbb` (casse libre), la forme qu'écrivent draw.io et l'appli (sujet 291). */
export function isHexColor(value: string | undefined): value is string {
  return value !== undefined && /^#[0-9a-f]{6}$/i.test(value);
}
