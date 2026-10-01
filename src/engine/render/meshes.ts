import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Shape,
  ShapeGeometry,
  Vector2,
} from 'three';
import type { Color, Object3D } from 'three';
import type { Point } from '../model/types';
import { dashPolyline, strokeTriangles } from './geometry/stroke';
import { PART_ORDER } from './types';

/**
 * Matériau des éléments à plat : pas d'écriture de profondeur, l'ordre de dessin vient de
 * `renderOrder` (tous les éléments sont coplanaires). Tout est « transparent » pour que
 * Three.js trie un seul ensemble d'objets par `renderOrder`.
 */
export function flatMaterial(color: Color, opacity: number): MeshBasicMaterial {
  return new MeshBasicMaterial({ color, opacity, transparent: true, depthWrite: false, side: DoubleSide });
}

/**
 * Matériau des volumes (vue iso) : opaque, avec test et écriture de profondeur, pour que les
 * blocs se cachent correctement entre eux et cachent ce qui est derrière eux.
 */
export function solidMaterial(color: Color): MeshBasicMaterial {
  return new MeshBasicMaterial({ color, side: DoubleSide });
}

export function fillMesh(path: Point[], color: Color, opacity: number): Mesh {
  const shape = new Shape(path.map((p) => new Vector2(p.x, p.y)));
  const mesh = new Mesh(new ShapeGeometry(shape), flatMaterial(color, opacity));
  mesh.name = 'fill';
  mesh.renderOrder = PART_ORDER.fill;
  return mesh;
}

export interface StrokeOptions {
  width: number;
  closed: boolean;
  dash?: number[];
  /** Décalage de départ dans le motif de tirets. */
  dashOffset?: number;
}

/** Trait d'une polyligne, plein ou pointillé, en un seul mesh. Null si rien à dessiner. */
export function strokeMesh(path: Point[], color: Color, opacity: number, options: StrokeOptions): Mesh | null {
  const pieces = options.dash ? dashPolyline(path, options.dash, options.closed, options.dashOffset) : [path];
  const closedPieces = !options.dash && options.closed;
  const positions: number[] = [];
  for (const piece of pieces) {
    const triangles = strokeTriangles(piece, options.width, closedPieces);
    for (let i = 0; i < triangles.length; i += 2) positions.push(triangles[i]!, triangles[i + 1]!, 0);
  }
  if (positions.length === 0) return null;

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const mesh = new Mesh(geometry, flatMaterial(color, opacity));
  mesh.name = 'stroke';
  mesh.renderOrder = PART_ORDER.stroke;
  return mesh;
}

/** Libère géométries, matériaux et objets disposables (ex. textes troika) d'un sous-arbre. */
export function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    if (object instanceof Mesh) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material.dispose();
    }
    // Object3D.dispose() (Three ≥ 0.183) ; surchargé par troika pour libérer ses ressources.
    object.dispose();
  });
}
