import { orientedPath, stencilShape } from '../../../../core/plugins';
import type { Point, ShapeDefinition, ShapeModel } from '../../../../core/plugins';
import { box } from '../box';

/**
 * Contour d'un stencil (embarqué, ou de draw.io comme `mxgraph.basic.pentagon`), en coordonnées du stencil. Cadre
 * (`w`, `h` de `<shape>`) : le dessin s'étire dans les bornes de la forme (`aspect="variable"`).
 */
export interface StencilFrame {
  width: number;
  height: number;
  outline: Point[];
}

/** Stencil embarqué : un contour fermé, en coordonnées du stencil. */
export interface Stencil extends StencilFrame {
  /** `<shape name="…">` : la forme s'appelle `stencil:<name>`. */
  name: string;
}

/** Contour du stencil étiré dans les bornes, orienté comme draw.io (`mxStencil.computeAspect`, `direction`, flips). */
export function stencilOutline({ width, height, outline }: StencilFrame): (shape: ShapeModel) => Point[] {
  return (shape) =>
    orientedPath(shape.bounds, shape.style, (w, h) =>
      outline.map((p) => ({ x: (p.x * w) / width, y: (p.y * h) / height })),
    );
}

/** `<path>` de stencil draw.io d'une ligne brisée, fermée ou non (coordonnées arrondies au millième). */
export function stencilPathXml(points: Point[], closed: boolean): string {
  const at = (p: Point) => `x="${+p.x.toFixed(3)}" y="${+p.y.toFixed(3)}"`;
  return (
    '<path>' +
    points.map((p, i) => `<${i === 0 ? 'move' : 'line'} ${at(p)}/>`).join('') +
    (closed ? '<close/>' : '') +
    '</path>'
  );
}

/** XML du stencil draw.io, tiré des mêmes points que le rendu : draw.io le dessine à l'identique. */
function stencilXml(stencil: Stencil): string {
  const { name, width, height, outline } = stencil;
  return (
    `<shape name="${name}" w="${width}" h="${height}" aspect="variable" strokewidth="inherit">` +
    `<background>${stencilPathXml(outline, true)}</background>` +
    '<foreground><fillstroke/></foreground></shape>'
  );
}

/**
 * Forme dessinée par un stencil embarqué (`shape=stencil(…)`) : `shape` est la valeur de `shape=` ; `box` le rendu
 * (boîte du contour, `stencilOutline`).
 */
export function stencilBox(stencil: Stencil): {
  shape: string;
  box: Pick<ShapeDefinition, 'outline' | 'flat' | 'iso' | 'properties'>;
} {
  return { shape: stencilShape(stencilXml(stencil)), box: box(stencilOutline(stencil)) };
}
