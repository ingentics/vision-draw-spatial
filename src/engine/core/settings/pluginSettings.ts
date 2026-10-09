import { readFieldValue } from '../fields/fieldSchema';
import type { FieldOfType, FieldValue } from '../fields/fieldSchema';

/**
 * Réglages globaux déclarés par un plugin, mode ou effet (tickets 145, 283 ; commun depuis le sujet 287), ou par une
 * catégorie de formes (sujet 380) : champs du schéma commun (`Field`, sujet 391) affichés dans sa sous-page des
 * paramètres, valeurs dans `settings.modes[id][key]`, `settings.effects[id][key]` ou `settings.shapeCategories[id][key]`,
 * bornées et complétées par `default` par le registre du plugin.
 */
export type PluginSetting = {
  /** Aide affichée sous le réglage. */
  hint?: string;
  /** Groupe dans la sous-page du plugin (titre affiché avant son premier réglage). */
  group?: string;
  /** Aide affichée sous le titre du groupe (sur le premier réglage du groupe). */
  groupHint?: string;
  /**
   * Ancienne clé du réglage, chemin depuis la racine des paramètres enregistrés (ex. `view.isoDepth`, sujet 380) : sa
   * valeur est reprise tant que le réglage n'a pas la sienne (`legacyPluginSettings`), aucune préférence perdue. Lue
   * aujourd'hui pour les catégories de formes seulement (au chargement des paramètres, par l'appli).
   */
  legacy?: string;
} &
  /** Nombre borné, en curseur. */
  (
    | (FieldOfType<'number'> & { min: number; max: number; step: number; default: number })
    | (FieldOfType<'toggle'> & { default: boolean })
    | (FieldOfType<'color'> & { default: string })
    /** Choix dans une liste (sujet 306, ex. moteur de rendu d'un export). */
    | (FieldOfType<'choice'> & { default: string })
    | (FieldOfType<'url'> & {
        default: string;
        /** Modifiable seulement quand le réglage `key` du même plugin vaut `value` (ex. rendu par le serveur local). */
        when?: { key: string; value: string };
      })
  );

/** Valeur d'un réglage de plugin. */
export type PluginSettingValue = FieldValue;

/** Valeurs des réglages d'un plugin, par clé (bornées, défaut pour les absentes ; nombre, booléen ou #rrggbb). */
export type PluginValues = Record<string, PluginSettingValue>;

/** Réglages enregistrés des plugins d'une sorte : `[id][clé]`, seulement les valeurs changées. */
export type PluginSettings = Record<string, Record<string, PluginSettingValue>>;

/**
 * Valeurs des réglages d'un plugin : celles enregistrées (`stored`) bornées, le défaut pour les autres ; les clés
 * inconnues et les valeurs du mauvais type sont ignorées.
 */
export function pluginValues(
  settings: readonly PluginSetting[] | undefined,
  stored: Record<string, unknown> | undefined,
): PluginValues {
  const values: PluginValues = {};
  for (const setting of settings ?? [])
    values[setting.key] = readFieldValue(setting, stored?.[setting.key]) ?? setting.default;
  return values;
}

/**
 * Réglages repris de leurs anciennes clés (`legacy`) dans les paramètres enregistrés `stored`, par plugin (`[id][clé]`) :
 * seulement les valeurs valides qui diffèrent du défaut (un défaut n'est pas enregistré).
 */
export function legacyPluginSettings(
  owners: Iterable<{ id: string; settings?: readonly PluginSetting[] }>,
  stored: unknown,
): PluginSettings {
  const read = (path: string): unknown =>
    path
      .split('.')
      .reduce<unknown>(
        (value, key) => (value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined),
        stored,
      );
  const result: PluginSettings = {};
  for (const owner of owners) {
    for (const setting of owner.settings ?? []) {
      const value = setting.legacy ? readFieldValue(setting, read(setting.legacy)) : undefined;
      if (value !== undefined && value !== setting.default) (result[owner.id] ??= {})[setting.key] = value;
    }
  }
  return result;
}

/**
 * Valeur du réglage `key` du type attendu : le registre a déjà borné et complété les valeurs, une absence ou un autre
 * type est une erreur de clé du plugin (exception), pas une valeur à contourner.
 */
function typedValue<T extends PluginSettingValue>(values: PluginValues, key: string, type: string): T {
  const value = values[key];
  if (typeof value !== type) throw new Error(`réglage « ${key} » : ${type} attendu`);
  return value as T;
}

export const numberValue = (values: PluginValues, key: string): number => typedValue<number>(values, key, 'number');
export const stringValue = (values: PluginValues, key: string): string => typedValue<string>(values, key, 'string');
export const booleanValue = (values: PluginValues, key: string): boolean => typedValue<boolean>(values, key, 'boolean');
