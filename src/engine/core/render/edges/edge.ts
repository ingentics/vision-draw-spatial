import { Color, Group } from 'three';
import type { Object3D } from 'three';
import type { EdgeLabelPlacement, EdgeModel, Point, RichLine, ShapeModel } from '../../model/types';
import { buildMarker } from './markers';
import type { MarkerShape } from './markers';
import { jumpHalfLength, jumpStyleOf, withJumps } from './jumps';
import type { JumpPoint } from './jumps';
import { curveThrough, labelPoint, roundCorners, shorten } from './polyline';
import { SPATIAL } from '../../spatial';
import { routeEdgePoints, simplify } from './route';
import { toTerminal } from './terminal';
import { dashPattern, dashPolyline } from '../geometry/stroke';
import { edgeLines } from '../lines';
import { fadedStrokeMesh, fillMesh, strokeMesh } from '../meshes';
import { LINE_HEIGHT, approximateMeasure } from '../richLayout';
import { DEFAULT_EDGE_SPLIT, isSplit, splitLabelFrame, splitPieces } from './split';
import type { EdgeSplitSettings, SplitHover, SplitPiece } from './split';
import { styleNumber, styleOpacity, textFormat, styleFlag } from '../../model/styleValues';
import { PAGE_BACKGROUND, labelBackdropOf, styleColor } from '../styleColors';
import { labelObject, textAnchors } from '../flat/box';
import type { RenderContext } from '../types';
import type { TextAlong } from '../textPath';
import { direction, rectPath } from '../../model/geometry';
import { blockArrowOutline, isBlockArrow } from './blockArrow';

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
  // Tracé conservé pour placer les textes ; tracé brut pour les poignées des segments (edit/edgePointEdits) ;
  // trait dessiné (coudes arrondis, courbe) pour la sélection au clic (interaction/pick) et le voile.
  group.userData.route = route;
  group.userData.points = points;
  if (route.length < 2) return group;
  group.userData.path = drawnLine(route, style);

  const stroke = styleColor(style, 'strokeColor', '#000000');
  const strokeWidth = styleNumber(style, 'strokeWidth', 1);
  const opacity = styleOpacity(style, 'strokeOpacity');
  if (isBlockArrow(style)) addBlockArrow(group, route, stroke, opacity);
  else if (stroke && strokeWidth > 0)
    addEdgeStroke(group, route, edgeMarkers(route, style, strokeWidth), style, ctx, below, {
      stroke,
      opacity,
      strokeWidth,
    });

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
 * Flèche pleine (sujet 410) : un polygone rempli de la couleur du trait, de la queue à la pointe. Son contour fermé
 * remplace le trait dessiné : clic le long du bord (pas seulement sur l'axe) et voile percé autour de la silhouette.
 */
function addBlockArrow(group: Group, route: Point[], color: Color | null, opacity: number): void {
  const outline = blockArrowOutline(route[0]!, route[route.length - 1]!);
  if (outline.length === 0) return;
  group.userData.path = [...outline, outline[0]!];
  if (color) group.add(fillMesh(outline, color, opacity));
}

/** Trait dessiné d'un tracé : courbe (`curved`), coudes arrondis (`rounded`, rayon `arcSize / 2`) ou tel quel. */
function drawnLine(line: Point[], style: Record<string, string>): Point[] {
  if (styleFlag(style, 'curved')) return curveThrough(line);
  if (styleFlag(style, 'rounded')) return roundCorners(line, styleNumber(style, 'arcSize', DEFAULT_EDGE_ARC_SIZE) / 2);
  return line;
}

type EdgeMarker = MarkerShape | undefined;

/** Pointes de flèches : calculées sur le tracé brut (la ligne est ensuite raccourcie d'autant). */
function edgeMarkers(
  route: Point[],
  style: Record<string, string>,
  strokeWidth: number,
): { start: EdgeMarker; end: EdgeMarker } {
  const start = buildMarker(
    style.startArrow ?? 'none',
    route[0]!,
    direction(route[1]!, route[0]!),
    styleNumber(style, 'startSize', DEFAULT_MARKER_SIZE),
    strokeWidth,
    style.startFill !== '0',
  );
  const end = buildMarker(
    style.endArrow ?? DEFAULT_END_ARROW,
    route[route.length - 1]!,
    direction(route[route.length - 2]!, route[route.length - 1]!),
    styleNumber(style, 'endSize', DEFAULT_MARKER_SIZE),
    strokeWidth,
    style.endFill !== '0',
  );
  return { start, end };
}

/** Trait de la flèche (sauts aux croisements, tronçons d'une flèche coupée) et ses pointes. */
function addEdgeStroke(
  group: Group,
  route: Point[],
  { start, end }: { start: EdgeMarker; end: EdgeMarker },
  style: Record<string, string>,
  ctx: RenderContext,
  below: readonly Point[][],
  trait: { stroke: Color; opacity: number; strokeWidth: number },
): void {
  const { stroke, opacity, strokeWidth } = trait;
  const line = drawnLine(shorten(route, start?.inset ?? 0, end?.inset ?? 0), style);
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

  if (split) addSplitPieces(group, line, style, ctx, { ...trait, dash });

  for (const marker of [start, end]) {
    if (marker?.fill) group.add(fillMesh(marker.fill, stroke, opacity));
    if (marker?.outline) {
      const outline = strokeMesh(marker.outline.points, stroke, opacity, {
        width: strokeWidth,
        closed: marker.outline.closed,
      });
      if (outline) group.add(outline);
    }
    for (const piece of marker?.strokes ?? []) {
      const mesh = strokeMesh(piece.points, stroke, opacity, { width: strokeWidth, closed: piece.closed });
      if (mesh) group.add(mesh);
    }
  }
}

/**
 * Tronçons d'une flèche coupée (`split=1`, ticket 219) : fondu vers le milieu, ou cadre de renvoi au bout. Leurs
 * tracés (`userData.splitPaths`) sont la zone de clic de la flèche quand elle n'est pas sélectionnée.
 */
function addSplitPieces(
  group: Group,
  line: Point[],
  style: Record<string, string>,
  ctx: RenderContext,
  trait: { stroke: Color; opacity: number; strokeWidth: number; dash: number[] | undefined },
): void {
  const settings = ctx.edgeSplit ?? DEFAULT_EDGE_SPLIT;
  const pieces = splitPieces(line, style, settings);
  group.userData.splitPaths = pieces.map((piece) => piece.points);
  const hover: SplitHover = {
    ends: [],
    pieces: [],
    frames: [],
    stroke: trait.stroke,
    opacity: trait.opacity,
    strokeWidth: trait.strokeWidth,
  };
  // Bout coupé de chaque tronçon, ou son cadre de renvoi : départ de la ligne directe (ticket 225).
  const cuts: Array<{ end: Point; box?: { center: Point; width: number; height: number } }> = [];
  for (const piece of pieces) {
    const paths = trait.dash ? dashPolyline(piece.points, trait.dash, false) : [piece.points];
    const mesh = fadedStrokeMesh(paths, piece.alphaAt, trait.stroke, trait.opacity, trait.strokeWidth);
    if (mesh) group.add(mesh);
    hover.pieces.push({ paths, alphaAt: piece.alphaAt });
    const frame = piece.label ? splitLabel(piece, style, ctx, trait, settings) : undefined;
    if (frame) {
      group.add(frame);
      hover.frames.push(frame.userData.corners as Point[]);
    }
    const box = frame?.userData.box as { center: Point; width: number; height: number } | undefined;
    cuts.push({ end: piece.points[piece.points.length - 1]!, ...(box && { box }) });
  }
  // Ligne directe entre les deux bouts coupés ; avec un cadre, depuis son bord tourné vers l'autre bout (ticket 225).
  if (cuts.length === 2) {
    const aim = (cut: (typeof cuts)[number]) => cut.box?.center ?? cut.end;
    hover.ends = cuts.map((cut, i) => {
      if (!cut.box) return cut.end;
      const { center, width, height } = cut.box;
      return splitLabelFrame(center, direction(center, aim(cuts[1 - i]!)), width, height);
    });
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
  const center = splitLabelFrame(end, direction(points[points.length - 2] ?? points[0]!, end), width, height);
  const corners = rectPath({ x: center.x - width / 2, y: center.y - height / 2, width, height });
  const frame = new Group();
  frame.name = 'split-label';
  frame.userData.corners = corners;
  frame.userData.box = { center, width, height };
  frame.add(fillMesh(corners, new Color(ctx.background ?? PAGE_BACKGROUND), trait.opacity));
  const border = strokeMesh(corners, trait.stroke, trait.opacity, { width: trait.strokeWidth, closed: true });
  if (border) frame.add(border);
  frame.add(
    labelObject(ctx, {
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
    }),
  );
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
  if (!styleFlag(edge.style, SPATIAL.labelFollow) || !path || path.length < 2) return undefined;
  const shift = styleNumber(edge.style, SPATIAL.labelFollowShift, 0);
  return { path, ...edge.labelPlacement, ...(shift !== 0 && { shift }) };
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
  if (!text.trim() || styleFlag(style, 'noLabel')) return null;
  const point = labelPoint(route, placement);
  // Comme draw.io : aligné à gauche, le texte part du point vers la droite (le côté gauche est fixe) ; à droite,
  // l'inverse ; centré, de part et d'autre. Même logique en hauteur : aligné en haut, il part du point vers le bas.
  const { anchorX, anchorY } = textAnchors(style);
  // Fond explicite (`labelBackgroundColor=#…`), sinon le paramètre : halo de la couleur de la page
  // autour de chaque lettre (lisible sur le trait, sans fond), fond uni, ou rien.
  const backdrop = labelBackdropOf(style, true, ctx.edgeLabelBackdrop, ctx.background);
  // Cellule qui porte le texte (l'arête, ou le label enfant) : masqué pendant l'édition en place.
  const object = labelObject(
    ctx,
    {
      text,
      x: point.x,
      y: point.y,
      anchorX,
      anchorY,
      align: anchorX,
      fontSize: styleNumber(style, 'fontSize', 11),
      // Sans `fontColor` : couleur par défaut du paramètre `shapes.edgeFontColor` (noir).
      color: styleColor(style, 'fontColor', ctx.edgeFontColor ?? DEFAULT_EDGE_FONT_COLOR)!,
      opacity: styleOpacity(style, 'textOpacity'),
      ...textFormat(style, rich),
      ...(backdrop.background && { background: new Color(backdrop.background) }),
      ...(backdrop.halo && { halo: { ...backdrop.halo, color: new Color(backdrop.halo.color) } }),
      ...(along && { along }),
    },
    cellId,
  );
  // Point d'ancrage (espace page) : pivot du texte quand un mode le redresse face à la caméra.
  object.userData.labelAnchor = point;
  // Posé lettre par lettre le long du trait : attrapé lettre par lettre (pas dans sa boîte englobante).
  if (along) object.userData.alongPath = true;
  return object;
}
