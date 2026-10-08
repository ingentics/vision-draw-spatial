import type { Point } from '../model/types';
import { SIDE_NORMALS } from './edgeEnds';
import type { Side } from './edgeEnds';

/**
 * Bout perpendiculaire à son point d'ancrage (étape 128) : une flèche orthogonale à coudes dont le dernier segment
 * longe le côté de la forme y arrive après un coude ; on repousse ce coude hors de la forme pour que le tracé
 * rejoigne le point d'ancrage à 90°.
 */

/** Garde hors de la forme, en pixels de page (`jettySize` auto de draw.io pour une pointe classique). */
export const SQUARE_END_STUB = 20;

const round = (v: number) => Math.round(v);

/** Tracé réduit à ses bouts et à ses coudes (points confondus ou alignés retirés). */
function bends(route: Point[]): Point[] {
  const pts: Point[] = [];
  for (const p of route) {
    const last = pts[pts.length - 1];
    if (last && round(last.x - p.x) === 0 && round(last.y - p.y) === 0) continue;
    const before = pts[pts.length - 2];
    if (
      before &&
      last &&
      ((round(before.x - last.x) === 0 && round(last.x - p.x) === 0) ||
        (round(before.y - last.y) === 0 && round(last.y - p.y) === 0))
    )
      pts.pop();
    pts.push(p);
  }
  return pts;
}

/** Vrai si le tracé arrive sur son dernier point par l'extérieur du côté, à angle droit. */
function arrivesSquare(route: Point[], side: Side): boolean {
  const pts = bends(route);
  const a = pts[pts.length - 1];
  const c = pts[pts.length - 2];
  if (!a || !c) return false;
  const n = SIDE_NORMALS[side];
  const out = (c.x - a.x) * n.x + (c.y - a.y) * n.y;
  const across = (c.x - a.x) * n.y - (c.y - a.y) * n.x;
  return out > 0 && round(across) === 0;
}

/**
 * Points intermédiaires qui font arriver le bout `end` du tracé brut `route` à angle droit sur le côté `side` de
 * sa forme ; undefined s'il y arrive déjà, ou si le tracé ne s'y prête pas (`reroute` vérifie le résultat).
 */
export function squareEnd(
  route: Point[],
  end: 'source' | 'target',
  side: Side,
  reroute: (waypoints: Point[]) => Point[],
): Point[] | undefined {
  const forward = end === 'target' ? route : [...route].reverse();
  if (arrivesSquare(forward, side)) return undefined;
  const pts = bends(forward);
  if (pts.length < 3) return undefined;
  const a = pts[pts.length - 1]!;
  const c = pts[pts.length - 2]!;
  const n = SIDE_NORMALS[side];
  // Seul cas traité : le dernier segment longe le côté ; le coude passe à la garde, un segment rejoint le bout.
  if (round((c.x - a.x) * n.x + (c.y - a.y) * n.y) !== 0) return undefined;
  const shift = (p: Point): Point => ({ x: round(p.x + n.x * SQUARE_END_STUB), y: round(p.y + n.y * SQUARE_END_STUB) });
  const inner = pts.slice(1, -2).map((p) => ({ x: round(p.x), y: round(p.y) }));
  const points = [...inner, shift(c), shift(a)];
  const waypoints = end === 'target' ? points : points.reverse();
  const routed = reroute(waypoints);
  const check = end === 'target' ? routed : [...routed].reverse();
  return arrivesSquare(check, side) ? waypoints : undefined;
}
