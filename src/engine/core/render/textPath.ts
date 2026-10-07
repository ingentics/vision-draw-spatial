import type { Point } from '../model/types';
import type { FontSpec, MeasureText, RichTextLayout } from './richLayout';
import { length } from './edges/polyline';
import { distance } from '../model/geometry';

/**
 * Texte posé le long d'un tracé (texte du milieu d'une flèche qui la suit, ticket 138) : chaque lettre
 * sur le tracé, tournée selon la tangente à cet endroit. Pure : mise en page et mesure injectées.
 */

/**
 * Où poser le texte : tracé dessiné, position (-1…1, comme `EdgeLabelPlacement`), écart de côté, décalage libre,
 * et glissement le long du tracé (`shift`, en pixels, positif = vers la fin).
 */
export interface TextAlong {
  path: Point[];
  position: number;
  distance: number;
  offset: Point;
  shift?: number;
}

/** Lettre placée : ligne de base au point (x, y), centrée, tournée de `angle` (radians, espace page). */
export interface PathGlyph extends FontSpec {
  text: string;
  color?: string;
  x: number;
  y: number;
  angle: number;
}

/**
 * Lettres d'un texte mis en page (`layoutRichText`, une ligne = une rangée parallèle au tracé), posées le
 * long de `along.path`. Le bloc est placé autour du point d'ancrage comme un texte horizontal (`anchorX`,
 * `anchorY`) ; s'il se lirait de droite à gauche (ou de bas en haut), il est posé dans l'autre sens du tracé.
 * Au-delà des bouts, le tracé est prolongé en ligne droite.
 */
export function layoutOnPath(
  layout: RichTextLayout,
  along: TextAlong,
  anchor: { x: 'left' | 'center' | 'right'; y: 'top' | 'middle' | 'bottom' },
  measure: MeasureText,
): PathGlyph[] {
  if (along.path.length < 2 || length(along.path) === 0) return [];
  const shiftX = anchor.x === 'left' ? 0 : anchor.x === 'right' ? -layout.width : -layout.width / 2;
  const shiftY = anchor.y === 'top' ? 0 : anchor.y === 'bottom' ? -layout.height : -layout.height / 2;

  // Lettres : abscisse du centre le long du texte, ligne de base sous l'axe (positive = vers le bas du texte).
  const letters: Array<{ text: string; run: (typeof layout.runs)[number]; u: number; v: number }> = [];
  for (const run of layout.runs) {
    const chars = [...run.text];
    const widths = chars.map((char) => measure(char, run));
    const total = widths.reduce((sum, w) => sum + w, 0);
    // Lettres mesurées seules : ramenées à la largeur du mot (approche du crénage).
    const scale = total > 0 ? run.width / total : 0;
    let x = run.x;
    chars.forEach((char, i) => {
      const width = widths[i]! * scale;
      if (char.trim()) letters.push({ text: char, run, u: shiftX + x + width / 2, v: shiftY + run.baseline });
      x += width;
    });
  }
  if (letters.length === 0) return [];

  // Sens de lecture : de gauche à droite (ou de haut en bas), sinon tracé parcouru à l'envers.
  let path = along.path;
  const total = length(path);
  let at = ((along.position + 1) / 2) * total + (along.shift ?? 0);
  let side = along.distance;
  const first = pointAt(path, at + shiftX).point;
  const last = pointAt(path, at + shiftX + layout.width).point;
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  if (dx < -1e-6 || (Math.abs(dx) <= 1e-6 && dy < 0)) {
    path = [...path].reverse();
    at = total - at;
    side = -side;
  }

  return letters.map(({ text, run, u, v }) => {
    const { point, tangent } = pointAt(path, at + u);
    // Normale vers le haut du texte (à gauche du sens de lecture, y page vers le bas).
    const normal = { x: tangent.y, y: -tangent.x };
    return {
      text,
      size: run.size,
      bold: run.bold,
      italic: run.italic,
      family: run.family,
      color: run.color,
      x: point.x + normal.x * (side - v) + along.offset.x,
      y: point.y + normal.y * (side - v) + along.offset.y,
      angle: Math.atan2(tangent.y, tangent.x),
    };
  });
}

/**
 * Point d'ancrage d'un texte posé le long d'un tracé (celui autour duquel ses lettres sont placées : écart de côté
 * et décalage libre compris) et tangente du tracé à cet endroit.
 */
export function alongAnchor(along: TextAlong): { point: Point; tangent: Point } {
  const { point, tangent } = pointAt(along.path, ((along.position + 1) / 2) * length(along.path) + (along.shift ?? 0));
  const normal = { x: tangent.y, y: -tangent.x };
  return {
    point: {
      x: point.x + normal.x * along.distance + along.offset.x,
      y: point.y + normal.y * along.distance + along.offset.y,
    },
    tangent,
  };
}

/** Point et tangente unitaire à l'abscisse curviligne `s`, prolongés en ligne droite avant et après le tracé. */
function pointAt(path: Point[], s: number): { point: Point; tangent: Point } {
  const segments: Array<{ a: Point; b: Point; length: number }> = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const segment = distance(a, b);
    if (segment > 0) segments.push({ a, b, length: segment });
  }
  let remaining = s;
  for (let i = 0; i < segments.length; i++) {
    const { a, b, length: segment } = segments[i]!;
    if (remaining <= segment || i === segments.length - 1) {
      const tangent = { x: (b.x - a.x) / segment, y: (b.y - a.y) / segment };
      return { point: { x: a.x + tangent.x * remaining, y: a.y + tangent.y * remaining }, tangent };
    }
    remaining -= segment;
  }
  return { point: path[0]!, tangent: { x: 1, y: 0 } };
}
