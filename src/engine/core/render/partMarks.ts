import type { Object3D } from 'three';

/**
 * Texte dessiné d'une partie de forme (sujet 253, ex. ligne d'une table RDD) : contrat entre le rendu d'un mode, qui le
 * marque (`markPart`), et le tronc, qui le masque pendant l'édition en place de cette partie (`partOf`).
 */

/** Marque `object` comme texte dessiné de la partie `part`. */
export function markPart(object: Object3D, part: string): void {
  object.userData.part = part;
}

/** Partie dont `object` est le texte dessiné ; undefined pour un autre objet. */
export function partOf(object: Object3D): string | undefined {
  const part: unknown = object.userData.part;
  return typeof part === 'string' ? part : undefined;
}
