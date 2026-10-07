import type { Point } from '../../model/types';

/**
 * Pointes de flèches draw.io (`startArrow` / `endArrow`), mêmes proportions que mxMarker.
 * Les formes sont calculées en coordonnées page, la pointe exactement sur l'extrémité de l'arête.
 */

export interface MarkerShape {
  /** Polygone plein (couleur du trait). */
  fill?: Point[];
  /** Contour : flèches creuses (`endFill=0`) ou ouvertes (`open`). */
  outline?: { points: Point[]; closed: boolean };
  /** Traits séparés (cardinalités ER : barres, patte d'oie, cercle). */
  strokes?: Array<{ points: Point[]; closed: boolean }>;
  /** Longueur dont il faut raccourcir la ligne pour qu'elle ne dépasse pas de la pointe. */
  inset: number;
}

const KNOWN = new Set([
  'classic',
  'classicThin',
  'block',
  'blockThin',
  'open',
  'openThin',
  'oval',
  'diamond',
  'diamondThin',
  // Cardinalités des diagrammes entité-relation (sujet 265).
  'ERone',
  'ERmandOne',
  'ERmany',
  'ERoneToMany',
  'ERzeroToOne',
  'ERzeroToMany',
]);

export function isKnownMarker(type: string): boolean {
  return KNOWN.has(type);
}

/**
 * @param tip extrémité de l'arête
 * @param direction vecteur unitaire du sens de parcours, vers la pointe
 * @param filled faux pour une flèche creuse
 */
export function buildMarker(
  type: string,
  tip: Point,
  direction: Point,
  size: number,
  strokeWidth: number,
  filled: boolean,
): MarkerShape | undefined {
  if (!type || type === 'none') return undefined;
  // Type inconnu : on dessine une flèche classique (le style est signalé ailleurs comme non supporté).
  const kind = KNOWN.has(type) ? type : 'classic';
  const thin = kind.endsWith('Thin');
  const base = thin ? kind.slice(0, -4) : kind;

  const length = size + strokeWidth;
  const n = { x: direction.x * length, y: direction.y * length };
  const perp = { x: -direction.y, y: direction.x };
  const at = (back: number, side: number): Point => ({
    x: tip.x - n.x * back + perp.x * side,
    y: tip.y - n.y * back + perp.y * side,
  });

  if (base.startsWith('ER')) return erMarker(base, at, length);

  const shape = (points: Point[], inset: number): MarkerShape =>
    filled ? { fill: points, inset } : { outline: { points, closed: true }, inset };

  switch (base) {
    case 'classic': {
      const half = length / (thin ? 3 : 2);
      return shape([at(0, 0), at(1, half), at(0.75, 0), at(1, -half)], length * 0.75);
    }
    case 'block': {
      const half = length / (thin ? 3 : 2);
      return shape([at(0, 0), at(1, half), at(1, -half)], length);
    }
    case 'open': {
      const half = length / (thin ? 3 : 2);
      return { outline: { points: [at(1, half), at(0, 0), at(1, -half)], closed: false }, inset: strokeWidth / 2 };
    }
    case 'diamond': {
      const half = length / (thin ? 3.4 : 2);
      return shape([at(0, 0), at(0.5, half), at(1, 0), at(0.5, -half)], length);
    }
    case 'oval': {
      const center = at(0.5, 0);
      const radius = length / 2;
      const points: Point[] = [];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        points.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) });
      }
      return shape(points, length);
    }
    default:
      return undefined;
  }
}

/**
 * Cardinalité ER, comme les marqueurs `ER…` de draw.io (Shapes.js) : sur une longueur `length` depuis l'extrémité,
 * barre (un), patte d'oie (plusieurs) ; les variantes « zéro » ajoutent un cercle creux sur une seconde longueur, et
 * la ligne s'arrête avant lui.
 */
function erMarker(type: string, at: (back: number, side: number) => Point, length: number): MarkerShape | undefined {
  const half = length / 2;
  const bar = (back: number) => ({ points: [at(back, half), at(back, -half)], closed: false });
  const crowFoot = { points: [at(0, half), at(1, 0), at(0, -half)], closed: false };
  const circle = {
    points: Array.from({ length: 24 }, (_, i) => {
      const center = at(1.5, 0);
      const angle = (i / 24) * Math.PI * 2;
      return { x: center.x + half * Math.cos(angle), y: center.y + half * Math.sin(angle) };
    }),
    closed: true,
  };
  switch (type) {
    case 'ERone':
      return { strokes: [bar(0.5)], inset: 0 };
    case 'ERmandOne':
      return { strokes: [bar(0.5), bar(1)], inset: 0 };
    case 'ERmany':
      return { strokes: [crowFoot], inset: 0 };
    case 'ERoneToMany':
      return { strokes: [crowFoot, bar(1)], inset: 0 };
    case 'ERzeroToOne':
      return { strokes: [bar(0.5), circle], inset: 2 * length };
    case 'ERzeroToMany':
      return { strokes: [crowFoot, circle], inset: 2 * length };
    default:
      return undefined;
  }
}
