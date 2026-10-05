import type { Point } from '../../model/types';
import type { PageEffectDefinition } from '../types';
import { forestMesh } from './trees';
import type { Tree } from './trees';

/** Pas de la grille des arbres, en pixels de page : au plus un arbre par case. */
const CELL = 64;
/** La forêt s'étend jusqu'à cette distance de l'emprise du schéma… */
const REACH = 560;
/** … en s'éclaircissant à partir de celle-ci. */
const THIN_FROM = 260;
/** Part des cases boisées au cœur de la forêt. */
const DENSITY = 0.6;
/** Écart minimal entre le feuillage d'un arbre et le schéma (forme, tracé, texte). */
const CLEARANCE = 14;
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
  volume(_page, room) {
    const area = room.bounds ?? { x: 0, y: 0, width: 0, height: 0 };
    const outside = (p: Point) =>
      Math.hypot(
        Math.max(area.x - p.x, 0, p.x - area.x - area.width),
        Math.max(area.y - p.y, 0, p.y - area.y - area.height),
      );
    const trees: Tree[] = [];
    const [x0, x1] = [Math.floor((area.x - REACH) / CELL), Math.ceil((area.x + area.width + REACH) / CELL)];
    const [y0, y1] = [Math.floor((area.y - REACH) / CELL), Math.ceil((area.y + area.height + REACH) / CELL)];
    for (let cx = x0; cx < x1; cx++) {
      for (let cy = y0; cy < y1; cy++) {
        const seed = cellSeed(cx, cy);
        const random = mulberry32(seed);
        const chance = random();
        const tree = treeOf(seed, random);
        for (let i = 0; i < TRIES; i++) {
          const at = { x: (cx + 0.15 + 0.7 * random()) * CELL, y: (cy + 0.15 + 0.7 * random()) * CELL };
          const thin = 1 - smoothstep(THIN_FROM, REACH, outside(at));
          if (chance >= DENSITY * thin) break;
          if (room.distance(at) < tree.crown + CLEARANCE) continue;
          trees.push({ ...tree, at });
          break;
        }
      }
    }
    return trees.length > 0 ? forestMesh(trees) : undefined;
  },
};

/** Arbre d'une case (sans sa place) : essence, taille, teinte et orientation tirées de sa graine. */
function treeOf(seed: number, random: () => number): Omit<Tree, 'at'> {
  const size = random();
  const height = 40 + size * size * 80;
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
