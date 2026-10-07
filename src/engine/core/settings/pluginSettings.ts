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
  /** Ancienne clé de la section `shapes` des paramètres (avant le ticket 283), reprise une fois si elle a changé. */
  legacy?: string;
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
      return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
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
