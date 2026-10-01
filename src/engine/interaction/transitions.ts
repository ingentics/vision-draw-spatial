import type { Rect } from '../model/types';
import { normalizeAngle, screenAxes } from './camera';
import type { CameraState, Viewport } from './camera';

/**
 * Transition « zoom + fondu » entre pages (SPEC §11.2), partie calcul.
 *
 * Pendant la transition, la page cible est posée *dans* la forme cliquée (transformation
 * d'échelle + translation de son espace page) : elle grossit avec la forme pendant le zoom.
 * À la fin, on retire cette transformation et on passe à une caméra équivalente : l'image
 * à l'écran est identique, la bascule est invisible.
 */

/** Similitude 2D de l'espace page : p ↦ scale · p + offset. */
export interface PageEmbedding {
  scale: number;
  offset: { x: number; y: number };
}

export type EasingName = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export function easing(name: string): (t: number) => number {
  switch (name as EasingName) {
    case 'linear':
      return (t) => t;
    case 'ease-in':
      return (t) => t * t * t;
    case 'ease-out':
      return (t) => 1 - Math.pow(1 - t, 3);
    case 'ease-in-out':
    default:
      return (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  }
}

/** Caméra pour laquelle `bounds` recouvre tout l'écran (dans l'orientation donnée). */
export function coverBounds(bounds: Rect, viewport: Viewport, rotation: number): CameraState {
  const { right, down } = screenAxes(rotation);
  const hw = bounds.width / 2;
  const hh = bounds.height / 2;
  const screenWidth = 2 * (Math.abs(hw * right.x) + Math.abs(hh * right.y));
  const screenHeight = 2 * (Math.abs(hw * down.x) + Math.abs(hh * down.y));
  const zoom = Math.max(viewport.width / Math.max(screenWidth, 1e-6), viewport.height / Math.max(screenHeight, 1e-6));
  return {
    mode: 'top',
    center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    zoom,
    rotation: normalizeAngle(rotation),
  };
}

/**
 * Pose l'emprise `content` (page cible) dans `frame` (forme cliquée) : même centre,
 * échelle telle que le contenu tienne dans le cadre (marge relative `margin`).
 */
export function embedIn(content: Rect, frame: Rect, margin = 0.1): PageEmbedding {
  const available = { width: frame.width * (1 - 2 * margin), height: frame.height * (1 - 2 * margin) };
  const scale =
    content.width > 0 || content.height > 0
      ? Math.min(available.width / Math.max(content.width, 1e-6), available.height / Math.max(content.height, 1e-6))
      : 1;
  const contentCenter = { x: content.x + content.width / 2, y: content.y + content.height / 2 };
  const frameCenter = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
  return { scale, offset: { x: frameCenter.x - scale * contentCenter.x, y: frameCenter.y - scale * contentCenter.y } };
}

/**
 * Caméra qui, sur la page *sans* transformation, montre exactement ce que `camera` montre
 * de la page transformée par `embedding`.
 */
export function equivalentCamera(camera: CameraState, embedding: PageEmbedding): CameraState {
  return {
    ...camera,
    center: {
      x: (camera.center.x - embedding.offset.x) / embedding.scale,
      y: (camera.center.y - embedding.offset.y) / embedding.scale,
    },
    zoom: camera.zoom * embedding.scale,
  };
}

/** Progression d'une sous-phase [start, end] d'une animation de progression globale t ∈ [0, 1]. */
export function phase(t: number, start: number, end: number): number {
  if (t <= start) return 0;
  if (t >= end) return 1;
  return (t - start) / (end - start);
}
