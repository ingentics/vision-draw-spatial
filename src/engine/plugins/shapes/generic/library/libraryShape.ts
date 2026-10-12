import { blockHeight, orientedPath, SPATIAL, spatialNumber } from '../../../../core/plugins';
import type { LibraryShape, Point, ShapeDefinition, ShapeDetail, ShapeModel } from '../../../../core/plugins';
import { box } from '../box';

/** Points en fraction des bornes étirés dans les bornes de la forme, orientés comme elle (`direction`, retournements). */
function inBounds(points: readonly Point[]): (shape: ShapeModel) => Point[] {
  return (shape) => orientedPath(shape.bounds, shape.style, (w, h) => points.map((p) => ({ x: p.x * w, y: p.y * h })));
}

/**
 * Forme d'une bibliothèque (sujet 529) : boîte de son contour (rendu à plat, prisme en iso / 3D, clic, mini-carte),
 * tracés intérieurs sur le fond ou sur le dessus du bloc. `render.depth` : hauteur du volume quand la forme n'a pas de
 * `spatial.height`.
 */
export function libraryShape(id: string, shape: LibraryShape, icon: string): ShapeDefinition {
  const lines = shape.render.details.map((detail) => ({ ...detail, at: inBounds(detail.path) }));
  const details = (target: ShapeModel): ShapeDetail[] =>
    lines.map(({ at, closed, filled }) => ({ path: at(target), closed, filled }));
  const base = box(inBounds(shape.render.outline), lines.length > 0 ? { details } : {});
  const { depth } = shape.render;
  if (depth === undefined) return { id, ...base, swatch: () => icon };

  const withDepth = (target: ShapeModel): ShapeModel =>
    spatialNumber(target, SPATIAL.height) === undefined
      ? { ...target, style: { ...target.style, [SPATIAL.height]: String(depth) } }
      : target;
  const iso = base.iso!;
  return {
    id,
    ...base,
    iso: { create: (target, ctx) => iso.create(withDepth(target), ctx) },
    volumeHeight: (target, ctx) => blockHeight(withDepth(target), ctx),
    swatch: () => icon,
  };
}
