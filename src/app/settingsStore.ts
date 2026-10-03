import { DEFAULT_SETTINGS, mergeSettings } from '../engine/settings';
import type { Settings, SettingsPatch } from '../engine/settings';
import { DEFAULT_DEPTH, LEGACY_DEFAULT_DEPTH } from '../engine/spatial';

/**
 * Paramètres persistés dans le navigateur (SPEC §13). Reprend au premier lancement les réglages
 * enregistrés séparément auparavant (vue iso, mini-carte).
 */

const KEY = 'drawio-spatial:settings';
const LEGACY = {
  iso: 'drawio-spatial:view-settings',
  minimap: 'drawio-spatial:minimap-visible',
};

/** Version des paramètres enregistrés, pour les migrations. */
const VERSION = 2;

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return mergeSettings(DEFAULT_SETTINGS, migrate(JSON.parse(raw) as SettingsPatch & { version?: number }));
    return mergeSettings(DEFAULT_SETTINGS, legacySettings());
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...settings, version: VERSION }));
    for (const key of Object.values(LEGACY)) localStorage.removeItem(key);
  } catch {
    // Stockage indisponible : les paramètres valent pour la session seulement.
  }
}

/**
 * Paramètres enregistrés par une version précédente. Version 2 : toutes les formes partagent la même
 * épaisseur par défaut (32) ; l'ancienne valeur par défaut (16) enregistrée telle quelle est migrée.
 */
function migrate(stored: SettingsPatch & { version?: number }): SettingsPatch {
  if ((stored.version ?? 1) >= VERSION) return stored;
  if (stored.view?.isoDepth !== LEGACY_DEFAULT_DEPTH) return stored;
  return { ...stored, view: { ...stored.view, isoDepth: DEFAULT_DEPTH } };
}

function legacySettings(): SettingsPatch {
  const patch: SettingsPatch = {};
  const iso = localStorage.getItem(LEGACY.iso);
  if (iso) patch.view = JSON.parse(iso) as SettingsPatch['view'];
  const minimap = localStorage.getItem(LEGACY.minimap);
  if (minimap) patch.minimap = { visible: minimap !== '0' };
  return patch;
}
