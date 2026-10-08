import { Group } from 'three';
import {
  clamp,
  createLabel,
  distance,
  orientedPath,
  polygonArc,
  strokeMesh,
  styleFlag,
  styleNumber,
  styleStroke,
  VERTEX_DEFAULTS,
} from '../../../../core/plugins';
import type { Point, RenderContext, ShapeDefinition, ShapeModel } from '../../../../core/plugins';

/** Fraction de la largeur par défaut de draw.io pour `size` (retrait de la tige par rapport au bord droit). */
const DEFAULT_SIZE = 0.5;
const CURVE_SEGMENTS = 8;

/**
 * Polyligne ouverte aux coins arrondis, comme `mxShape.addPoints` de draw.io (sans fermeture) : part du premier
 * point, s'arrête à `arc` px de chaque coin (au plus la moitié du côté) et le contourne par une quadratique.
 */
function roundedOpen(points: Point[], arc: number): Point[] {
  const out: Point[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const [prev, corner, next] = [out[out.length - 1]!, points[i]!, points[i + 1]!];
    const toward = (from: Point) => {
      const length = distance(from, corner);
      if (length === 0) return corner;
      const k = Math.min(arc, length / 2) / length;
      return { x: corner.x + (from.x - corner.x) * k, y: corner.y + (from.y - corner.y) * k };
    };
    const start = toward(prev);
    const end = toward(next);
    out.push(start);
    for (let t = 1; t <= CURVE_SEGMENTS; t++) {
      const u = t / CURVE_SEGMENTS;
      const a = (1 - u) * (1 - u);
      const b = 2 * (1 - u) * u;
      const c = u * u;
      out.push({
        x: a * start.x + b * corner.x + c * end.x,
        y: a * start.y + b * corner.y + c * end.y,
      });
    }
  }
  out.push(points[points.length - 1]!);
  return out;
}

/**
 * Accolade de draw.io (`mxCurlyBracket`) : polyligne ouverte à tige verticale à `size` × largeur du bord droit, pointe
 * au milieu du bord gauche ; les coins sont arrondis avec `rounded=1`. `flipH` la retourne (`orientedPath`).
 */
function bracketPath(shape: ShapeModel): Point[] {
  const { style } = shape;
  return orientedPath(shape.bounds, style, (w, h) => {
    const stem = w * (1 - clamp(styleNumber(style, 'size', DEFAULT_SIZE), 0, 1));
    const points = [
      { x: w, y: 0 },
      { x: stem, y: 0 },
      { x: stem, y: h / 2 },
      { x: 0, y: h / 2 },
      { x: stem, y: h / 2 },
      { x: stem, y: h },
      { x: w, y: h },
    ];
    return styleFlag(style, 'rounded') ? roundedOpen(points, polygonArc(style)) : points;
  });
}

function create(shape: ShapeModel, ctx: RenderContext): Group {
  const group = new Group();
  group.name = `shape:${shape.id}`;
  const stroke = styleStroke(shape.style, VERTEX_DEFAULTS.stroke);
  if (stroke) {
    const mesh = strokeMesh(bracketPath(shape), stroke.color, stroke.opacity, {
      width: stroke.width,
      closed: false,
      dash: stroke.dash,
    });
    if (mesh) group.add(mesh);
  }
  const label = createLabel(shape, ctx);
  if (label) group.add(label);
  return group;
}

/** Accolade gauche `{` (`shape=curlyBracket`) : sans fond, texte à gauche ; l'accolade droite la retourne (`flipH=1`). */
export const definition: ShapeDefinition = {
  id: 'curly-bracket-left',
  kinds: ['curlyBracket'],
  matches: (shape) => !styleFlag(shape.style, 'flipH'),
  flippable: { horizontal: true, vertical: true },
  rotatable: true,
  flat: { create },
  palette: {
    name: 'Accolade gauche',
    category: 'general',
    order: 120,
    keywords: ['accolade', 'gauche', 'curly', 'brace', 'bracket', 'left', 'crochet'],
    style:
      'shape=curlyBracket;whiteSpace=wrap;html=1;rounded=1;labelPosition=left;verticalLabelPosition=middle;align=right;verticalAlign=middle;',
    value: '',
    width: 20,
    height: 120,
    icon: '<path fill="none" d="M26 3C20 3 20 5 20 8V11C20 13 17 14 14 14C17 14 20 15 20 17V20C20 23 20 25 26 25"/>',
  },
};
