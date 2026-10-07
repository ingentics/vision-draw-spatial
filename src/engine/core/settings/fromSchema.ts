import { isField } from './fields';
import type { NumberField, SettingLimits } from './fields';
import { SECTION_FIXES, SETTINGS_SCHEMA } from './schema';
import type { Settings, SettingsPatch } from './types';

/** Ce qui découle du schéma des réglages : valeurs par défaut, bornes des réglages numériques, fusion. */

type Node = Readonly<Record<string, unknown>>;

const asRecord = (value: unknown): Node => (typeof value === 'object' && value !== null ? (value as Node) : {});

function defaultsOf(spec: unknown): unknown {
  if (isField(spec)) return spec.default;
  return Object.fromEntries(Object.entries(asRecord(spec)).map(([key, child]) => [key, defaultsOf(child)]));
}

/** Un nœud non réglage (objet, valeur reçue d'un mauvais type) se lit champ par champ, comme un objet vide. */
function mergeNode(spec: unknown, base: unknown, patch: unknown): unknown {
  if (isField(spec)) return spec.read(patch, base);
  const previous = asRecord(base);
  const changes = asRecord(patch);
  return Object.fromEntries(
    Object.entries(asRecord(spec)).map(([key, child]) => [key, mergeNode(child, previous[key], changes[key])]),
  );
}

/** Clés des réglages numériques, chemin pointé depuis la section (`view.isoDepth`, `panels.left.width`). */
type LimitKeys<S, Prefix extends string = ''> = {
  [K in keyof S & string]: S[K] extends NumberField
    ? `${Prefix}${K}`
    : S[K] extends { readonly read: unknown }
      ? never
      : LimitKeys<S[K], `${Prefix}${K}.`>;
}[keyof S & string];

function limitsOf(spec: unknown, prefix: string, into: Record<string, SettingLimits>): Record<string, SettingLimits> {
  if (isField(spec)) {
    const { limits } = spec as Partial<NumberField>;
    if (limits) into[prefix] = limits;
    return into;
  }
  for (const [key, child] of Object.entries(asRecord(spec))) limitsOf(child, prefix ? `${prefix}.${key}` : key, into);
  return into;
}

/** Valeurs par défaut des paramètres (SPEC §13). */
export const DEFAULT_SETTINGS = defaultsOf(SETTINGS_SCHEMA) as Settings;

/** Bornes des réglages numériques (et pas des curseurs de l'UI). */
export const SETTINGS_LIMITS = limitsOf(SETTINGS_SCHEMA, '', {}) as Readonly<
  Record<LimitKeys<typeof SETTINGS_SCHEMA>, SettingLimits>
>;

/**
 * Fusionne une modification dans des paramètres. Les valeurs invalides (mauvais type, hors liste)
 * sont ignorées, les nombres sont ramenés dans leurs bornes : un stockage abîmé ou ancien ne peut
 * pas casser l'application.
 */
export function mergeSettings(base: Settings, patch: SettingsPatch | undefined): Settings {
  const merged = mergeNode(SETTINGS_SCHEMA, base, patch) as Record<keyof Settings, unknown>;
  for (const [section, fix] of Object.entries(SECTION_FIXES) as [keyof Settings, (value: unknown) => unknown][]) {
    merged[section] = fix(merged[section]);
  }
  return merged as Settings;
}
