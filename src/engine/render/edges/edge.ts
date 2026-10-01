import { Group } from 'three';
import type { Object3D } from 'three';
import type { EdgeLabelPlacement, EdgeModel, Point, ShapeModel } from '../../model/types';
import { buildMarker } from '../edges/markers';
import { labelPoint, roundCorners, shorten, unit } from '../edges/polyline';
import { routeEdge } from '../edges/route';
import type { Terminal } from '../edges/route';
import { dashPattern } from '../geometry/stroke';
import { fillMesh, strokeMesh } from '../meshes';
import { PAGE_BACKGROUND, fontStyleBits, labelBackground, styleColor, styleNumber, styleOpacity } from '../styleValues';
import { PART_ORDER } from '../types';
import type { RenderContext } from '../types';

/** Défauts draw.io pour les arêtes. */
const DEFAULT_END_ARROW = 'classic';
const DEFAULT_MARKER_SIZE = 6;
/** `arcSize` par défaut des arêtes arrondies (diamètre). */
const DEFAULT_EDGE_ARC_SIZE = 20;

export interface EdgeTerminals {
  source?: ShapeModel;
  target?: ShapeModel;
}

/**
 * Connecteur : tracé, pointes de flèches et labels (SPEC §8.3). Les styles inconnus sont approchés ;
 * ils sont recensés par `diagnostics/unsupportedStyles`.
 */
export function createEdge(edge: EdgeModel, terminals: EdgeTerminals, ctx: RenderContext): Object3D {
  const group = new Group();
  group.name = `edge:${edge.id}`;
  const { style } = edge;

  const route = routeEdge({
    source: toTerminal(terminals.source),
    target: toTerminal(terminals.target),
    sourcePoint: edge.sourcePoint,
    targetPoint: edge.targetPoint,
    waypoints: edge.points,
    style,
  });
  // Tracé conservé pour la sélection au clic (interaction/pick).
  group.userData.route = route;
  if (route.length < 2) return group;

  const stroke = styleColor(style, 'strokeColor', '#000000');
  const strokeWidth = styleNumber(style, 'strokeWidth', 1);
  const opacity = styleOpacity(style, 'strokeOpacity');

  // Pointes de flèches : calculées sur le tracé brut, puis la ligne est raccourcie d'autant.
  const startType = style.startArrow ?? 'none';
  const endType = style.endArrow ?? DEFAULT_END_ARROW;
  const start = buildMarker(
    startType,
    route[0]!,
    unit(route[1]!, route[0]!),
    styleNumber(style, 'startSize', DEFAULT_MARKER_SIZE),
    strokeWidth,
    style.startFill !== '0',
  );
  const end = buildMarker(
    endType,
    route[route.length - 1]!,
    unit(route[route.length - 2]!, route[route.length - 1]!),
    styleNumber(style, 'endSize', DEFAULT_MARKER_SIZE),
    strokeWidth,
    style.endFill !== '0',
  );

  if (stroke && strokeWidth > 0) {
    let line = shorten(route, start?.inset ?? 0, end?.inset ?? 0);
    if (style.rounded === '1') line = roundCorners(line, styleNumber(style, 'arcSize', DEFAULT_EDGE_ARC_SIZE) / 2);
    const mesh = strokeMesh(line, stroke, opacity, {
      width: strokeWidth,
      closed: false,
      dash: dashPattern(style, strokeWidth),
    });
    if (mesh) group.add(mesh);

    for (const marker of [start, end]) {
      if (marker?.fill) group.add(fillMesh(marker.fill, stroke, opacity));
      if (marker?.outline) {
        const outline = strokeMesh(marker.outline.points, stroke, opacity, {
          width: strokeWidth,
          closed: marker.outline.closed,
        });
        if (outline) group.add(outline);
      }
    }
  }

  const main = createEdgeLabel(edge.label, route, edge.labelPlacement, style, ctx);
  if (main) group.add(main);
  for (const child of edge.labels) {
    const label = createEdgeLabel(child.label, route, child.placement, child.style, ctx);
    if (label) group.add(label);
  }

  return group;
}

function createEdgeLabel(
  text: string,
  route: Point[],
  placement: EdgeLabelPlacement,
  style: Record<string, string>,
  ctx: RenderContext,
): Object3D | null {
  if (!text.trim() || style.noLabel === '1') return null;
  const point = labelPoint(route, placement);
  const object = ctx.text.create({
    text,
    x: point.x,
    y: point.y,
    anchorX: 'center',
    anchorY: 'middle',
    align: style.align === 'left' || style.align === 'right' ? style.align : 'center',
    fontSize: styleNumber(style, 'fontSize', 11),
    color: styleColor(style, 'fontColor', '#000000')!,
    opacity: styleOpacity(style, 'textOpacity'),
    bold: fontStyleBits(style).bold,
    // Les labels d'arêtes draw.io ont un fond de la couleur de la page par défaut.
    background: labelBackground(style, PAGE_BACKGROUND),
  });
  object.name = 'label';
  object.renderOrder = PART_ORDER.label;
  return object;
}

function toTerminal(shape: ShapeModel | undefined): Terminal | undefined {
  if (!shape) return undefined;
  return { bounds: shape.bounds, perimeter: shape.kind === 'ellipse' ? 'ellipse' : 'rectangle' };
}
