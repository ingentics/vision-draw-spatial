import type { Point, Rect } from '../model/types';

/**
 * Poignées de la forme sélectionnée (SPEC §14.1) : huit poignées de redimensionnement (coins et
 * milieux des côtés) et une poignée de connexion, à droite, qu'on tire vers une autre forme.
 */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export type HandleKind = ResizeHandle | 'connect';

/** Écart de la poignée de connexion au bord droit, en pixels écran. */
export const CONNECT_HANDLE_OFFSET = 18;
/**
 * En dessous de cette taille à l'écran (pixels), les poignées du milieu d'un côté se chevaucheraient
 * avec celles des coins : elles sont masquées (haut / bas si la forme est étroite, gauche / droite si
 * elle est plate), comme draw.io.
 */
export const MIDDLE_HANDLE_MIN_SPAN = 32;

export function handlePoints(bounds: Rect, zoom: number): Array<{ kind: HandleKind; point: Point }> {
  const { width: w, height: h } = bounds;
  const narrow = w * zoom < MIDDLE_HANDLE_MIN_SPAN;
  const flat = h * zoom < MIDDLE_HANDLE_MIN_SPAN;
  return allHandlePoints(bounds, zoom).filter(
    ({ kind }) => !(narrow && (kind === 'n' || kind === 's')) && !(flat && (kind === 'e' || kind === 'w')),
  );
}

function allHandlePoints(bounds: Rect, zoom: number): Array<{ kind: HandleKind; point: Point }> {
  const { x, y, width: w, height: h } = bounds;
  return [
    { kind: 'nw', point: { x, y } },
    { kind: 'n', point: { x: x + w / 2, y } },
    { kind: 'ne', point: { x: x + w, y } },
    { kind: 'e', point: { x: x + w, y: y + h / 2 } },
    { kind: 'se', point: { x: x + w, y: y + h } },
    { kind: 's', point: { x: x + w / 2, y: y + h } },
    { kind: 'sw', point: { x, y: y + h } },
    { kind: 'w', point: { x, y: y + h / 2 } },
    { kind: 'connect', point: { x: x + w + CONNECT_HANDLE_OFFSET / zoom, y: y + h / 2 } },
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
  const step = gridSize > 0 ? gridSize : 1;
  const snap = (value: number) => Math.round(value / step) * step;
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
