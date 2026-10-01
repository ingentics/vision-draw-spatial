import {
  AlwaysStencilFunc,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  NotEqualStencilFunc,
  PlaneGeometry,
  ReplaceStencilOp,
} from 'three';
import type { Material, Object3D } from 'three';
import type { Point, Rect } from '../model/types';
import { strokeTriangles } from './geometry/stroke';

/**
 * Mise en valeur de la sélection par un voile (SPEC §11.1) : le reste de la page passe sous un
 * voile d'ombre, l'élément sélectionné est redessiné par-dessus, intact.
 *
 * Ordre de dessin : tout le contenu de la page < voile < élément mis en valeur. Le voile n'a pas de
 * test de profondeur (il recouvre aussi les volumes iso) ; l'élément mis en valeur garde le sien,
 * un bloc devant lui continue donc de le cacher (assombri par le voile).
 *
 * Éléments fins (flèches, liaisons) : le voile est **percé** d'une bande autour de leur tracé
 * (masque stencil dessiné juste avant le voile), pour bien voir ce qui est sélectionné et ses abords.
 */

/** Ordre de dessin du voile : après tout le contenu de la page (miniatures du graphe comprises). */
export const VEIL_ORDER = 1e9;
/** Décalage d'ordre de l'élément mis en valeur : après le voile. */
const LIFT = 2e9;
const VEIL_COLOR = new Color('#202124');
/** Demi-côté du voile, en pixels de page : bien au-delà de ce qui peut être à l'écran. */
const VEIL_EXTENT = 1e6;
/** Valeur du stencil marquant les trous du voile. */
const HOLE_STENCIL = 1;

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
    // Pas de voile là où un trou a été marqué (voir `createVeilHole`).
    stencilWrite: true,
    stencilRef: HOLE_STENCIL,
    stencilFunc: NotEqualStencilFunc,
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

/**
 * Trou dans le voile le long d'un tracé (flèche, liaison) : bande de largeur `width` (pixels de page),
 * extrémités arrondies, posée à la hauteur `z`. Invisible : elle ne fait que marquer le stencil, juste
 * avant le voile. Testée en profondeur : un bloc devant le tracé reste voilé.
 */
export function createVeilHole(route: Point[], z: number, width: number): Group {
  const group = new Group();
  group.name = 'selection-veil-hole';
  group.renderOrder = VEIL_ORDER - 1;
  const positions: number[] = [];
  const triangles = strokeTriangles(route, width, false);
  for (let i = 0; i < triangles.length; i += 2) positions.push(triangles[i]!, triangles[i + 1]!, 0);
  // Extrémités arrondies : un disque à chaque bout.
  for (const end of [route[0], route[route.length - 1]]) {
    if (!end) continue;
    const segments = 20;
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      positions.push(
        end.x,
        end.y,
        0,
        end.x + (Math.cos(a0) * width) / 2,
        end.y + (Math.sin(a0) * width) / 2,
        0,
        end.x + (Math.cos(a1) * width) / 2,
        end.y + (Math.sin(a1) * width) / 2,
        0,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const material = new MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    transparent: true,
    side: DoubleSide,
    stencilWrite: true,
    stencilRef: HOLE_STENCIL,
    stencilFunc: AlwaysStencilFunc,
    stencilZPass: ReplaceStencilOp,
  });
  const mask = new Mesh(geometry, material);
  mask.position.z = z;
  mask.renderOrder = VEIL_ORDER - 1;
  group.add(mask);
  return group;
}
