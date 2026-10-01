import { Color, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Material, Object3D } from 'three';
import type { Rect } from '../model/types';

/**
 * Mise en valeur de la sélection par un voile (SPEC §11.1) : le reste de la page passe sous un
 * voile d'ombre, l'élément sélectionné est redessiné par-dessus, intact.
 *
 * Ordre de dessin : tout le contenu de la page < voile < élément mis en valeur. Le voile n'a pas de
 * test de profondeur (il recouvre aussi les volumes iso) ; l'élément mis en valeur garde le sien,
 * un bloc devant lui continue donc de le cacher (assombri par le voile).
 */

/** Ordre de dessin du voile : après tout le contenu de la page (miniatures du graphe comprises). */
export const VEIL_ORDER = 1e9;
/** Décalage d'ordre de l'élément mis en valeur : après le voile. */
const LIFT = 2e9;
const VEIL_COLOR = new Color('#202124');
/** Demi-côté du voile, en pixels de page : bien au-delà de ce qui peut être à l'écran. */
const VEIL_EXTENT = 1e6;

/** Voile sombre posé sur toute la page, centré sur `around`. */
export function createVeil(around: Rect, opacity: number): Group {
  const group = new Group();
  group.name = 'selection-veil';
  group.renderOrder = VEIL_ORDER;
  const material = new MeshBasicMaterial({
    color: VEIL_COLOR,
    opacity,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });
  const plane = new Mesh(new PlaneGeometry(2 * VEIL_EXTENT, 2 * VEIL_EXTENT), material);
  plane.position.set(around.x + around.width / 2, around.y + around.height / 2, 0);
  plane.renderOrder = VEIL_ORDER;
  group.add(plane);
  return group;
}

/**
 * Passe des objets au-dessus du voile. Les matériaux opaques (volumes iso) passent dans la liste
 * transparente le temps de la mise en valeur, pour être dessinés après le voile. `restore` annule tout.
 */
export function liftAboveVeil(objects: Object3D[]): () => void {
  const changes: Array<() => void> = [];
  for (const root of objects) {
    root.traverse((object) => {
      const order = object.renderOrder;
      object.renderOrder = order + LIFT;
      changes.push(() => {
        object.renderOrder = order;
      });
      if (!(object instanceof Mesh)) return;
      const materials: Material[] = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material.transparent) continue;
        material.transparent = true;
        changes.push(() => {
          material.transparent = false;
        });
      }
    });
  }
  return () => {
    for (const undo of changes.reverse()) undo();
  };
}
