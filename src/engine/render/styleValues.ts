import { Color } from 'three';
import type { RichLine } from '../model/types';

/** Lecture typée des valeurs de style du modèle neutre, avec les défauts de draw.io. */

/** Couleur, ou `null` si le style vaut `none` (rien à dessiner). */
export function styleColor(style: Record<string, string>, key: string, fallback: string | null): Color | null {
  const raw = style[key]?.trim();
  if (raw === 'none') return null;
  const value = !raw || raw === 'default' ? fallback : raw;
  if (!value) return null;
  const color = new Color();
  try {
    color.setStyle(value);
  } catch {
    return fallback ? new Color(fallback) : null;
  }
  return color;
}

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

/** Couleur de fond de la page, utilisée quand un style vaut `default` pour un fond de label. */
export const PAGE_BACKGROUND = '#ffffff';

/** Fond par défaut du texte des flèches : halo de 1,5 px, flou de 1 px (paramètres `shapes.edgeLabel…`). */
export const DEFAULT_LABEL_BACKDROP = { kind: 'halo', haloWidth: 1.5, haloBlur: 1 } as const;

/** `labelBackgroundColor` : `default` = fond de la page ; défaut propre au type d'élément sinon. */
export function labelBackground(
  style: Record<string, string>,
  fallback: string | null,
  page = PAGE_BACKGROUND,
): Color | undefined {
  const raw = style.labelBackgroundColor?.trim();
  if (raw === 'default') return new Color(page);
  return styleColor(style, 'labelBackgroundColor', fallback) ?? undefined;
}
