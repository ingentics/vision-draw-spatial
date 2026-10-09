import { Group } from 'three';
import type { Object3D } from 'three';
import type { Point, Rect } from '../../model/types';
import type { ReadonlyShapeModel as ShapeModel } from '../../model/readonly';
import { labelInsets, outsideLabelBox } from '../labelPosition';
import { fillMesh, strokeMesh } from '../meshes';
import { textFormat, styleNumber, styleOpacity, styleFlag } from '../../model/styleValues';
import { labelBackground, styleColor, styleStroke } from '../styleColors';
import { truncateLines } from '../textTruncate';
import { PART_ORDER } from '../types';
import type { RenderContext, TextSpec } from '../types';
import type { SceneRenderer } from '../../shapes/types';

/**
 * Rendu à plat (niveau `flat`) des formes « boîte » : remplissage + bordure suivant le contour
 * de la forme, puis label. Les définitions de formes ne fournissent que le contour et les
 * couleurs par défaut.
 */

export interface BoxDefaults {
  fill: string | null;
  stroke: string | null;
}

export const VERTEX_DEFAULTS: BoxDefaults = { fill: '#ffffff', stroke: '#000000' };

/** Rendu à plat d'une forme définie par son contour. */
export function flatBox(
  outline: (shape: ShapeModel) => Point[],
  defaults: BoxDefaults = VERTEX_DEFAULTS,
): SceneRenderer {
  return { create: (shape, ctx) => createBox(shape, outline(shape), ctx, defaults) };
}

export function createBox(shape: ShapeModel, path: Point[], ctx: RenderContext, defaults: BoxDefaults): Group {
  const group = new Group();
  const { style } = shape;

  const fill = styleColor(style, 'fillColor', defaults.fill);
  if (fill) group.add(fillMesh(path, fill, styleOpacity(style, 'fillOpacity')));

  const stroke = styleStroke(style, defaults.stroke);
  if (stroke) {
    const mesh = strokeMesh(path, stroke.color, stroke.opacity, {
      width: stroke.width,
      closed: true,
      dash: stroke.dash,
    });
    if (mesh) group.add(mesh);
  }

  const label = createLabel(shape, ctx);
  if (label) group.add(label);
  return group;
}

/** Options de `createLabel` (sujet 331). */
export interface LabelOptions {
  /** Police à chasse fixe (police de code). */
  monospace?: boolean;
  /**
   * Texte tronqué à `zone`, sans retour automatique : ligne trop large ou lignes en trop finissent par « … »
   * (`truncateLines`).
   */
  truncate?: boolean;
}

/**
 * Label d'une forme, placé dans sa zone de texte (`zone`, les bornes par défaut) selon `align` / `verticalAlign`
 * (SPEC §8.3 : centré par défaut). Un label hors de la forme (`labelPosition`, `verticalLabelPosition`) se place
 * à côté des bornes, comme dans draw.io, quelle que soit la zone propre à la forme.
 */
export function createLabel(
  shape: ShapeModel,
  ctx: RenderContext,
  text = shape.label,
  zone: Rect = shape.bounds,
  options: LabelOptions = {},
) {
  if (!text.trim() || styleFlag(shape.style, 'noLabel')) return null;
  const { style } = shape;
  const outside = outsideLabelBox(shape.bounds, style);
  const bounds = outside ?? zone;

  const { anchorX: align, anchorY: vertical } = textAnchors(style);

  const insets = labelInsets(style);
  const left = bounds.x + insets.left;
  const right = bounds.x + bounds.width - insets.right;
  const top = bounds.y + insets.top;
  const bottom = bounds.y + bounds.height - insets.bottom;

  const format = textFormat(style, text === shape.label ? shape.rich : undefined);
  const fontFamily = options.monospace ? 'Courier New' : format.fontFamily;
  const fontSize = styleNumber(style, 'fontSize', 11);
  const shown = options.truncate
    ? truncateLines(
        text,
        Math.max(right - left, 0),
        Math.max(bottom - top, 0),
        { size: fontSize, bold: format.bold, italic: format.italic ?? false, family: fontFamily },
        ctx.measureText,
      )
    : text;

  const spec: TextSpec = {
    text: shown,
    x: align === 'left' ? left : align === 'right' ? right : (left + right) / 2,
    y: vertical === 'top' ? top : vertical === 'bottom' ? bottom : (top + bottom) / 2,
    anchorX: align,
    anchorY: vertical,
    align,
    fontSize,
    color: styleColor(style, 'fontColor', '#000000')!,
    opacity: styleOpacity(style, 'textOpacity'),
    ...format,
    ...(fontFamily !== undefined && { fontFamily }),
    // Tronqué : pas de retour automatique ni de rich (le texte coupé remplace le texte riche).
    ...(options.truncate && { rich: undefined }),
    maxWidth: style.whiteSpace === 'wrap' && !options.truncate ? Math.max(right - left, 1) : undefined,
    fit: styleFlag(style, 'fitText')
      ? { width: Math.max(right - left, 0), height: Math.max(bottom - top, 0) }
      : undefined,
    background: labelBackground(style, null, ctx.background),
  };
  const object = labelObject(ctx, spec, shape.id);
  // Hors de la forme : posé au sol à côté du volume en iso (`createShapeObject`).
  if (outside) object.userData.outsideLabel = true;
  return object;
}

/**
 * Ancrages d'un texte selon `align` / `verticalAlign` (centré par défaut, SPEC §8.3) : commun au label d'une forme
 * (posé dans sa zone) et au texte d'une flèche (posé autour de son point).
 */
export function textAnchors(style: Record<string, string>): {
  anchorX: TextSpec['align'];
  anchorY: 'top' | 'middle' | 'bottom';
} {
  return {
    anchorX: style.align === 'left' || style.align === 'right' ? style.align : 'center',
    anchorY: style.verticalAlign === 'top' ? 'top' : style.verticalAlign === 'bottom' ? 'bottom' : 'middle',
  };
}

/**
 * Objet texte d'une cellule : `cellId` est la cellule qui porte le texte, dont l'éditeur en place masque ce label
 * pendant la saisie. Commun au label d'une forme et à celui qu'une forme place elle-même (ex. nom d'une région). Sans
 * `cellId`, texte qu'aucune cellule ne porte (ex. cadre de renvoi d'une flèche coupée) : ni édité en place, ni cliqué
 * comme un label.
 */
export function labelObject(ctx: RenderContext, spec: TextSpec, cellId?: string): Object3D {
  const object = ctx.text.create(spec);
  object.name = 'label';
  if (cellId !== undefined) object.userData.labelCellId = cellId;
  object.renderOrder = PART_ORDER.label;
  return object;
}
