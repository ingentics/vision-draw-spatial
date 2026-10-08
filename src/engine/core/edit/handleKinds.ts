import type { Point, Rect } from '../model/types';
import { SIDES, SIDE_NORMALS } from './edgeEnds';
import type { Side } from './edgeEnds';
import { snapToGrid } from '../model/geometry';

/**
 * Poignées de la forme sélectionnée (SPEC §14.1) : huit poignées de redimensionnement (coins et
 * milieux des côtés) et quatre poignées de connexion, une par côté, qu'on tire vers une autre forme :
 * la flèche part du côté de la poignée.
 */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export type ConnectHandle = `connect-${Side}`;
export type HandleKind = ResizeHandle | ConnectHandle;

export function isConnectHandle(kind: HandleKind): kind is ConnectHandle {
  return kind.startsWith('connect-');
}

export function connectSideOf(kind: ConnectHandle): Side {
  return kind.slice('connect-'.length) as Side;
}

/** Disposition des poignées, en pixels écran (paramètres `edit.connectHandleOffset` et `edit.middleHandleMinSpan`). */
export interface HandleLayout {
  /** Écart des poignées de connexion au bord de la forme. */
  connectOffset: number;
  /**
   * En dessous de cette taille à l'écran, les poignées du milieu d'un côté se chevaucheraient avec celles des
   * coins : elles sont masquées (haut / bas si la forme est étroite, gauche / droite si elle est plate), comme
   * draw.io.
   */
  middleMinSpan: number;
}

export const DEFAULT_HANDLE_LAYOUT: HandleLayout = { connectOffset: 18, middleMinSpan: 32 };

/** Poignées de redimensionnement placées ailleurs que sur les bornes (ex. région RDD : coin de l'onglet, sujet 344). */
export type MovedHandles = Partial<Record<ResizeHandle, Point>>;

export function handlePoints(
  bounds: Rect,
  zoom: number,
  layout: HandleLayout = DEFAULT_HANDLE_LAYOUT,
  moved: MovedHandles = {},
): Array<{ kind: HandleKind; point: Point }> {
  const { width: w, height: h } = bounds;
  const narrow = w * zoom < layout.middleMinSpan;
  const flat = h * zoom < layout.middleMinSpan;
  return allHandlePoints(bounds, zoom, layout.connectOffset)
    .filter(({ kind }) => !(narrow && (kind === 'n' || kind === 's')) && !(flat && (kind === 'e' || kind === 'w')))
    .map(({ kind, point }) => ({ kind, point: (!isConnectHandle(kind) && moved[kind]) || point }));
}

function allHandlePoints(bounds: Rect, zoom: number, connectOffset: number): Array<{ kind: HandleKind; point: Point }> {
  const { x, y, width: w, height: h } = bounds;
  const center = { x: x + w / 2, y: y + h / 2 };
  const offset = connectOffset / zoom;
  const connect = SIDES.map((side) => {
    const direction = SIDE_NORMALS[side];
    const kind: HandleKind = `connect-${side}`;
    return {
      kind,
      point: {
        x: center.x + direction.x * (w / 2 + offset),
        y: center.y + direction.y * (h / 2 + offset),
      },
    };
  });
  return [
    { kind: 'nw', point: { x, y } },
    { kind: 'n', point: { x: x + w / 2, y } },
    { kind: 'ne', point: { x: x + w, y } },
    { kind: 'e', point: { x: x + w, y: y + h / 2 } },
    { kind: 'se', point: { x: x + w, y: y + h } },
    { kind: 's', point: { x: x + w / 2, y: y + h } },
    { kind: 'sw', point: { x, y: y + h } },
    { kind: 'w', point: { x, y: y + h / 2 } },
    ...connect,
  ];
}

/** Taille minimale par défaut d'une forme redimensionnée, en pixels de page (paramètre `edit.minShapeSize`). */
export const MIN_SIZE = 10;

/**
 * Nouvelle emprise en tirant une poignée de `delta` (au sol) : seuls les bords de la poignée
 * bougent, aimantés à la grille (`gridSize` ≤ 0 : arrondi au pixel), sans passer sous la taille
 * minimale ni se retourner.
 */
export function resizeBounds(
  origin: Rect,
  handle: ResizeHandle,
  delta: Point,
  gridSize: number,
  minSize = MIN_SIZE,
): Rect {
  const snap = (value: number) => snapToGrid(value, gridSize);
  let left = origin.x;
  let top = origin.y;
  let right = origin.x + origin.width;
  let bottom = origin.y + origin.height;
  if (handle.includes('w')) left = Math.min(snap(left + delta.x), right - minSize);
  if (handle.includes('e')) right = Math.max(snap(right + delta.x), left + minSize);
  if (handle.includes('n')) top = Math.min(snap(top + delta.y), bottom - minSize);
  if (handle.includes('s')) bottom = Math.max(snap(bottom + delta.y), top + minSize);
  return { x: left, y: top, width: right - left, height: bottom - top };
}
