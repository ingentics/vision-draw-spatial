import { Mesh } from 'three';
import type { Material, Object3D } from 'three';

/**
 * Opacité globale d'une page (fondu des transitions, SPEC §11.2, et des bascules 2D ↔ volume,
 * §9.1). Chaque élément garde son opacité propre, multipliée par `alpha` et par l'estompage de ses
 * ancêtres (`userData.dim`, ex. éléments hors du flux courant d'un mode) ; les matériaux opaques
 * (volumes) deviennent transparents le temps du fondu. alpha = 1 sans estompage restaure exactement
 * l'état initial. L'alpha est retenu sur la racine (`userData.pageAlpha`) pour réappliquer un estompage.
 */
export function setPageOpacity(root: Object3D, alpha: number): void {
  root.userData.pageAlpha = alpha;
  applyOpacity(root, alpha);
}

/**
 * Estompe des éléments d'une page (enfants directs de la racine, `userData.elementId`) : opacité multipliée par
 * `dim(id)` (1 = net), sans toucher au fondu en cours de la page. Renvoie vrai si quelque chose a changé.
 */
export function setElementsDim(root: Object3D, dim: (elementId: string) => number): boolean {
  let changed = false;
  for (const child of root.children) {
    const id = child.userData.elementId as string | undefined;
    if (id === undefined) continue;
    const value = dim(id);
    if ((child.userData.dim ?? 1) === value) continue;
    child.userData.dim = value;
    changed = true;
  }
  if (changed) applyOpacity(root, (root.userData.pageAlpha as number | undefined) ?? 1);
  return changed;
}

function applyOpacity(object: Object3D, inherited: number): void {
  const alpha = inherited * ((object.userData.dim as number | undefined) ?? 1);
  // Texte troika : opacité propre, sans passer par le matériau dérivé.
  const text = object as Object3D & { fillOpacity?: number; sync?: unknown };
  if (typeof text.fillOpacity === 'number' && typeof text.sync === 'function') {
    object.userData.baseFillOpacity ??= text.fillOpacity;
    text.fillOpacity = object.userData.baseFillOpacity * alpha;
    return;
  }
  if (object instanceof Mesh) {
    const materials: Material[] = Array.isArray(object.material) ? object.material : [object.material];
    const bases: number[] = (object.userData.baseOpacities ??= materials.map((m) => m.opacity));
    const transparent: boolean[] = (object.userData.baseTransparent ??= materials.map((m) => m.transparent));
    materials.forEach((material, i) => {
      material.opacity = (bases[i] ?? 1) * alpha;
      material.transparent = (transparent[i] ?? false) || alpha < 1;
    });
  }
  for (const child of object.children) applyOpacity(child, alpha);
}
