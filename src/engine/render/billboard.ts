import { Vector3 } from 'three';
import type { Camera, Object3D, PerspectiveCamera } from 'three';

/**
 * Objets debout face à la caméra (`userData.billboard`, ex. la silhouette de l'Actor en iso / 3D) : avant chaque
 * image, chacun tourne autour de la verticale de son parent (axe z de l'espace page) pour que son axe local −y
 * pointe vers la caméra. En perspective, la direction va de l'objet à la position de la caméra : chaque silhouette
 * fait exactement face à l'œil, même au bord de l'écran. En projection orthographique, toutes suivent la direction
 * de visée (et, vue d'aplomb, le bas de l'écran).
 */
export function orientBillboards(root: Object3D, camera: Camera): void {
  camera.updateMatrixWorld();
  const perspective = (camera as PerspectiveCamera).isPerspectiveCamera === true;
  const eye = new Vector3().setFromMatrixPosition(camera.matrixWorld);
  // Vers la caméra (son axe +z : elle regarde selon −z), puis vers le bas de l'écran (son axe −y).
  const back = new Vector3(0, 0, 1).transformDirection(camera.matrixWorld);
  const down = new Vector3(0, -1, 0).transformDirection(camera.matrixWorld);
  const visit = (object: Object3D) => {
    if (!object.visible) return;
    if (object.userData.billboard && object.parent) {
      object.rotation.z = facing(object, eye, perspective ? undefined : back, down);
      return;
    }
    for (const child of object.children) visit(child);
  };
  visit(root);
}

/** Rotation autour de z qui tourne l'axe −y de l'objet vers la caméra, dans le repère de son parent. */
function facing(object: Object3D, eye: Vector3, back: Vector3 | undefined, down: Vector3): number {
  const parent = object.parent!;
  parent.updateWorldMatrix(true, false);
  const origin = parent.worldToLocal(eye.clone());
  const directions = back ? [back, down] : [undefined, down];
  for (const direction of directions) {
    // Sans direction : de l'objet à l'œil (perspective) ; sinon la direction, ramenée dans le repère du parent.
    const target = direction ? parent.worldToLocal(eye.clone().add(direction)) : origin;
    const from = direction ? origin : object.position;
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    if (Math.hypot(dx, dy) > 1e-6) return Math.atan2(dx, -dy);
  }
  return object.rotation.z;
}
