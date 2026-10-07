import { DEFAULT_SETTINGS, mergeSettings } from '../engine';
import type { Settings, SettingsPatch } from '../engine';

/** Paramètres persistés dans le navigateur (SPEC §13). */

const KEY = 'drawio-spatial:settings';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? mergeSettings(DEFAULT_SETTINGS, JSON.parse(raw) as SettingsPatch) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Stockage indisponible : les paramètres valent pour la session seulement.
  }
}
