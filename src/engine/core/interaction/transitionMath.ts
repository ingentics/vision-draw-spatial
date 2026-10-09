import type { Rect } from '../model/types';
import type { CameraState } from './cameraState';
import { center, fitScale } from '../model/geometry';

/**
 * Transition « zoom + fondu » entre pages (SPEC §11.2), partie calcul.
 *
 * Pendant la transition, la page cible est posée *dans* la forme cliquée (transformation
 * d'échelle + translation de son espace page) : elle grossit avec la forme pendant le zoom.
 * La caméra va en un seul trajet jusqu'à la vue finale de la page cible, exprimée dans ce
 * repère transformé (`embeddedCamera`). À l'arrivée, on retire la transformation et on applique
 * la vue finale elle-même : l'image à l'écran est identique, la bascule est invisible.
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

/**
 * Pose l'emprise `content` (page cible) dans `frame` (forme cliquée) : même centre,
 * échelle telle que le contenu tienne dans le cadre (marge relative `margin`).
 */
export function embedIn(content: Rect, frame: Rect, margin = 0.1): PageEmbedding {
  const available = { width: frame.width * (1 - 2 * margin), height: frame.height * (1 - 2 * margin) };
  const scale = fitScale(content, available, 1);
  const contentCenter = center(content);
  const frameCenter = center(frame);
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

/**
 * Inverse de `equivalentCamera` : la caméra qui montre la page transformée par `embedding`
 * exactement comme `camera` montre la page sans transformation.
 */
export function embeddedCamera(camera: CameraState, embedding: PageEmbedding): CameraState {
  return {
    ...camera,
    center: {
      x: embedding.scale * camera.center.x + embedding.offset.x,
      y: embedding.scale * camera.center.y + embedding.offset.y,
    },
    zoom: camera.zoom / embedding.scale,
  };
}

/** Progression d'une sous-phase [start, end] d'une animation de progression globale t ∈ [0, 1]. */
export function phase(t: number, start: number, end: number): number {
  if (t <= start) return 0;
  if (t >= end) return 1;
  return (t - start) / (end - start);
}
