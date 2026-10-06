import { Color, Group } from 'three';
import type { Object3D } from 'three';
import type { EdgeLabelPlacement, EdgeModel, Point, RichLine, ShapeModel } from '../../model/types';
import { buildMarker } from '../edges/markers';
import { jumpHalfLength, jumpStyleOf, withJumps } from '../edges/jumps';
import type { JumpPoint } from '../edges/jumps';
import { curveThrough, labelPoint, roundCorners, shorten, unit } from '../edges/polyline';
import { parseStyle } from '../../format/style';
import { SPATIAL } from '../../spatial';
import { perimeterKind, routeEdgePoints, simplify } from '../edges/route';
import type { Terminal } from '../edges/route';
import { dashPattern, dashPolyline } from '../geometry/stroke';
import { edgeLines } from '../lines';
import { fadedStrokeMesh, fillMesh, strokeMesh } from '../meshes';
import { LINE_HEIGHT, approximateMeasure } from '../richLayout';
import { DEFAULT_EDGE_SPLIT, isSplit, splitLabelFrame, splitPieces } from './split';
import type { EdgeSplitSettings, SplitHover, SplitPiece } from './split';
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
    const split = isSplit(style);
    const jump = !split && jumpStyleOf(style, ctx.edgeJumps);
    const pieces = split
      ? []
      : jump
        ? withJumps(line, below, jump, jumpHalfLength(style, strokeWidth, ctx.edgeJumps), ctx.raisedJumps)
        : [line];
    const dash = dashPattern(style, strokeWidth);
    const { flat, raised } = splitRaised(pieces);
    for (const piece of flat) {
      const mesh = strokeMesh(piece, stroke, opacity, { width: strokeWidth, closed: false, dash });
      if (mesh) group.add(mesh);
    }
    // Sauts en relief (iso, 3D) : rubans face à la caméra, visibles sous tous les angles.
    if (raised.length > 0) {
      const lines = edgeLines(raised, { color: stroke, opacity, width: strokeWidth, ...(dash && { dash }) });
      lines.name = 'stroke';
      group.add(lines);
    }

    if (split) addSplitPieces(group, line, route, style, ctx, { stroke, opacity, strokeWidth, dash });

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
 * Tronçons d'une flèche coupée (`split=1`, ticket 219) : fondu vers le milieu, ou cadre de renvoi au bout. Leurs
 * tracés (`userData.splitPaths`) sont la zone de clic de la flèche quand elle n'est pas sélectionnée.
 */
function addSplitPieces(
  group: Group,
  line: Point[],
  route: Point[],
  style: Record<string, string>,
  ctx: RenderContext,
  trait: { stroke: Color; opacity: number; strokeWidth: number; dash: number[] | undefined },
): void {
  const settings = ctx.edgeSplit ?? DEFAULT_EDGE_SPLIT;
  const pieces = splitPieces(line, style, settings);
  group.userData.splitPaths = pieces.map((piece) => piece.points);
  const hover: SplitHover = {
    ends: [route[0]!, route[route.length - 1]!],
    pieces: [],
    frames: [],
    stroke: trait.stroke,
    opacity: trait.opacity,
    strokeWidth: trait.strokeWidth,
  };
  for (const piece of pieces) {
    const paths = trait.dash ? dashPolyline(piece.points, trait.dash, false) : [piece.points];
    const mesh = fadedStrokeMesh(paths, piece.alphaAt, trait.stroke, trait.opacity, trait.strokeWidth);
    if (mesh) group.add(mesh);
    hover.pieces.push({ paths, alphaAt: piece.alphaAt });
    if (piece.label) {
      const frame = splitLabel(piece, style, ctx, trait, settings);
      group.add(frame);
      hover.frames.push(frame.userData.corners as Point[]);
    }
  }
  // Survol (ticket 224) : de quoi dessiner les tronçons épaissis et la ligne directe (`splitHoverOverlay`).
  group.userData.splitHover = hover;
}

/** Cadre de renvoi d'un tronçon : rectangle au fond de la page, bordé de la couleur du trait, texte au centre. */
function splitLabel(
  piece: SplitPiece,
  style: Record<string, string>,
  ctx: RenderContext,
  trait: { stroke: Color; opacity: number; strokeWidth: number },
  { labelPadding: padding, labelSize: fontSize }: EdgeSplitSettings,
): Object3D {
  const text = piece.label!;
  const width = approximateMeasure(text, { size: fontSize, bold: false, italic: false }) + 2 * padding;
  const height = fontSize * LINE_HEIGHT + 2 * padding;
  const points = piece.points;
  const end = points[points.length - 1]!;
  const center = splitLabelFrame(end, unit(points[points.length - 2] ?? points[0]!, end), width, height);
  const corners: Point[] = [
    { x: center.x - width / 2, y: center.y - height / 2 },
    { x: center.x + width / 2, y: center.y - height / 2 },
    { x: center.x + width / 2, y: center.y + height / 2 },
    { x: center.x - width / 2, y: center.y + height / 2 },
  ];
  const frame = new Group();
  frame.name = 'split-label';
  frame.userData.corners = corners;
  frame.add(fillMesh(corners, new Color(ctx.background ?? PAGE_BACKGROUND), trait.opacity));
  const border = strokeMesh(corners, trait.stroke, trait.opacity, { width: trait.strokeWidth, closed: true });
  if (border) frame.add(border);
  const label = ctx.text.create({
    text,
    x: center.x,
    y: center.y,
    anchorX: 'center',
    anchorY: 'middle',
    align: 'center',
    fontSize,
    color: styleColor(style, 'fontColor', ctx.edgeFontColor ?? DEFAULT_EDGE_FONT_COLOR)!,
    opacity: styleOpacity(style, 'textOpacity'),
    bold: false,
  });
  label.renderOrder = PART_ORDER.label;
  frame.add(label);
  return frame;
}

/**
 * Sépare un tracé à sauts en polylignes dans le plan de la page et en segments levés (`[x0, y0, z0, x1, …]`) : un
 * segment est levé dès qu'un de ses bouts a une hauteur (saut en relief, ticket 146).
 */
function splitRaised(pieces: JumpPoint[][]): { flat: Point[][]; raised: number[] } {
  const flat: Point[][] = [];
  const raised: number[] = [];
  for (const piece of pieces) {
    let run: Point[] = [piece[0]!];
    for (let i = 1; i < piece.length; i++) {
      const a = piece[i - 1]!;
      const b = piece[i]!;
      if (!a.z && !b.z) {
        run.push(b);
        continue;
      }
      raised.push(a.x, a.y, a.z ?? 0, b.x, b.y, b.z ?? 0);
      if (run.length >= 2) flat.push(run);
      run = [b];
    }
    if (run.length >= 2) flat.push(run);
  }
  return { flat, raised };
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
  // Posé lettre par lettre le long du trait : attrapé lettre par lettre (pas dans sa boîte englobante).
  if (along) object.userData.alongPath = true;
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
