import { stencilShape } from '../../../format/stencil';
import type { Point, ShapeModel } from '../../../model/types';
import { orientedPath } from '../../../render/geometry/orient';
import { box } from '../box';
import type { ShapeDefinition } from '../../types';

/** Tracé de l'avant-plan d'un stencil (coordonnées du stencil) : trait, rempli si `filled`, au sol si `ground`. */
export interface StencilPart {
  points: Point[];
  closed: boolean;
  filled?: boolean;
  /** Hors du contour : reste au sol devant le volume en iso / 3D. */
  ground?: boolean;
}

/** Stencil embarqué : un contour fermé (le fond, le contour de la forme) et un dessin d'avant-plan. */
export interface Stencil {
  /** `<shape name="…">` : la forme s'appelle `stencil:<name>`. */
  name: string;
  /** Cadre du stencil (`w`, `h`) : le dessin s'étire dans les bornes de la forme (`aspect="variable"`). */
  width: number;
  height: number;
  outline: Point[];
  parts?: StencilPart[];
}

const pathXml = (points: Point[], closed: boolean) =>
  '<path>' +
  points.map((p, i) => `<${i === 0 ? 'move' : 'line'} x="${p.x}" y="${p.y}"/>`).join('') +
  (closed ? '<close/>' : '') +
  '</path>';

/** XML du stencil draw.io, tiré des mêmes points que le rendu : draw.io le dessine à l'identique. */
export function stencilXml({ name, width, height, outline, parts = [] }: Stencil): string {
  return (
    `<shape name="${name}" w="${width}" h="${height}" aspect="variable" strokewidth="inherit">` +
    `<background>${pathXml(outline, true)}</background><foreground><fillstroke/>` +
    parts.map((part) => pathXml(part.points, part.closed) + (part.filled ? '<fillstroke/>' : '<stroke/>')).join('') +
    '</foreground></shape>'
  );
}

/** Coordonnée de stencil arrondie au centième (XML court, mêmes points pour draw.io et le moteur). */
export const stencilRound = (value: number) => Math.round(value * 100) / 100;

/**
 * Forme dessinée par un stencil embarqué (`shape=stencil(…)`) : `shape` est la valeur de `shape=` ; `box` le rendu,
 * étiré dans les bornes et orienté comme draw.io (`mxStencil.computeAspect`, `direction`, `flipH`, `flipV`) :
 * contour en fond, avant-plan tracé par-dessus (sur le dessus du prisme en iso / 3D, au sol s'il est hors du contour).
 */
export function stencilBox(stencil: Stencil): {
  shape: string;
  box: Pick<ShapeDefinition, 'outline' | 'details' | 'flat' | 'iso' | 'properties' | 'textZone'>;
} {
  const { width, height, outline, parts = [] } = stencil;
  const oriented = (shape: ShapeModel, points: Point[]) =>
    orientedPath(shape.bounds, shape.style, (w, h) =>
      points.map((p) => ({ x: (p.x * w) / width, y: (p.y * h) / height })),
    );
  return {
    shape: stencilShape(stencilXml(stencil)),
    box: box(
      (shape) => oriented(shape, outline),
      parts.length === 0
        ? {}
        : {
            details: (shape) =>
              parts.map((part) => ({
                path: oriented(shape, part.points),
                closed: part.closed,
                filled: part.filled,
                ground: part.ground,
              })),
          },
    ),
  };
}
