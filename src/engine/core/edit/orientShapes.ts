import { orientation } from '../render/geometry/orient';
import { styleFlag } from '../model/styleValues';

/**
 * Retourner ou pivoter une forme (sujet 335) : règle pure, sans état. Les actions portent sur **l'écran**, quelle que soit
 * l'orientation déjà posée ; la règle cherche les clés draw.io (`direction`, `flipH`, `flipV`) qui donnent le résultat.
 */

export type OrientAction = 'flipHorizontal' | 'flipVertical' | 'rotateLeft' | 'rotateRight';

/** Ce que l'action change : clés de style (undefined = retirée) et échange de la largeur et de la hauteur. */
export interface OrientChange {
  style: Record<'direction' | 'flipH' | 'flipV', string | undefined>;
  /** Pivot : largeur et hauteur s'échangent autour du centre, la forme tourne au lieu d'être écrasée dans ses bornes. */
  swapSize: boolean;
}

type Direction = 'east' | 'south' | 'west' | 'north';
const DIRECTIONS: readonly Direction[] = ['east', 'south', 'west', 'north'];

/** Matrice 2×2 (colonnes : images de (1,0) et de (0,1)) d'une orientation, lue par `orientation()`, la référence. */
type Matrix = readonly [number, number, number, number];

function matrixOf(direction: Direction, flipH: boolean, flipV: boolean): Matrix {
  const style: Record<string, string> = { direction };
  if (flipH) style.flipH = '1';
  if (flipV) style.flipV = '1';
  const o = orientation({ x: 0, y: 0, width: 2, height: 2 }, style);
  const a = o.direction({ x: 1, y: 0 });
  const b = o.direction({ x: 0, y: 1 });
  return [Math.round(a.x), Math.round(a.y), Math.round(b.x), Math.round(b.y)];
}

/** Transformation de l'écran de chaque action, appliquée après l'orientation courante. */
const SCREEN: Record<OrientAction, Matrix> = {
  flipHorizontal: [-1, 0, 0, 1],
  flipVertical: [1, 0, 0, -1],
  rotateRight: [0, 1, -1, 0],
  rotateLeft: [0, -1, 1, 0],
};

function multiply(s: Matrix, m: Matrix): Matrix {
  return [s[0] * m[0] + s[2] * m[1], s[1] * m[0] + s[3] * m[1], s[0] * m[2] + s[2] * m[3], s[1] * m[2] + s[3] * m[3]];
}

function directionOf(style: Record<string, string>): Direction {
  return DIRECTIONS.find((direction) => direction === style.direction) ?? 'east';
}

/**
 * Clés de style après l'action. Parmi les combinaisons qui donnent le même dessin, on garde celle qui change le moins la
 * forme (un retournement reste un `flipH` ou `flipV` plutôt qu'un changement de `direction`). `undefined` : l'action ne
 * change rien.
 */
export function orientChange(style: Record<string, string>, action: OrientAction): OrientChange | undefined {
  const direction = directionOf(style);
  const flipH = styleFlag(style, 'flipH');
  const flipV = styleFlag(style, 'flipV');
  const target = multiply(SCREEN[action], matrixOf(direction, flipH, flipV));
  const pivot = action === 'rotateLeft' || action === 'rotateRight';
  const lying = (d: Direction) => d === 'north' || d === 'south';
  let best: { direction: Direction; flipH: boolean; flipV: boolean; cost: number } | undefined;
  for (const d of DIRECTIONS) {
    // Un pivot échange le cadre local (couché ↔ debout) ; un retournement le laisse.
    if (lying(d) !== (lying(direction) !== pivot)) continue;
    for (const h of [false, true])
      for (const v of [false, true]) {
        const m = matrixOf(d, h, v);
        if (m.some((value, i) => value !== target[i])) continue;
        const cost = Number(d !== direction) * 2 + Number(h !== flipH) + Number(v !== flipV);
        if (!best || cost < best.cost) best = { direction: d, flipH: h, flipV: v, cost };
      }
  }
  if (!best) return undefined;
  return {
    style: {
      direction: best.direction === 'east' ? undefined : best.direction,
      flipH: best.flipH ? '1' : undefined,
      flipV: best.flipV ? '1' : undefined,
    },
    swapSize: pivot,
  };
}
