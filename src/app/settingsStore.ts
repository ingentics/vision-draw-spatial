import { DEFAULT_DEPTH, DEFAULT_SETTINGS, legacyModeSettings, LEGACY_DEFAULT_DEPTH, mergeSettings } from '../engine';
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

/** Ancienne vitesse par défaut des tirets du contour de sélection (px/s), avant le ticket 257. */
const LEGACY_SELECTION_SPEED = 12;

/** Version des paramètres enregistrés, pour les migrations. */
const VERSION = 5;

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
 * Version 4 : les tirets du contour de sélection défilent à 4 px/s par défaut (ancien défaut : 12, ticket 257).
 * Version 5 : les réglages des modes passent de la section `shapes` à `modes.<id>` (ticket 283) ; chaque réglage de
 * mode déclare son ancienne clé.
 */
export function migrate(stored: SettingsPatch & { version?: number }): SettingsPatch {
  const version = stored.version ?? 1;
  let next: SettingsPatch = stored;
  if (version < 2 && stored.view?.isoDepth === LEGACY_DEFAULT_DEPTH)
    next = { ...next, view: { ...next.view, isoDepth: DEFAULT_DEPTH } };
  if (version < 3 && stored.controls?.followLinkKey === 'meta')
    next = { ...next, controls: { ...next.controls, followLinkKey: 'space' } };
  if (version < 4 && stored.selection?.speed === LEGACY_SELECTION_SPEED)
    next = { ...next, selection: { ...next.selection, speed: DEFAULT_SETTINGS.selection.speed } };
  if (version < 5) {
    const modes = legacyModeSettings(stored.shapes as Record<string, unknown> | undefined);
    if (Object.keys(modes).length > 0) next = { ...next, modes: { ...modes, ...next.modes } };
  }
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
