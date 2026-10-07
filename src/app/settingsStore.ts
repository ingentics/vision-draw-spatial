import { DEFAULT_DEPTH, DEFAULT_SETTINGS, LEGACY_DEFAULT_DEPTH, mergeSettings } from '../engine';
import type { Settings, SettingsPatch } from '../engine';

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
const VERSION = 3;

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
 * Version 3 : la touche pour suivre un lien passe de ⌘ (ancien défaut) à Espace (ticket 121).
 */
export function migrate(stored: SettingsPatch & { version?: number }): SettingsPatch {
  const version = stored.version ?? 1;
  let next: SettingsPatch = stored;
  if (version < 2 && stored.view?.isoDepth === LEGACY_DEFAULT_DEPTH)
    next = { ...next, view: { ...next.view, isoDepth: DEFAULT_DEPTH } };
  if (version < 3 && stored.controls?.followLinkKey === 'meta')
    next = { ...next, controls: { ...next.controls, followLinkKey: 'space' } };
  return next;
}

function legacySettings(): SettingsPatch {
  const patch: SettingsPatch = {};
  const iso = localStorage.getItem(LEGACY.iso);
  if (iso) patch.view = JSON.parse(iso) as SettingsPatch['view'];
  const minimap = localStorage.getItem(LEGACY.minimap);
  if (minimap) patch.minimap = { visible: minimap !== '0' };
  return patch;
}
