import { Box3, Vector3 } from 'three';
import type { Matrix4, Object3D } from 'three';
import type { Point } from '../model/types';

/** Où se trouvent les textes dessinés (SDF Troika) sous un objet de la scène, en coordonnées de page (clic). */

/** Mise en page d'un texte SDF : `blockBounds` absent tant qu'elle n'est pas prête. */
type LaidOutText = Object3D & { textRenderInfo?: { blockBounds: [number, number, number, number] } };

/**
 * Boîte d'un texte dessiné (texte SDF mis en page, ou segments d'un texte riche), en coordonnées de
 * page ; undefined tant que la mise en page n'est pas prête.
 */
export function drawnTextBox(object: Object3D, toPage: Matrix4): Box3 | undefined {
  const box = new Box3();
  object.traverse((child) => {
    const info = (child as LaidOutText).textRenderInfo;
    if (!info) return;
    const [minX, minY, maxX, maxY] = info.blockBounds;
    for (const [x, y] of [
      [minX, minY],
      [maxX, minY],
      [minX, maxY],
      [maxX, maxY],
    ] as const) {
      box.expandByPoint(new Vector3(x, y, 0).applyMatrix4(child.matrixWorld).applyMatrix4(toPage));
    }
  });
  return box.isEmpty() ? undefined : box;
}

/** Coins (espace page) de chaque texte SDF dessiné sous `object` : une lettre tournée par quadrilatère. */
export function drawnGlyphQuads(object: Object3D, toPage: Matrix4): Point[][] {
  const quads: Point[][] = [];
  object.traverse((child) => {
    const info = (child as LaidOutText).textRenderInfo;
    if (!info) return;
    const [minX, minY, maxX, maxY] = info.blockBounds;
    quads.push(
      (
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
        ] as const
      ).map(([x, y]) => {
        const v = new Vector3(x, y, 0).applyMatrix4(child.matrixWorld).applyMatrix4(toPage);
        return { x: v.x, y: v.y };
      }),
    );
  });
  return quads;
}
