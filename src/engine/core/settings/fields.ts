import type { StylePreset, TextPreset } from '../edit/stylePresets';
import { isHexColor } from '../model/styleValues';
import { clamp } from '../model/numbers';

/**
 * Briques du schéma des réglages : chaque réglage déclare sa valeur par défaut et sa lecture. Une valeur invalide
 * (mauvais type, hors liste) laisse la valeur précédente : un stockage abîmé ou ancien ne peut pas casser l'appli.
 */

/** Bornes d'un réglage numérique (et pas des curseurs de l'UI, qui les reprennent souvent). */
export interface SettingLimits {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** Un réglage : sa valeur par défaut, et la lecture d'une valeur reçue (`previous` si elle est invalide). */
export interface Field<T> {
  readonly default: T;
  readonly read: (value: unknown, previous: T) => T;
}

/** Réglage numérique : ses bornes alimentent aussi `SETTINGS_LIMITS`. */
export interface NumberField extends Field<number> {
  readonly limits: SettingLimits;
}

/**
 * Schéma d'une valeur de type `T` : un réglage, ou pour un objet (hors liste) un schéma par champ. `-?` : le
 * compilateur exige une entrée pour chaque champ de l'interface.
 */
export type Spec<T> =
  | Field<T>
  | ([T] extends [readonly unknown[]]
      ? never
      : [T] extends [object]
        ? { readonly [K in keyof T]-?: Spec<T[K]> }
        : never);

export function isField(spec: unknown): spec is Field<unknown> {
  return typeof (spec as Partial<Field<unknown>>).read === 'function';
}

/** Nombre fini ramené dans ses bornes, arrondi si `integer`. */
export function number(fallback: number, limits: SettingLimits, options: { integer?: boolean } = {}): NumberField {
  return {
    default: fallback,
    limits,
    read: (value, previous) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) return previous;
      // Bornes déclarées par le schéma du tronc, toutes dans l'ordre (`min ≤ max`).
      const clamped = clamp(value, limits.min, limits.max);
      return options.integer ? Math.round(clamped) : clamped;
    },
  };
}

export const flag = (fallback: boolean): Field<boolean> => ({
  default: fallback,
  read: (value, previous) => (typeof value === 'boolean' ? value : previous),
});

export const oneOf = <T extends string>(list: readonly T[], fallback: T): Field<T> => ({
  default: fallback,
  read: (value, previous) => (list.includes(value as T) ? (value as T) : previous),
});

/** Code de touche (raccourci) : chaîne non vide, ou vide si le raccourci n'a pas de touche par défaut (sujet 365). */
export const code = (fallback: string): Field<string> => ({
  default: fallback,
  read: (value, previous) => (typeof value === 'string' && (value.length > 0 || fallback === '') ? value : previous),
});

/** Couleur #rrggbb, écrite en minuscules. */
export const color = (fallback: string): Field<string> => ({
  default: fallback,
  read: (value, previous) => (typeof value === 'string' && isHexColor(value) ? value.toLowerCase() : previous),
});

/** Réglage à lecture propre (liste, dictionnaire) : `read` reçoit la valeur reçue et la précédente. */
export const custom = <T>(fallback: T, read: (value: unknown, previous: T) => T): Field<T> => ({
  default: fallback,
  read,
});

/** Liste de styles : remplacée en entier si chaque entrée est valide (nom, couleurs #rrggbb). */
export function presets(value: unknown, previous: StylePreset[]): StylePreset[] {
  if (!Array.isArray(value)) return previous;
  const list = value.map((entry: Partial<StylePreset> | null) =>
    entry &&
    typeof entry.name === 'string' &&
    isHexColor(entry.fillColor) &&
    isHexColor(entry.strokeColor) &&
    (entry.fontColor === undefined || isHexColor(entry.fontColor))
      ? {
          name: entry.name,
          fillColor: entry.fillColor.toLowerCase(),
          strokeColor: entry.strokeColor.toLowerCase(),
          ...(entry.fontColor ? { fontColor: entry.fontColor.toLowerCase() } : {}),
        }
      : undefined,
  );
  return list.every((entry) => entry !== undefined) ? (list as StylePreset[]) : previous;
}

/** Styles de texte : remplacés en entier si chaque entrée est valide (nom, taille, couleur, police). */
export function textPresets(value: unknown, previous: TextPreset[]): TextPreset[] {
  if (!Array.isArray(value)) return previous;
  const list = value.map((entry: Partial<TextPreset> | null) => {
    if (!entry || typeof entry.name !== 'string') return undefined;
    const size = entry.fontSize;
    if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return undefined;
    if (entry.fontColor !== undefined && !isHexColor(entry.fontColor)) return undefined;
    if (entry.fontFamily !== undefined && typeof entry.fontFamily !== 'string') return undefined;
    return {
      name: entry.name,
      fontSize: size,
      ...(entry.fontColor ? { fontColor: entry.fontColor.toLowerCase() } : {}),
      ...(entry.fontFamily ? { fontFamily: entry.fontFamily } : {}),
    };
  });
  return list.every((entry) => entry !== undefined) ? (list as TextPreset[]) : previous;
}
