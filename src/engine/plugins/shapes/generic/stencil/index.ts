import { orientedPath, stencilShape } from '../../../../core/plugins';
import type { Point, ShapeDefinition, ShapeModel } from '../../../../core/plugins';
import { box } from '../box';

/** Stencil embarqué : un contour fermé, en coordonnées du stencil. */
export interface Stencil {
  /** `<shape name="…">` : la forme s'appelle `stencil:<name>`. */
  name: string;
  /** Cadre du stencil (`w`, `h`) : le dessin s'étire dans les bornes de la forme (`aspect="variable"`). */
  width: number;
  height: number;
  outline: Point[];
}

/** XML du stencil draw.io, tiré des mêmes points que le rendu : draw.io le dessine à l'identique. */
function stencilXml({ name, width, height, outline }: Stencil): string {
  return (
    `<shape name="${name}" w="${width}" h="${height}" aspect="variable" strokewidth="inherit">` +
    '<background><path>' +
    outline.map((p, i) => `<${i === 0 ? 'move' : 'line'} x="${p.x}" y="${p.y}"/>`).join('') +
    '<close/></path></background><foreground><fillstroke/></foreground></shape>'
  );
}

/**
 * Forme dessinée par un stencil embarqué (`shape=stencil(…)`) : `shape` est la valeur de `shape=` ; `box` le rendu
 * (boîte du contour), étiré dans les bornes et orienté comme draw.io (`mxStencil.computeAspect`, `direction`,
 * `flipH`, `flipV`).
 */
export function stencilBox(stencil: Stencil): {
  shape: string;
  box: Pick<ShapeDefinition, 'outline' | 'flat' | 'iso' | 'properties'>;
} {
  const { width, height, outline } = stencil;
  return {
    shape: stencilShape(stencilXml(stencil)),
    box: box((shape: ShapeModel) =>
      orientedPath(shape.bounds, shape.style, (w, h) =>
        outline.map((p) => ({ x: (p.x * w) / width, y: (p.y * h) / height })),
      ),
    ),
  };
}
