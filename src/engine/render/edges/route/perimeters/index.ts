import type { Point, Rect } from '../../../../model/types';
import type { PerimeterKind, Terminal } from '../types';
import { number } from '../util';
import { perimeterPolygon, polygonPerimeter } from './polygons';
import { ellipsePerimeter, rectanglePerimeter, rhombusPerimeter, trianglePerimeter } from './shapePerimeters';
import { center } from '../../../../model/geometry';

/** Périmètres des formes (`mxPerimeter`) : choix du périmètre et point du contour visé depuis un point voisin. */

/** Périmètres nommés par `perimeter=…` (registre de styles de draw.io). */
const NAMED_PERIMETERS: Record<string, PerimeterKind> = {
  ellipsePerimeter: 'ellipse',
  rhombusPerimeter: 'rhombus',
  trianglePerimeter: 'triangle',
  hexagonPerimeter2: 'hexagon',
  parallelogramPerimeter: 'parallelogram',
  stepPerimeter: 'step',
};

/**
 * Périmètre d'une forme, comme draw.io : `perimeter=…` du style, sinon celui du style nommé (`ellipse;`,
 * `rhombus;`, `triangle;` dans la feuille de style par défaut de draw.io), sinon le rectangle (`defaultVertex`). Un
 * périmètre inconnu est approché par le rectangle.
 */
export function perimeterKind(style: Record<string, string>, names: string[]): PerimeterKind {
  const explicit = style.perimeter;
  if (explicit !== undefined) return NAMED_PERIMETERS[explicit] ?? 'rectangle';
  for (const name of names) {
    if (name === 'ellipse') return 'ellipse';
    if (name === 'rhombus') return 'rhombus';
    if (name === 'triangle') return 'triangle';
  }
  return 'rectangle';
}

export function perimeterBounds(terminal: Terminal, border: number): Rect {
  const grow = border + number(terminal.style?.perimeterSpacing, 0);
  const b = terminal.bounds;
  return { x: b.x - grow, y: b.y - grow, width: b.width + 2 * grow, height: b.height + 2 * grow };
}

/** Point du contour visé depuis `next` (mxGraphView.getPerimeterPoint), `orthogonal` : projeté dans l'axe. */
export function perimeterPoint(terminal: Terminal, next: Point, orthogonal: boolean, border: number): Point {
  const bounds = perimeterBounds(terminal, border);
  if (bounds.width <= 0 && bounds.height <= 0) return center(terminal.bounds);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const flipH = terminal.style?.flipH === '1';
  const flipV = terminal.style?.flipV === '1';
  const aim = { x: flipH ? 2 * cx - next.x : next.x, y: flipV ? 2 * cy - next.y : next.y };
  const polygon = perimeterPolygon(terminal.perimeter, bounds, terminal.style ?? {});
  const point = polygon
    ? polygonPerimeter(polygon, bounds, aim, orthogonal)
    : terminal.perimeter === 'ellipse'
      ? ellipsePerimeter(bounds, aim, orthogonal)
      : terminal.perimeter === 'rhombus'
        ? rhombusPerimeter(bounds, aim, orthogonal)
        : terminal.perimeter === 'triangle'
          ? trianglePerimeter(bounds, aim, orthogonal, terminal.style?.direction)
          : rectanglePerimeter(bounds, aim, orthogonal);
  if (flipH) point.x = 2 * cx - point.x;
  if (flipV) point.y = 2 * cy - point.y;
  return point;
}

/** Intersection du contour avec la demi-droite partant du centre vers `toward` (sans projection). */
export function perimeterToward(terminal: Terminal | undefined, toward: Point | undefined): Point | undefined {
  if (!terminal) return undefined;
  return toward ? perimeterPoint(terminal, toward, false, 0) : center(terminal.bounds);
}
