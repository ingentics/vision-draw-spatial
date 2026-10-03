import type { Point } from '../model/types';
import { formatNumber } from './edit';
import type { DrawioTree } from './xmlTree';

/**
 * État de vue d'une page enregistré dans le fichier (attribut `spatial.view` de `<diagram>`) :
 * caméra et mode de rendu, pour retrouver la même vue à la réouverture.
 *
 * draw.io garde le nœud `<diagram>` d'origine en sauvegardant (il ne remplace que son contenu),
 * l'attribut survit donc à un passage dans draw.io. Format « clé=valeur; », comme les styles :
 * `mode=iso;x=120;y=80;zoom=1.25;rotation=-45;tilt=54.74;elevation=35.26;azimuth=-45;volume=1;depth=24`
 * (angles en degrés).
 */

export const VIEW_ATTRIBUTE = 'spatial.view';

/** Caméra enregistrée (même forme que l'état de caméra du moteur, qui la normalise à la lecture). */
export interface SavedCamera {
  mode: 'top' | 'iso' | '3d';
  center: Point;
  zoom: number;
  /** Radians. */
  rotation: number;
  /** Radians. */
  tilt: number;
}

/** Réglages du rendu iso propres à une page (mêmes noms que les paramètres de vue). */
export interface IsoViewParams {
  isoAngleDeg: number;
  isoAzimuthDeg: number;
  isoVolume: boolean;
  isoDepth: number;
}

export interface PageViewState {
  camera: SavedCamera;
  iso?: IsoViewParams;
}

const DEG = 180 / Math.PI;

export function formatViewState({ camera, iso }: PageViewState): string {
  const values: Array<[string, string]> = [
    ['mode', camera.mode],
    ['x', formatNumber(camera.center.x)],
    ['y', formatNumber(camera.center.y)],
    ['zoom', String(Math.round(camera.zoom * 10_000) / 10_000)],
    ['rotation', formatNumber(camera.rotation * DEG)],
    ['tilt', formatNumber(camera.tilt * DEG)],
  ];
  if (iso) {
    values.push(
      ['elevation', formatNumber(iso.isoAngleDeg)],
      ['azimuth', formatNumber(iso.isoAzimuthDeg)],
      ['volume', iso.isoVolume ? '1' : '0'],
      ['depth', formatNumber(iso.isoDepth)],
    );
  }
  return values.map(([key, value]) => `${key}=${value};`).join('');
}

/** État lu d'un attribut ; undefined s'il est absent ou inexploitable (caméra incomplète). */
export function parseViewState(text: string | null | undefined): PageViewState | undefined {
  if (!text) return undefined;
  const values = new Map<string, string>();
  for (const part of text.split(';')) {
    const index = part.indexOf('=');
    if (index > 0) values.set(part.slice(0, index).trim(), part.slice(index + 1).trim());
  }
  const num = (key: string) => {
    const value = parseFloat(values.get(key) ?? '');
    return Number.isFinite(value) ? value : undefined;
  };
  const x = num('x');
  const y = num('y');
  const zoom = num('zoom');
  if (x === undefined || y === undefined || zoom === undefined || zoom <= 0) return undefined;

  const tilt = (num('tilt') ?? 0) / DEG;
  const mode = values.get('mode');
  const camera: SavedCamera = {
    mode: mode === 'iso' || mode === 'top' || mode === '3d' ? mode : tilt > 0 ? 'iso' : 'top',
    center: { x, y },
    zoom,
    rotation: (num('rotation') ?? 0) / DEG,
    tilt,
  };

  const elevation = num('elevation');
  const azimuth = num('azimuth');
  const depth = num('depth');
  const volume = values.get('volume');
  const iso =
    elevation !== undefined && azimuth !== undefined && depth !== undefined && (volume === '0' || volume === '1')
      ? { isoAngleDeg: elevation, isoAzimuthDeg: azimuth, isoVolume: volume === '1', isoDepth: depth }
      : undefined;
  return iso ? { camera, iso } : { camera };
}

/** États de vue enregistrés dans le fichier, par page. */
export function readPageViews(tree: DrawioTree): Map<string, PageViewState> {
  const views = new Map<string, PageViewState>();
  for (const page of tree.pages) {
    const state = parseViewState(page.diagram?.getAttribute(VIEW_ATTRIBUTE));
    if (state) views.set(page.id, state);
  }
  return views;
}

/**
 * Écrit les états de vue dans les `<diagram>` (hors contenu compressé : la page n'est pas
 * réécrite pour autant). Sans `<diagram>` (ancien format), rien n'est enregistré.
 */
export function writePageViews(tree: DrawioTree, views: Map<string, PageViewState>): void {
  for (const page of tree.pages) {
    const state = views.get(page.id);
    if (state && page.diagram) page.diagram.setAttribute(VIEW_ATTRIBUTE, formatViewState(state));
  }
}
