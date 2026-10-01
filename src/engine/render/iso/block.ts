import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh } from 'three';
import type { Point, ShapeModel } from '../../model/types';
import { createBox, VERTEX_DEFAULTS } from '../flat/box';
import type { BoxDefaults } from '../flat/box';
import { fillMesh, solidMaterial } from '../meshes';
import type { SceneRenderer } from '../shapes/types';
import { styleColor } from '../styleValues';
import type { RenderContext } from '../types';

/**
 * Rendu iso en volume (niveau `iso`) : la forme devient un bloc posé au sol.
 * - Dessus : le rendu à plat habituel (fond, bordure, label), surélevé.
 * - Côtés : la couleur de fond, assombrie selon l'orientation de chaque face (lumière fixe dans
 *   la page) : relief lisible sans éclairage 3D, cohérent avec le style à plat.
 * Une forme sans fond reste à plat (pas de volume « fantôme »).
 */

/** Épaisseur par défaut d'un bloc, en pixels de page. */
export const DEFAULT_DEPTH = 16;
/** Léger décalage pour que bordure et label du dessus ne se battent pas avec le fond (z-fighting). */
const TOP_OFFSET = 0.05;
/**
 * Direction (page) vers la lumière. Dans l'orientation iso par défaut, la face visible de gauche
 * est claire et celle de droite plus sombre, comme une illustration isométrique classique.
 */
const LIGHT = normalize({ x: 1, y: 2 });

/** Hauteur d'une forme en volume : `spatial.height` dans le style, sinon l'épaisseur par défaut. */
export function blockHeight(shape: ShapeModel, ctx: RenderContext): number {
  const own = parseFloat(shape.style['spatial.height'] ?? '');
  if (Number.isFinite(own) && own >= 0) return own;
  return ctx.volume?.depth ?? DEFAULT_DEPTH;
}

/** Rendu iso d'une forme définie par son contour. */
export function isoBlock(
  outline: (shape: ShapeModel) => Point[],
  defaults: BoxDefaults = VERTEX_DEFAULTS,
): SceneRenderer {
  return {
    create(shape, ctx) {
      const path = outline(shape);
      const height = blockHeight(shape, ctx);
      const fill = styleColor(shape.style, 'fillColor', defaults.fill);
      // Pas de fond ou pas d'épaisseur : rendu à plat.
      if (!fill || height <= 0) return createBox(shape, path, ctx, defaults);

      const group = new Group();
      group.name = `shape:${shape.id}`;
      group.userData.height = height;

      // Côtés (opaques, avec profondeur).
      group.add(sides(path, height, fill));
      // Dessus : fond opaque, puis le rendu à plat (bordure, label) juste au-dessus.
      const top = fillMesh(path, fill, 1);
      top.material = solidMaterial(fill);
      top.position.z = height;
      top.name = 'top';
      group.add(top);
      const flat = createBox(shape, path, ctx, { ...defaults, fill: null });
      flat.position.z = height + TOP_OFFSET;
      for (const child of [...flat.children]) group.add(reparent(child, flat.position.z));
      return group;
    },
  };
}

/** Faces latérales d'un prisme droit de contour `path` et de hauteur `height`, ombrées. */
function sides(path: Point[], height: number, color: Color): Mesh {
  const positions: number[] = [];
  const colors: number[] = [];
  const shaded = new Color();
  const clockwise = signedArea(path) < 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const b = path[(i + 1) % path.length]!;
    // Normale sortante dans le plan (dépend du sens de parcours du contour).
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    const normal = clockwise ? { x: -dy / length, y: dx / length } : { x: dy / length, y: -dx / length };
    // Face éclairée : 0,9 ; face à l'ombre : 0,62.
    const light = Math.max(0, normal.x * LIGHT.x + normal.y * LIGHT.y);
    shaded.copy(color).multiplyScalar(0.62 + 0.28 * light);
    for (const [x, y, z] of [
      [a.x, a.y, 0],
      [b.x, b.y, 0],
      [b.x, b.y, height],
      [a.x, a.y, 0],
      [b.x, b.y, height],
      [a.x, a.y, height],
    ] as const) {
      positions.push(x, y, z);
      colors.push(shaded.r, shaded.g, shaded.b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const material = solidMaterial(new Color(0xffffff));
  material.vertexColors = true;
  const mesh = new Mesh(geometry, material);
  mesh.name = 'sides';
  return mesh;
}

/** Retire un enfant de son groupe pour le rattacher ailleurs, en gardant sa hauteur. */
function reparent<T extends { position: { z: number }; removeFromParent(): unknown }>(child: T, z: number): T {
  child.removeFromParent();
  child.position.z += z;
  return child;
}

function signedArea(path: Point[]): number {
  let area = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const b = path[(i + 1) % path.length]!;
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function normalize(p: Point): Point {
  const length = Math.hypot(p.x, p.y);
  return { x: p.x / length, y: p.y / length };
}
