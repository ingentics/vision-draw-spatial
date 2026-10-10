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
 * Moteur de rendu PlantUML enregistré comme réglage d'un mode (sujet 306 : Séquences, `plantumlRenderer` et
 * `plantumlUrl`) : repris dans les paramètres Exporteurs › PlantUML, communs aux modes (sujet 439), une valeur déjà
 * enregistrée à la nouvelle place l'emportant. Les anciennes clés sont cherchées dans chaque mode sans le nommer
 * (sujet 454) et retirées, comme le mode s'il ne lui reste rien. Valeurs vérifiées par la fusion des paramètres.
 */
function withLegacyExporters(stored: SettingsPatch): SettingsPatch {
  let renderer: unknown;
  let url: unknown;
  let found = false;
  const modes: Record<string, Record<string, unknown>> = {};
  for (const [id, values] of Object.entries(stored.modes ?? {})) {
    const { plantumlRenderer, plantumlUrl, ...rest } = values as Record<string, unknown>;
    if (plantumlRenderer === undefined && plantumlUrl === undefined) {
      modes[id] = values as Record<string, unknown>;
      continue;
    }
    found = true;
    renderer ??= plantumlRenderer;
    url ??= plantumlUrl;
    if (Object.keys(rest).length > 0) modes[id] = rest;
  }
  if (!found) return stored;
  const legacy = {
    ...(typeof renderer === 'string' ? { renderer } : {}),
    ...(typeof url === 'string' ? { localUrl: url } : {}),
  } as NonNullable<NonNullable<SettingsPatch['exporters']>['plantuml']>;
  return {
    ...stored,
    modes: modes as SettingsPatch['modes'],
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
