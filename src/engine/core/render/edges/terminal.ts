import { parseStyle } from '../../format/style';
import type { ShapeModel } from '../../model/types';
import { perimeterKind } from './route';
import type { Terminal } from './route';

/**
 * Bout de tracé d'une forme (bornes, contour, style) pour le calcul du tracé d'une flèche. Sans Three.js : les règles
 * d'édition pures (`edit/`) s'en servent sans dépendre du dessin.
 */
export function toTerminal(shape: ShapeModel | undefined): Terminal | undefined {
  if (!shape) return undefined;
  return {
    bounds: shape.bounds,
    perimeter: perimeterKind(shape.style, parseStyle(shape.raw?.styleString).names),
    style: shape.style,
    id: shape.id,
  };
}
