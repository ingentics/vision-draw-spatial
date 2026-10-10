import { DEFAULT_SETTINGS, legacyShapeCategorySettings, mergeSettings } from '../engine';
import type { Settings, SettingsPatch } from '../engine';

/**
 * Paramètres persistés dans le navigateur (SPEC §13). Seuls les écarts aux défauts sont enregistrés (sujet 364) : un
 * défaut changé dans une version suivante s'applique à tout réglage que l'utilisateur n'a pas modifié.
 */

const KEY = 'drawio-spatial:settings';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? mergeSettings(DEFAULT_SETTINGS, withLegacy(JSON.parse(raw) as SettingsPatch)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settingsDiff(settings, DEFAULT_SETTINGS)));
  } catch {
    // Stockage indisponible : les paramètres valent pour la session seulement.
  }
}

/**
 * Paramètres enregistrés complétés des réglages des catégories de formes repris de leurs anciennes clés (sujet 380,
 * ex. `view.facadeTags`) : une valeur déjà enregistrée à la nouvelle place l'emporte. L'ancienne clé, hors du schéma,
 * disparaît au premier enregistrement.
 */
export function withLegacy(saved: SettingsPatch): SettingsPatch {
  const stored = withLegacyExporters(saved);
  const legacy = legacyShapeCategorySettings(stored);
  if (Object.keys(legacy).length === 0) return stored;
  const current = stored.shapeCategories ?? {};
  const shapeCategories = { ...current };
  for (const [id, values] of Object.entries(legacy)) shapeCategories[id] = { ...values, ...current[id] };
  return { ...stored, shapeCategories };
}

/**
 * Moteur de rendu PlantUML enregistré comme réglage du mode Séquences (sujet 306, `modes.sequences.plantumlRenderer` et
 * `plantumlUrl`) : repris dans les paramètres Exporteurs › PlantUML, communs aux modes (sujet 439), une valeur déjà
 * enregistrée à la nouvelle place l'emportant ; les anciennes clés sont retirées du mode. Valeurs vérifiées par la
 * fusion des paramètres.
 */
function withLegacyExporters(stored: SettingsPatch): SettingsPatch {
  const { plantumlRenderer, plantumlUrl, ...sequences } = stored.modes?.sequences ?? {};
  if (plantumlRenderer === undefined && plantumlUrl === undefined) return stored;
  const legacy = {
    ...(typeof plantumlRenderer === 'string' ? { renderer: plantumlRenderer } : {}),
    ...(typeof plantumlUrl === 'string' ? { localUrl: plantumlUrl } : {}),
  } as NonNullable<NonNullable<SettingsPatch['exporters']>['plantuml']>;
  const { sequences: _, ...modes } = stored.modes ?? {};
  return {
    ...stored,
    modes: Object.keys(sequences).length > 0 ? { ...modes, sequences } : modes,
    exporters: { ...stored.exporters, plantuml: { ...legacy, ...stored.exporters?.plantuml } },
  };
}

/** Ce qui diffère de `defaults` dans `settings`, section par section : une valeur égale au défaut est omise. */
export function settingsDiff(settings: Settings, defaults: Settings): SettingsPatch {
  return (diffNode(settings, defaults) ?? {}) as SettingsPatch;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function diffNode(value: unknown, base: unknown): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) return undefined;
  const diff: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const reference = isPlainObject(base) ? base[key] : undefined;
    if (isPlainObject(child) && isPlainObject(reference)) {
      const nested = diffNode(child, reference);
      if (nested) diff[key] = nested;
    } else if (JSON.stringify(child) !== JSON.stringify(reference)) {
      diff[key] = child;
    }
  }
  return Object.keys(diff).length > 0 ? diff : undefined;
}
