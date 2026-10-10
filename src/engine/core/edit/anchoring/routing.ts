import type { Point, Rect } from '../../model/types';
import { SIDE_NORMALS } from '../edgeEnds';
import type { Side } from '../edgeEnds';

/**
 * Briques communes aux tracés qui contournent formes et flèches (ancrage automatique et Typon, SPEC §14.1) : réglages,
 * coûts, bouts de flèche, segments, file de priorité et contrat d'un routeur.
 */

/** Réglages du tracé (paramètres `shapes.edgeShapeClearance`…), en pixels de page. */
export interface AvoidOptions {
  /** Écart minimal entre un tracé et une forme. */
  clearance: number;
  /** Écart entre deux flèches qui partagent un couloir. */
  spacing: number;
  /** Longueur du premier et du dernier segment, perpendiculaires au côté. */
  stub: number;
  /** Détour accepté pour éviter un croisement : coût d'un croisement, en pixels de longueur équivalente. */
  crossingDetour: number;
}

export const DEFAULT_AVOID_OPTIONS: AvoidOptions = { clearance: 10, spacing: 10, stub: 20, crossingDetour: 500 };

/** Coût d'un coude, en pixels de longueur équivalente. */
export const BEND_COST = 30;
/** Coût par pixel de tracé superposé à une autre flèche. */
export const OVERLAP_COST = 40;
/** Attirance (par pixel de tracé et de distance) vers le bout où converge un faisceau : départage les égalités. */
export const ATTRACT_COST = 1e-4;
/** Biais maximal d'un couloir selon la graine, en part de la longueur. */
export const SEED_JITTER = 0.15;

/** Bout de flèche : point d'attache et côté de la forme. */
export interface Port {
  point: Point;
  side: Side;
}

/** Segment d'un tracé. */
export interface Segment {
  a: Point;
  b: Point;
}

/** Point à `length` du bout, perpendiculairement à son côté. */
export const out = ({ point, side }: Port, length: number): Point => ({
  x: point.x + SIDE_NORMALS[side].x * length,
  y: point.y + SIDE_NORMALS[side].y * length,
});

/** Point strictement à l'intérieur (bord exclu). */
export function inside(r: Rect, p: Point): boolean {
  return p.x > r.x + 1e-6 && p.x < r.x + r.width - 1e-6 && p.y > r.y + 1e-6 && p.y < r.y + r.height - 1e-6;
}

/** File de priorité minimale (tas binaire). */
export class Heap {
  private items: Array<{ cost: number; state: number }> = [];
  get size(): number {
    return this.items.length;
  }
  push(cost: number, state: number): void {
    const items = this.items;
    items.push({ cost, state });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent]!.cost <= items[i]!.cost) break;
      [items[parent], items[i]] = [items[i]!, items[parent]!];
      i = parent;
    }
  }
  pop(): { cost: number; state: number } {
    const items = this.items;
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const [l, r] = [2 * i + 1, 2 * i + 2];
        let min = i;
        if (l < items.length && items[l]!.cost < items[min]!.cost) min = l;
        if (r < items.length && items[r]!.cost < items[min]!.cost) min = r;
        if (min === i) break;
        [items[min], items[i]] = [items[i]!, items[min]!];
        i = min;
      }
    }
    return top;
  }
}

/**
 * Façon de tracer une flèche (orthogonale en ancrage automatique, octilinéaire en Typon) : segments d'un tracé, conflit
 * entre deux segments (croisement ou superposition), tracé d'une flèche.
 */
export interface Router {
  /**
   * Clés de style écrites sur les flèches réparties (undefined : clé retirée), le seul tracé que permet l'ancrage
   * (sujets 441, 443) : orthogonal arrondi en automatique ; en Typon, ligne droite par les points intermédiaires.
   */
  edgeStyle: Readonly<Record<string, string | undefined>>;
  segments(path: Point[]): Segment[];
  conflict(s: Segment, t: Segment): boolean;
  route(
    from: Port,
    to: Port,
    obstacles: readonly Rect[],
    occupied: readonly Segment[],
    attract: Point | undefined,
    options: AvoidOptions,
    seed: number,
  ): Point[] | undefined;
}
