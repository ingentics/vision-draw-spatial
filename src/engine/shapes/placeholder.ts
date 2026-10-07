import type { ShapeModel } from '../core/model/types';
import { createBox } from '../core/render/flat/box';
import { rectPath } from '../core/render/geometry/paths';
import { isoBlock } from '../core/render/iso/block';
import type { RenderContext } from '../core/render/types';
import { SPATIAL_PREFIX } from '../core/spatial';
import type { ShapeDefinition } from './types';

/** Couleurs par défaut (paramètres `shapes.placeholderFill` / `placeholderStroke`). */
const PLACEHOLDER_FILL = '#eeeeee';
const PLACEHOLDER_STROKE = '#9e9e9e';
const outline = (shape: ShapeModel) => rectPath(shape.bounds);
const NO_DEFAULTS = { fill: null, stroke: null };

/**
 * La forme telle que le placeholder la dessine : style gris en pointillés (attributs spatiaux
 * conservés, ex. `spatial.height`), nom de forme non reconnu sous le label.
 */
function asPlaceholder(shape: ShapeModel, ctx: RenderContext): ShapeModel {
  const spatial = Object.entries(shape.style).filter(([key]) => key.startsWith(SPATIAL_PREFIX));
  const style = {
    ...Object.fromEntries(spatial),
    fillColor: ctx.placeholder?.fill ?? PLACEHOLDER_FILL,
    strokeColor: ctx.placeholder?.stroke ?? PLACEHOLDER_STROKE,
    dashed: '1',
    fontColor: '#616161',
    fontSize: shape.style.fontSize ?? '11',
    whiteSpace: 'wrap',
  };
  const label = shape.label.trim() ? `${shape.label}\n[${shape.kind}]` : `[${shape.kind}]`;
  return { ...shape, style, label };
}

const block = isoBlock(outline, NO_DEFAULTS);

/**
 * Forme non supportée (SPEC §8.4) : rectangle gris aux dimensions de la forme, en pointillés,
 * avec le nom de forme non reconnu sous le label. En iso : le même rendu sur le dessus d'un bloc
 * gris aux arêtes en pointillés. En mini-carte : le même rectangle gris.
 */
export const placeholderShape: ShapeDefinition = {
  id: 'placeholder',
  outline,
  flat: { create: (shape, ctx) => createBox(asPlaceholder(shape, ctx), outline(shape), ctx, NO_DEFAULTS) },
  iso: { create: (shape, ctx) => block.create(asPlaceholder(shape, ctx), ctx) },
  minimap: (context, shape, map) => {
    const { x, y } = map.toMinimap(shape.bounds);
    context.fillStyle = map.colors?.placeholder ?? PLACEHOLDER_FILL;
    context.fillRect(x, y, Math.max(shape.bounds.width * map.scale, 1), Math.max(shape.bounds.height * map.scale, 1));
  },
};
