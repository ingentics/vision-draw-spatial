import type { Point } from '../../model/types';

/** Mêmes points, dans le même ordre. */
export function samePoints(a: Point[], b: Point[]): boolean {
  return a.length === b.length && a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y);
}

/** Style draw.io avec une clé ajoutée à la fin si elle n'y est pas déjà (`clé=valeur;`). */
export function withStyleValue(style: string, key: string, value: string): string {
  if (style.split(';').some((token) => token.split('=')[0]!.trim() === key && token.includes('='))) return style;
  const base = style.trim() === '' || style.trimEnd().endsWith(';') ? style : `${style};`;
  return `${base}${key}=${value};`;
}
