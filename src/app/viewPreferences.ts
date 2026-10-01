import type { ViewSettings } from '../engine/Engine';

/** Réglages de vue iso mémorisés dans le navigateur (en attendant le panneau de paramètres, étape 12). */

const KEY = 'drawio-spatial:view-settings';

export type IsoPreferences = Pick<ViewSettings, 'isoAngleDeg' | 'isoAzimuthDeg'>;

export function readIsoPreferences(): Partial<IsoPreferences> {
  try {
    const raw = localStorage.getItem(KEY);
    const value = raw ? (JSON.parse(raw) as Partial<IsoPreferences>) : {};
    const result: Partial<IsoPreferences> = {};
    if (typeof value.isoAngleDeg === 'number') result.isoAngleDeg = value.isoAngleDeg;
    if (typeof value.isoAzimuthDeg === 'number') result.isoAzimuthDeg = value.isoAzimuthDeg;
    return result;
  } catch {
    return {};
  }
}

export function writeIsoPreferences(preferences: IsoPreferences): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(preferences));
  } catch {
    // Stockage indisponible : les réglages valent pour la session seulement.
  }
}
