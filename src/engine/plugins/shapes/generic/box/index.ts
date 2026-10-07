import { Color, Group } from 'three';
import {
  PART_ORDER,
  TOP_OFFSET,
  VERTEX_DEFAULTS,
  createBox,
  createLabel,
  dashPattern,
  fillMesh,
  flatBox,
  isoBlock,
  polygonArc,
  roundedPolygon,
  strokeMesh,
  styleColor,
  styleFlag,
  styleNumber,
  styleOpacity,
} from '../../../../core/plugins';
import type {
  BoxDefaults,
  Point,
  Rect,
  RenderContext,
  SceneRenderer,
  ShapeDefinition,
  ShapeDetail,
  ShapeDetailPath,
  ShapeDetailText,
  ShapeModel,
} from '../../../../core/plugins';

export interface BoxOptions {
  defaults?: BoxDefaults;
  volume?: boolean;
  roundable?: boolean;
  /** Dessin intérieur, tracé par-dessus le fond (2D) ou sur le dessus du bloc (iso). */
  details?: (shape: ShapeModel) => ShapeDetail[];
  /** Zone du texte en 2D (en iso, le dessus entier) ; absent = les bornes. */
  label?: (shape: ShapeModel) => Rect;
}

/**
 * Boîte générique : une forme entièrement décrite par son contour au sol. Rendu 2D (fond, bordure, label) et, en
 * iso, prisme du contour (repli à plat sans fond). Une forme l'étend : `{ ...box(outline), id, … }`.
 *
 * `roundable` : polygone que draw.io sait arrondir (`rounded=1`, rayon `arcSize / 2`, `mxShape.addPoints`) ; le
 * contour arrondi sert alors partout (2D, volume, clic, mini-carte), et le panneau propose « Coins arrondis ».
 */
export function box(
  outline: (shape: ShapeModel) => Point[],
  options: BoxOptions = {},
): Pick<ShapeDefinition, 'outline' | 'details' | 'flat' | 'iso' | 'properties' | 'textZone'> {
  const path = options.roundable
    ? (shape: ShapeModel) => {
        const points = outline(shape);
        return styleFlag(shape.style, 'rounded') ? roundedPolygon(points, polygonArc(shape.style)) : points;
      }
    : outline;
  const defaults = options.defaults ?? VERTEX_DEFAULTS;
  const { details, label } = options;
  return {
    outline: path,
    ...(details ? { details } : {}),
    flat: details || label ? detailedFlat(path, defaults, details, label) : flatBox(path, options.defaults),
    ...(options.volume === false
      ? {}
      : { iso: details ? detailedIso(path, defaults, details) : isoBlock(path, options.defaults) }),
    ...(label ? { textZone: (shape, level) => (level === 'flat' ? label(shape) : shape.bounds) } : {}),
    ...(options.roundable
      ? { properties: [{ type: 'toggle', key: 'rounded', label: 'Coins arrondis', section: 'border' }] }
      : {}),
  };
}

function detailedFlat(
  outline: (shape: ShapeModel) => Point[],
  defaults: BoxDefaults,
  details?: (shape: ShapeModel) => ShapeDetail[],
  label?: (shape: ShapeModel) => Rect,
): SceneRenderer {
  return {
    create(shape: ShapeModel, ctx: RenderContext) {
      const group = createBox(label ? { ...shape, label: '' } : shape, outline(shape), ctx, defaults);
      if (details) addDetails(group, shape, details(shape), 0, 0, defaults, ctx);
      if (label) {
        const text = createLabel(shape, ctx, shape.label, label(shape));
        if (text) group.add(text);
      }
      return group;
    },
  };
}

/** Prisme du contour (`isoBlock`), dessin intérieur sur le dessus ; à plat, comme en 2D, sans fond. */
function detailedIso(
  outline: (shape: ShapeModel) => Point[],
  defaults: BoxDefaults,
  details: (shape: ShapeModel) => ShapeDetail[],
): SceneRenderer {
  const block = isoBlock(outline, defaults);
  return {
    create(shape, ctx) {
      const group = block.create(shape, ctx) as Group;
      const height = group.userData.height as number | undefined;
      if (height === undefined) addDetails(group, shape, details(shape), 0, 0, defaults, ctx);
      else addDetails(group, shape, details(shape), height + TOP_OFFSET, TOP_OFFSET, defaults, ctx);
      return group;
    },
  };
}

function addDetails(
  group: Group,
  shape: ShapeModel,
  details: ShapeDetail[],
  top: number,
  ground: number,
  defaults: BoxDefaults,
  ctx: RenderContext,
): void {
  for (const detail of details) {
    const z = detail.ground ? ground : top;
    if ('text' in detail) addText(group, detail, z, ctx);
    else addPath(group, shape, detail, z, defaults);
  }
}

function addPath(group: Group, shape: ShapeModel, detail: ShapeDetailPath, z: number, defaults: BoxDefaults): void {
  const { style } = shape;
  const fill = styleColor(style, 'fillColor', defaults.fill);
  if (detail.filled && fill) {
    const mesh = fillMesh(detail.path, fill, styleOpacity(style, 'fillOpacity'));
    mesh.name = 'fill-detail';
    mesh.position.z = z;
    group.add(mesh);
  }
  const stroke = styleColor(style, 'strokeColor', defaults.stroke);
  const width = styleNumber(style, 'strokeWidth', 1);
  if (!stroke || width <= 0) return;
  const mesh = strokeMesh(detail.path, stroke, styleOpacity(style, 'strokeOpacity'), {
    width,
    closed: detail.closed,
    dash: dashPattern(style, width),
  });
  if (!mesh) return;
  mesh.name = 'stroke-detail';
  mesh.renderOrder = PART_ORDER.stroke;
  mesh.position.z = z;
  group.add(mesh);
}

/** Texte posé à plat, tourné autour de son centre dans la direction d'écriture. */
function addText(group: Group, detail: ShapeDetailText, z: number, ctx: RenderContext): void {
  const text = ctx.text.create({
    text: detail.text,
    x: 0,
    y: 0,
    anchorX: 'center',
    anchorY: 'middle',
    align: 'center',
    fontSize: detail.fontSize,
    color: new Color(detail.color),
    opacity: 1,
    bold: detail.bold ?? false,
    fit: detail.fit,
  });
  text.renderOrder = PART_ORDER.label;
  const frame = new Group();
  frame.name = 'text-detail';
  frame.position.set(detail.at.x, detail.at.y, z);
  frame.rotation.z = detail.angle;
  frame.add(text);
  group.add(frame);
}
