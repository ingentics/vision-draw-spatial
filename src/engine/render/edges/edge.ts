import { Color, Group } from 'three';
import type { Object3D } from 'three';
import type { EdgeLabelPlacement, EdgeModel, Point, RichLine, ShapeModel } from '../../model/types';
import { buildMarker } from '../edges/markers';
import { jumpHalfLength, jumpStyleOf, withJumps } from '../edges/jumps';
import { curveThrough, labelPoint, roundCorners, shorten, unit } from '../edges/polyline';
import { parseStyle } from '../../format/style';
import { SPATIAL } from '../../spatial';
import { perimeterKind, routeEdgePoints, simplify } from '../edges/route';
import type { Terminal } from '../edges/route';
import { dashPattern } from '../geometry/stroke';
import { fillMesh, strokeMesh } from '../meshes';
import {
  DEFAULT_LABEL_BACKDROP,
  PAGE_BACKGROUND,
  labelBackground,
  styleColor,
  styleNumber,
  styleOpacity,
  textFormat,
} from '../styleValues';
import { PART_ORDER } from '../types';
import type { RenderContext } from '../types';
import type { TextAlong } from '../textPath';

/** Défauts draw.io pour les arêtes. */
const DEFAULT_END_ARROW = 'classic';
const DEFAULT_EDGE_FONT_COLOR = '#000000';
const DEFAULT_MARKER_SIZE = 6;
/** `arcSize` par défaut des arêtes arrondies (diamètre). */
const DEFAULT_EDGE_ARC_SIZE = 20;

export interface EdgeTerminals {
  source?: ShapeModel;
  target?: ShapeModel;
}

/**
 * Connecteur : tracé, pointes de flèches et labels (SPEC §8.3). Les styles inconnus sont approchés ;
 * ils sont recensés par `diagnostics/unsupportedStyles`. `below` : tracés des flèches dessinées avant celle-ci,
 * pour ses sauts aux croisements (`jumpStyle`, ticket 129).
 */
export function createEdge(
  edge: EdgeModel,
  terminals: EdgeTerminals,
  ctx: RenderContext,
  below: readonly Point[][] = [],
): Object3D {
  const group = new Group();
  group.name = `edge:${edge.id}`;
  const { style } = edge;

  const points = routeEdgePoints({
    source: toTerminal(terminals.source),
    target: toTerminal(terminals.target),
    sourcePoint: edge.sourcePoint,
    targetPoint: edge.targetPoint,
    waypoints: edge.points,
    style,
  });
  const route = simplify(points);
  // Tracé conservé pour placer les textes ; tracé brut pour les poignées des segments (edit/edgePoints) ;
  // trait dessiné (coudes arrondis, courbe) pour la sélection au clic (interaction/pick) et le voile.
  group.userData.route = route;
  group.userData.points = points;
  if (route.length < 2) return group;
  group.userData.path =
    style.curved === '1'
      ? curveThrough(route)
      : style.rounded === '1'
        ? roundCorners(route, styleNumber(style, 'arcSize', DEFAULT_EDGE_ARC_SIZE) / 2)
        : route;

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
    if (style.curved === '1') line = curveThrough(line);
    else if (style.rounded === '1') line = roundCorners(line, styleNumber(style, 'arcSize', DEFAULT_EDGE_ARC_SIZE) / 2);
    const jump = jumpStyleOf(style, ctx.edgeJumps);
    const pieces = jump ? withJumps(line, below, jump, jumpHalfLength(style, strokeWidth, ctx.edgeJumps)) : [line];
    for (const piece of pieces) {
      const mesh = strokeMesh(piece, stroke, opacity, {
        width: strokeWidth,
        closed: false,
        dash: dashPattern(style, strokeWidth),
      });
      if (mesh) group.add(mesh);
    }

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

  // Texte du milieu qui suit la flèche : posé lettre par lettre le long du trait dessiné.
  const along = middleTextAlong(edge, group.userData.path as Point[]);
  const main = createEdgeLabel(edge.id, edge.label, edge.rich, route, edge.labelPlacement, style, ctx, along);
  if (main) group.add(main);
  for (const child of edge.labels) {
    const label = createEdgeLabel(child.id, child.label, child.rich, route, child.placement, child.style, ctx);
    if (label) group.add(label);
  }

  return group;
}

/**
 * Texte du milieu qui suit sa flèche (`spatial.labelFollow=1`) : posé le long du trait dessiné `path`, à son
 * placement, glissé de `spatial.labelFollowShift` le long du trait. Undefined : texte horizontal.
 */
export function middleTextAlong(edge: EdgeModel, path: Point[] | undefined): TextAlong | undefined {
  if (edge.style[SPATIAL.labelFollow] !== '1' || !path || path.length < 2) return undefined;
  const shift = parseFloat(edge.style[SPATIAL.labelFollowShift] ?? '');
  return { path, ...edge.labelPlacement, ...(Number.isFinite(shift) && shift !== 0 && { shift }) };
}

function createEdgeLabel(
  cellId: string,
  text: string,
  rich: RichLine[] | undefined,
  route: Point[],
  placement: EdgeLabelPlacement,
  style: Record<string, string>,
  ctx: RenderContext,
  along?: TextAlong,
): Object3D | null {
  if (!text.trim() || style.noLabel === '1') return null;
  const point = labelPoint(route, placement);
  // Comme draw.io : aligné à gauche, le texte part du point vers la droite (le côté gauche est fixe) ;
  // à droite, l'inverse ; centré, de part et d'autre.
  const align = style.align === 'left' || style.align === 'right' ? style.align : 'center';
  const object = ctx.text.create({
    text,
    x: point.x,
    y: point.y,
    anchorX: align,
    // Même logique en hauteur : aligné en haut, le texte part du point vers le bas ; en bas, vers le haut.
    anchorY: style.verticalAlign === 'top' ? 'top' : style.verticalAlign === 'bottom' ? 'bottom' : 'middle',
    align,
    fontSize: styleNumber(style, 'fontSize', 11),
    // Sans `fontColor` : couleur par défaut du paramètre `shapes.edgeFontColor` (noir).
    color: styleColor(style, 'fontColor', ctx.edgeFontColor ?? DEFAULT_EDGE_FONT_COLOR)!,
    opacity: styleOpacity(style, 'textOpacity'),
    ...textFormat(style, rich),
    // Fond explicite (`labelBackgroundColor=#…`), sinon le paramètre : halo de la couleur de la page
    // autour de chaque lettre (lisible sur le trait, sans fond), fond uni, ou rien.
    ...edgeLabelBackdrop(style, ctx),
    ...(along && { along }),
  });
  object.name = 'label';
  // Cellule qui porte le texte (l'arête, ou le label enfant) : masqué pendant l'édition en place.
  object.userData.labelCellId = cellId;
  // Point d'ancrage (espace page) : pivot du texte quand un mode le redresse face à la caméra.
  object.userData.labelAnchor = point;
  object.renderOrder = PART_ORDER.label;
  return object;
}

/** Fond explicite d'un texte de flèche, sinon celui du paramètre (halo par défaut). */
function edgeLabelBackdrop(style: Record<string, string>, ctx: RenderContext) {
  const explicit = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(style.labelBackgroundColor?.trim() ?? '');
  if (explicit) return { background: labelBackground(style, null, ctx.background) };
  const page = new Color(ctx.background ?? PAGE_BACKGROUND);
  const { kind, haloWidth, haloBlur } = ctx.edgeLabelBackdrop ?? DEFAULT_LABEL_BACKDROP;
  if (kind === 'solid') return { background: page };
  return kind === 'halo' ? { halo: { color: page, width: haloWidth, blur: haloBlur } } : {};
}

export function toTerminal(shape: ShapeModel | undefined): Terminal | undefined {
  if (!shape) return undefined;
  return {
    bounds: shape.bounds,
    perimeter: perimeterKind(shape.style, parseStyle(shape.raw?.styleString).names),
    style: shape.style,
    id: shape.id,
  };
}
