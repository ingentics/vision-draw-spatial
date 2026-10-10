import { Matrix4 } from 'three';
import type { Box3, Object3D } from 'three';
import type { Rect } from '../model/types';

/**
 * Repère (SPEC §8.1) : le schéma est posé au sol, x draw.io → X, y draw.io → Z, Y vers le haut.
 *
 * Plutôt que de convertir chaque coordonnée, chaque page est un groupe dont la transformation
 * fait passer de « l'espace page » (coordonnées draw.io, y vers le bas, z = élévation)
 * à l'espace monde : (x, y, z) → (x, z, y). Les renderers dessinent donc directement en pixels draw.io.
 */

/** Matrice exacte (une rotation de π/2 introduirait des erreurs flottantes sur Y). */
const PAGE_SPACE = new Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);

export function applyPageSpace(object: Object3D): void {
  setPageTransform(object, undefined);
}

/**
 * Transformation de la page, avec en option une similitude de son espace page
 * (p ↦ scale · p + offset, hauteurs comprises), utilisée pour poser une page dans une forme
 * pendant une transition.
 */
export function setPageTransform(
  object: Object3D,
  embedding: { scale: number; offset: { x: number; y: number } } | undefined,
  heightScale = 1,
): void {
  object.matrix.copy(PAGE_SPACE);
  // Les hauteurs (volumes iso) suivent l'échelle de la page, et `heightScale` (bascule animée).
  const scale = embedding?.scale ?? 1;
  const offset = embedding?.offset ?? { x: 0, y: 0 };
  object.matrix.multiply(
    new Matrix4().set(scale, 0, 0, offset.x, 0, scale, 0, offset.y, 0, 0, scale * heightScale, 0, 0, 0, 0, 1),
  );
  object.matrix.decompose(object.position, object.quaternion, object.scale);
  object.matrixAutoUpdate = false;
  object.matrixWorldNeedsUpdate = true;
}

/** Emprise au sol d'une boîte du monde, en coordonnées de page (X = x, Z = y). */
export function pageRectOfBox(box: Box3): Rect {
  return { x: box.min.x, y: box.min.z, width: box.max.x - box.min.x, height: box.max.z - box.min.z };
}
