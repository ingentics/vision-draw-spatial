import { DEFAULT_SETTINGS, mergeSettings } from '../engine/settings';
import type { Settings, SettingsPatch } from '../engine/settings';

/**
 * Paramètres persistés dans le navigateur (SPEC §13). Reprend au premier lancement les réglages
 * enregistrés séparément auparavant (vue iso, mini-carte).
 */

const KEY = 'drawio-spatial:settings';
const LEGACY = {
  iso: 'drawio-spatial:view-settings',
  minimap: 'drawio-spatial:minimap-visible',
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return mergeSettings(DEFAULT_SETTINGS, JSON.parse(raw) as SettingsPatch);
    return mergeSettings(DEFAULT_SETTINGS, legacySettings());
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
    for (const key of Object.values(LEGACY)) localStorage.removeItem(key);
  } catch {
    // Stockage indisponible : les paramètres valent pour la session seulement.
  }
}

function legacySettings(): SettingsPatch {
  const patch: SettingsPatch = {};
  const iso = localStorage.getItem(LEGACY.iso);
  if (iso) patch.view = JSON.parse(iso) as SettingsPatch['view'];
  const minimap = localStorage.getItem(LEGACY.minimap);
  if (minimap) patch.minimap = { visible: minimap !== '0' };
  return patch;
}
