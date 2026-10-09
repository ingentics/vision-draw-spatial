import type { Rect } from '../../model/types';

/** Découpage d'une image exportée (sujet 431) : rendue par morceaux, une image entière dépasserait la taille WebGL. */

/** Taille en pixels d'une image couvrant `frame` (unités du schéma) à `density` pixels par unité, au moins 1 px. */
export function imageSize(frame: Rect, density: number): { width: number; height: number } {
  return {
    width: Math.max(1, Math.ceil(frame.width * density)),
    height: Math.max(1, Math.ceil(frame.height * density)),
  };
}

/** Morceaux d'au plus `tile` pixels de côté couvrant une image `width` × `height`, ligne par ligne. */
export function imageTiles(width: number, height: number, tile: number): Rect[] {
  const tiles: Rect[] = [];
  for (let y = 0; y < height; y += tile)
    for (let x = 0; x < width; x += tile)
      tiles.push({ x, y, width: Math.min(tile, width - x), height: Math.min(tile, height - y) });
  return tiles;
}
