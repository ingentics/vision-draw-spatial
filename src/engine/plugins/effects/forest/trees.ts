import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial } from 'three';
import type { EffectLight, Point } from '../../../core/plugins';

export interface Tree {
  /** Graine de l'arbre (celle de sa case). */
  seed: number;
  /** Sapin (cônes empilés) ou feuillu (boule à facettes). */
  kind: 'conifer' | 'round';
  /** Pied de l'arbre, en pixels de page. */
  at: Point;
  /** Hauteur totale. */
  height: number;
  /** Rayon du feuillage. */
  crown: number;
  /** Variation de teinte du feuillage (0 à 1). */
  hue: number;
  /** Orientation des facettes (radians). */
  turn: number;
}

const TRUNK = new Color('#8c5e36');
const LEAVES = new Color('#3d7a3c');
/** Facettes d'un tronc, d'un cône, d'un anneau de feuillu. */
const SIDES = 7;

/**
 * Toute la forêt en un seul maillage (couleurs par sommet, facettes ombrées comme les volumes des formes : `light`),
 * opaque avec profondeur.
 */
export function forestMesh(trees: Tree[], light: EffectLight): Mesh {
  const out: Faces = { positions: [], colors: [], light };
  for (const tree of trees) addTree(out, tree);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(out.positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(out.colors, 3));
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }));
  mesh.name = 'forest';
  return mesh;
}

interface Faces {
  positions: number[];
  colors: number[];
  light: EffectLight;
}

function addTree(out: Faces, tree: Tree): void {
  const { at, height, crown, turn } = tree;
  const leaves = LEAVES.clone().offsetHSL((tree.hue - 0.5) * 0.06, (tree.hue - 0.5) * 0.1, (tree.hue - 0.5) * 0.06);
  const trunkRadius = Math.max(0.6, crown * 0.16);
  if (tree.kind === 'conifer') {
    // Tronc court, puis trois cônes empilés qui se chevauchent, de plus en plus petits.
    const trunk = height * 0.2;
    frustum(out, at, 0, trunk + 0.5, trunkRadius, trunkRadius * 0.8, turn, TRUNK);
    const tiers = 3;
    const span = height - trunk;
    for (let i = 0; i < tiers; i++) {
      const bottom = trunk + (span * i * 0.62) / tiers;
      const top = i === tiers - 1 ? height : bottom + span * 0.55;
      frustum(out, at, bottom, top, crown * (1 - i * 0.22), 0, turn + i * 0.4, leaves);
    }
  } else {
    // Tronc, puis une boule à facettes : anneau large au milieu, rétrécie en bas et en haut.
    const trunk = height * 0.35;
    frustum(out, at, 0, trunk + 1, trunkRadius, trunkRadius * 0.75, turn, TRUNK);
    const middle = trunk + (height - trunk) * 0.45;
    frustum(out, at, trunk, middle, crown * 0.55, crown, turn, leaves);
    frustum(out, at, middle, height - (height - trunk) * 0.1, crown, crown * 0.45, turn, leaves);
    frustum(out, at, height - (height - trunk) * 0.1, height, crown * 0.45, 0, turn, leaves);
  }
}

/** Tronc de cône à facettes (rayon `r1` en haut ; 0 = pointe), fermé en haut. */
function frustum(out: Faces, at: Point, z0: number, z1: number, r0: number, r1: number, turn: number, color: Color) {
  const ring = (r: number, z: number) =>
    Array.from({ length: SIDES }, (_, i) => {
      const a = turn + (i / SIDES) * Math.PI * 2;
      return [at.x + Math.cos(a) * r, at.y + Math.sin(a) * r, z] as Vec;
    });
  const bottom = ring(r0, z0);
  const top = ring(r1, z1);
  for (let i = 0; i < SIDES; i++) {
    const j = (i + 1) % SIDES;
    triangle(out, bottom[i]!, bottom[j]!, top[j]!, color);
    if (r1 > 0) triangle(out, bottom[i]!, top[j]!, top[i]!, color);
  }
  if (r1 > 0) {
    const center: Vec = [at.x, at.y, z1];
    for (let i = 0; i < SIDES; i++) triangle(out, top[i]!, top[(i + 1) % SIDES]!, center, color);
  }
}

type Vec = [number, number, number];

/** Triangle ombré selon sa pente et son orientation face à la lumière (`out.light`). */
function triangle(out: Faces, a: Vec, b: Vec, c: Vec, color: Color): void {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const normal = normalize([
    u[1]! * v[2]! - u[2]! * v[1]!,
    u[2]! * v[0]! - u[0]! * v[2]!,
    u[0]! * v[1]! - u[1]! * v[0]!,
  ]);
  // Normale sortante (sommets dans le sens direct vus de l'extérieur).
  const shade = out.light.shade({ x: normal[0]!, y: normal[1]!, z: normal[2]! });
  for (const p of [a, b, c]) {
    out.positions.push(...p);
    out.colors.push(color.r * shade, color.g * shade, color.b * shade);
  }
}

function normalize(v: number[]): number[] {
  const length = Math.hypot(...v) || 1;
  return v.map((x) => x / length);
}
