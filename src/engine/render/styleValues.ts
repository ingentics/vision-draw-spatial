import { Color } from 'three';

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

/** Bits de `fontStyle` : 1 gras, 2 italique, 4 souligné. */
export function fontStyleBits(style: Record<string, string>): { bold: boolean; italic: boolean; underline: boolean } {
  const bits = styleNumber(style, 'fontStyle', 0);
  return { bold: (bits & 1) !== 0, italic: (bits & 2) !== 0, underline: (bits & 4) !== 0 };
}
