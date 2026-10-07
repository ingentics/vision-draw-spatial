import { isHexColor } from '../model/styleValues';

/**
 * Réglages globaux déclarés par un plugin, mode ou effet (tickets 145, 283 ; commun depuis le sujet 287) : affichés dans
 * sa sous-page des paramètres, valeurs dans `settings.modes[id][key]` ou `settings.effects[id][key]`, bornées et
 * complétées par `default` par le registre du plugin.
 */
export type PluginSetting = {
  key: string;
  label: string;
  /** Aide au survol. */
  title?: string;
  /** Aide affichée sous le réglage. */
  hint?: string;
  /** Groupe dans la sous-page du plugin (titre affiché avant son premier réglage). */
  group?: string;
  /** Aide affichée sous le titre du groupe (sur le premier réglage du groupe). */
  groupHint?: string;
} & (
  | {
      type: 'number';
      min: number;
      max: number;
      step: number;
      default: number;
      /** Affichage : `px`, `ms`, ou `%` (fraction de 0 à 1 affichée en pourcentage). */
      unit?: 'px' | 'ms' | '%';
      /** Libellé de la valeur 0 (ex. « sans »). */
      zero?: string;
    }
  | { type: 'toggle'; default: boolean }
  | { type: 'color'; default: string }
  /** Choix dans une liste (sujet 306, ex. moteur de rendu d'un export). */
  | { type: 'choice'; default: string; options: ReadonlyArray<{ value: string; label: string }> }
  | {
      /** Adresse http(s), sans barre finale (sujet 306, ex. serveur local). */
      type: 'url';
      default: string;
      /** Modifiable seulement quand le réglage `key` du même plugin vaut `value` (ex. rendu par le serveur local). */
      when?: { key: string; value: string };
    }
);

/** Valeur d'un réglage de plugin. */
export type PluginSettingValue = number | boolean | string;

/** Valeurs des réglages d'un plugin, par clé (bornées, défaut pour les absentes ; nombre, booléen ou #rrggbb). */
export type PluginValues = Record<string, PluginSettingValue>;

/** Réglages enregistrés des plugins d'une sorte : `[id][clé]`, seulement les valeurs changées. */
export type PluginSettings = Record<string, Record<string, PluginSettingValue>>;

/** Valeur enregistrée d'un réglage, si elle a le bon type (nombre ramené dans ses bornes) ; sinon undefined. */
export function readPluginSetting(setting: PluginSetting, value: unknown): PluginSettingValue | undefined {
  switch (setting.type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? Math.min(setting.max, Math.max(setting.min, value))
        : undefined;
    case 'toggle':
      return typeof value === 'boolean' ? value : undefined;
    case 'color':
      return typeof value === 'string' && isHexColor(value) ? value : undefined;
    case 'choice':
      return typeof value === 'string' && setting.options.some((option) => option.value === value) ? value : undefined;
    case 'url': {
      if (typeof value !== 'string') return undefined;
      const url = value.trim().replace(/\/+$/, '');
      return /^https?:\/\/\S+$/i.test(url) ? url : undefined;
    }
  }
}

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
    values[setting.key] = readPluginSetting(setting, stored?.[setting.key]) ?? setting.default;
  return values;
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
