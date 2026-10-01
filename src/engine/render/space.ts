import type { Object3D } from 'three';

/**
 * Repère (SPEC §8.1) : le schéma est posé au sol, x draw.io → X, y draw.io → Z, Y vers le haut.
 *
 * Plutôt que de convertir chaque coordonnée, chaque page est un groupe dont la transformation
 * fait passer de « l'espace page » (coordonnées draw.io, y vers le bas, z = élévation)
 * à l'espace monde : (x, y, z) → (x, z, y). Les renderers dessinent donc directement en pixels draw.io.
 */
export function applyPageSpace(object: Object3D): void {
  // Matrice exacte (une rotation de π/2 introduirait des erreurs flottantes sur Y).
  object.matrix.set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  object.matrix.decompose(object.position, object.quaternion, object.scale);
  object.matrixAutoUpdate = false;
}
