import type { PageEffectDefinition, Point } from '../../../core/plugins';
import { forestMesh } from './trees';
import type { Tree } from './trees';

/** Part de l'étendue où la forêt est pleine ; elle s'éclaircit au-delà. */
const THIN_FROM = 0.45;
/** Places essayées dans sa case pour un arbre gêné par le schéma, avant de renoncer. */
const TRIES = 6;

/**
 * Forêt (sujet 143) : en iso / 3D, des arbres poussent autour du schéma, jamais près d'une forme, d'un tracé ou d'un
 * texte. Chaque case d'une grille fixe a sa graine (même schéma, même forêt) : elle décide de l'arbre (présence,
 * essence, taille, teinte) et des places où il peut pousser ; un arbre gêné par le schéma va à la suivante.
 */
export const definition: PageEffectDefinition = {
  id: 'forest',
  name: 'Forêt',
  description: 'Des arbres poussent autour du schéma en iso / 3D (spatial.effects)',
  viewModes: ['iso', '3d'],
  settings: [
    {
      type: 'number',
      key: 'size',
      label: 'Taille des arbres',
      title: 'Hauteur des plus grands arbres',
      min: 5,
      max: 150,
      step: 1,
      default: 30,
      unit: 'px',
    },
    {
      type: 'number',
      key: 'spacing',
      label: 'Espacement',
      title: 'Pas de la grille : au plus un arbre par case',
      min: 12,
      max: 200,
      step: 1,
      default: 28,
      unit: 'px',
    },
    {
      type: 'number',
      key: 'density',
      label: 'Densité',
      title: 'Part des cases boisées au cœur de la forêt',
      min: 0,
      max: 1,
      step: 0.05,
      default: 0.6,
      unit: '%',
    },
    {
      type: 'number',
      key: 'reach',
      label: 'Étendue',
      title: 'Distance jusqu’où la forêt s’étend autour du schéma',
      min: 100,
      max: 3000,
      step: 50,
      default: 1200,
      unit: 'px',
    },
    {
      type: 'number',
      key: 'clearance',
      label: 'Écart au schéma',
      title: 'Écart minimal entre un arbre et une forme, un tracé ou un texte',
      min: 0,
      max: 100,
      step: 1,
      default: 8,
      unit: 'px',
    },
  ],
  volume(_page, room, values) {
    const {
      size,
      spacing: CELL,
      density,
      reach,
      clearance,
    } = values as Record<'size' | 'spacing' | 'density' | 'reach' | 'clearance', number>;
    const area = room.bounds ?? { x: 0, y: 0, width: 0, height: 0 };
    const outside = (p: Point) =>
      Math.hypot(
        Math.max(area.x - p.x, 0, p.x - area.x - area.width),
        Math.max(area.y - p.y, 0, p.y - area.y - area.height),
      );
    const trees: Tree[] = [];
    const [x0, x1] = [Math.floor((area.x - reach) / CELL), Math.ceil((area.x + area.width + reach) / CELL)];
    const [y0, y1] = [Math.floor((area.y - reach) / CELL), Math.ceil((area.y + area.height + reach) / CELL)];
    for (let cx = x0; cx < x1; cx++) {
      for (let cy = y0; cy < y1; cy++) {
        const seed = cellSeed(cx, cy);
        const random = mulberry32(seed);
        const chance = random();
        const tree = treeOf(seed, random, size);
        for (let i = 0; i < TRIES; i++) {
          const at = { x: (cx + 0.15 + 0.7 * random()) * CELL, y: (cy + 0.15 + 0.7 * random()) * CELL };
          const thin = 1 - smoothstep(reach * THIN_FROM, reach, outside(at));
          if (chance >= density * thin) break;
          if (room.distance(at) < tree.crown + clearance) continue;
          trees.push({ ...tree, at });
          break;
        }
      }
    }
    return trees.length > 0 ? forestMesh(trees) : undefined;
  },
};

/** Arbre d'une case (sans sa place) : essence, taille, teinte et orientation tirées de sa graine. */
function treeOf(seed: number, random: () => number, size: number): Omit<Tree, 'at'> {
  const t = random();
  // Du tiers de la taille à la taille entière ; les petits arbres sont plus nombreux.
  const height = (size / 3) * (1 + 2 * t * t);
  const kind = random() < 0.55 ? 'conifer' : 'round';
  return {
    seed,
    kind,
    height,
    crown: height * (kind === 'conifer' ? 0.24 : 0.3) * (0.85 + 0.3 * random()),
    hue: random(),
    turn: random() * Math.PI * 2,
  };
}

/** Graine d'une case de la grille (hachage de ses indices). */
function cellSeed(cx: number, cy: number): number {
  let h = Math.imul(cx | 0, 0x27d4eb2d) ^ Math.imul(cy | 0, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32), dans [0, 1[. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(from: number, to: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}
