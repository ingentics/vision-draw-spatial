import type { StylePreset, TextPreset } from '../edit/stylePresets';
import { SETTINGS_LIMITS } from './limits';

/** Validateurs des réglages : une valeur invalide (mauvais type, hors liste) laisse la valeur précédente. */

/** Nombre fini ramené dans ses bornes (`SETTINGS_LIMITS`), sinon la valeur précédente. */
export const num = (key: keyof typeof SETTINGS_LIMITS, value: unknown, fallback: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const { min, max } = SETTINGS_LIMITS[key];
  return Math.min(max, Math.max(min, value));
};
export const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
export const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
  list.includes(value as T) ? (value as T) : fallback;
export const code = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.length > 0 ? value : fallback;
export const color = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;

/** Liste de styles : remplacée en entier si chaque entrée est valide (nom, couleurs #rrggbb). */
export const presets = (value: unknown, fallback: StylePreset[]): StylePreset[] => {
  if (!Array.isArray(value)) return fallback;
  const valid = (c: unknown) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  const list = value.map((entry: Partial<StylePreset> | null) =>
    entry &&
    typeof entry.name === 'string' &&
    valid(entry.fillColor) &&
    valid(entry.strokeColor) &&
    (entry.fontColor === undefined || valid(entry.fontColor))
      ? {
          name: entry.name,
          fillColor: entry.fillColor!.toLowerCase(),
          strokeColor: entry.strokeColor!.toLowerCase(),
          ...(entry.fontColor ? { fontColor: entry.fontColor.toLowerCase() } : {}),
        }
      : undefined,
  );
  return list.every((entry) => entry !== undefined) ? (list as StylePreset[]) : fallback;
};
/** Styles de texte : remplacés en entier si chaque entrée est valide (nom, taille, couleur, police). */
export const textPresets = (value: unknown, fallback: TextPreset[]): TextPreset[] => {
  if (!Array.isArray(value)) return fallback;
  const list = value.map((entry: Partial<TextPreset> | null) => {
    if (!entry || typeof entry.name !== 'string') return undefined;
    const size = entry.fontSize;
    if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return undefined;
    if (
      entry.fontColor !== undefined &&
      !(typeof entry.fontColor === 'string' && /^#[0-9a-f]{6}$/i.test(entry.fontColor))
    )
      return undefined;
    if (entry.fontFamily !== undefined && typeof entry.fontFamily !== 'string') return undefined;
    return {
      name: entry.name,
      fontSize: size,
      ...(entry.fontColor ? { fontColor: entry.fontColor.toLowerCase() } : {}),
      ...(entry.fontFamily ? { fontFamily: entry.fontFamily } : {}),
    };
  });
  return list.every((entry) => entry !== undefined) ? (list as TextPreset[]) : fallback;
};

/** URL de serveur : http(s) seulement, espaces et barres finales retirés ; sinon la valeur précédente. */
export function serverUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const url = value.trim().replace(/\/+$/, '');
  return /^https?:\/\/\S+$/i.test(url) ? url : fallback;
}
