import { Mesh } from 'three';
import type { Material, Object3D } from 'three';

/**
 * Opacité globale d'une page (fondu des transitions, SPEC §11.2). Chaque élément garde son
 * opacité propre, multipliée par `alpha` ; alpha = 1 restaure exactement l'état initial.
 */
export function setPageOpacity(root: Object3D, alpha: number): void {
  root.traverse((object) => {
    // Texte troika : opacité propre, sans passer par le matériau dérivé.
    const text = object as Object3D & { fillOpacity?: number; sync?: unknown };
    if (typeof text.fillOpacity === 'number' && typeof text.sync === 'function') {
      object.userData.baseFillOpacity ??= text.fillOpacity;
      text.fillOpacity = object.userData.baseFillOpacity * alpha;
      return;
    }
    if (!(object instanceof Mesh)) return;
    const materials: Material[] = Array.isArray(object.material) ? object.material : [object.material];
    const bases: number[] = (object.userData.baseOpacities ??= materials.map((m) => m.opacity));
    materials.forEach((material, i) => {
      material.opacity = (bases[i] ?? 1) * alpha;
    });
  });
}
