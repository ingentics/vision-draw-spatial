import { Color } from 'three';
import type { Group } from 'three';
import {
  createBox,
  fillMesh,
  isoBlock,
  PART_ORDER,
  rectPath,
  SPATIAL_PREFIX,
  strokeMesh,
  TOP_OFFSET,
} from '../../../../core/plugins';
import type {
  LibraryShapeState,
  Point,
  Rect,
  RenderContext,
  ShapeDefinition,
  ShapeModel,
} from '../../../../core/plugins';

/**
 * Forme posée depuis une bibliothèque qui n'est pas chargée (sujet 530) : rectangle de ses bornes, hachuré, bordé de
 * tirets longs, son texte, et un badge dans le coin haut-droit (pièce de puzzle ; avertissement si l'hôte a déclaré la
 * bibliothèque introuvable). Distinct du placeholder des formes non supportées.
 */

/** Couleurs par défaut (paramètres `shapes.unloadedFill` / `unloadedStroke`). */
const UNLOADED_FILL = '#eef2f7';
const UNLOADED_STROKE = '#5b7db1';
/** Bordure et badge d'une forme introuvable. */
const UNAVAILABLE_COLOR = '#d97706';
/** Écart des hachures (à 45°), en px de page. */
const HATCH_SPACING = 8;
const HATCH_OPACITY = 0.35;
/** Côté du badge et marge au coin, en px de page. */
const BADGE_SIZE = 16;
const BADGE_MARGIN = 4;
const NO_DEFAULTS = { fill: null, stroke: null };

const outline = (shape: ShapeModel) => rectPath(shape.bounds);

/** La forme telle qu'elle est dessinée : style de la forme non chargée (attributs spatiaux conservés : hauteur…). */
function asUnloaded(shape: ShapeModel, ctx: RenderContext, state: Exclude<LibraryShapeState, 'loaded'>): ShapeModel {
  const spatial = Object.entries(shape.style).filter(([key]) => key.startsWith(SPATIAL_PREFIX));
  const style = {
    ...Object.fromEntries(spatial),
    fillColor: ctx.unloaded?.fill ?? UNLOADED_FILL,
    strokeColor: strokeOf(ctx, state),
    dashed: '1',
    dashPattern: '8 4',
    fontColor: '#333333',
    fontSize: shape.style.fontSize ?? '12',
    whiteSpace: 'wrap',
  };
  return { ...shape, style };
}

function strokeOf(ctx: RenderContext, state: Exclude<LibraryShapeState, 'loaded'>): string {
  return state === 'unavailable' ? UNAVAILABLE_COLOR : (ctx.unloaded?.stroke ?? UNLOADED_STROKE);
}

/** Hachures à 45° (du bas-gauche vers le haut-droit) coupées aux bornes. */
export function hatchLines(bounds: Rect, spacing: number): [Point, Point][] {
  const { x, y, width: w, height: h } = bounds;
  const lines: [Point, Point][] = [];
  for (let t = spacing; t < w + h; t += spacing) {
    const from = Math.max(0, t - h);
    const to = Math.min(w, t);
    if (to - from <= 0) continue;
    lines.push([
      { x: x + from, y: y + t - from },
      { x: x + to, y: y + t - to },
    ]);
  }
  return lines;
}

/** Arc de cercle de `from` à `to` (radians, repère page : y vers le bas), points compris. */
function arc(cx: number, cy: number, r: number, from: number, to: number): Point[] {
  const steps = 8;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

/** Pièce de puzzle dans un carré de 16 : corps, tenon en haut et à droite. */
const PUZZLE: Point[] = [
  { x: 1, y: 4 },
  ...arc(6.5, 4, 2, Math.PI, 2 * Math.PI),
  { x: 12, y: 4 },
  ...arc(12, 9.5, 2, -Math.PI / 2, Math.PI / 2),
  { x: 12, y: 15 },
  { x: 1, y: 15 },
];
/** Triangle d'avertissement dans un carré de 16, et son point d'exclamation (barre, point). */
const WARNING: Point[] = [
  { x: 8, y: 1 },
  { x: 15.5, y: 15 },
  { x: 0.5, y: 15 },
];
const EXCLAMATION: Point[][] = [
  [
    { x: 7.2, y: 5.5 },
    { x: 8.8, y: 5.5 },
    { x: 8.5, y: 10.5 },
    { x: 7.5, y: 10.5 },
  ],
  [
    { x: 7.2, y: 12 },
    { x: 8.8, y: 12 },
    { x: 8.8, y: 13.6 },
    { x: 7.2, y: 13.6 },
  ],
];

/** Hachures et badge, posés à la hauteur `z` (le sol à plat, le dessus du bloc en volume). */
function addMarks(
  group: Group,
  shape: ShapeModel,
  ctx: RenderContext,
  state: Exclude<LibraryShapeState, 'loaded'>,
  z: number,
): void {
  const stroke = new Color(strokeOf(ctx, state));
  for (const line of hatchLines(shape.bounds, HATCH_SPACING)) {
    const mesh = strokeMesh(line, stroke, HATCH_OPACITY, { width: 1, closed: false });
    if (!mesh) continue;
    mesh.name = 'unloaded-hatch';
    mesh.renderOrder = PART_ORDER.stroke;
    mesh.position.z = z;
    group.add(mesh);
  }
  const { bounds } = shape;
  // Badge réduit dans une forme plus petite que lui.
  const size = Math.min(BADGE_SIZE, bounds.width - 2 * BADGE_MARGIN, bounds.height - 2 * BADGE_MARGIN);
  if (size <= 0) return;
  const origin = { x: bounds.x + bounds.width - BADGE_MARGIN - size, y: bounds.y + BADGE_MARGIN };
  const place = (points: Point[]) =>
    points.map((p) => ({ x: origin.x + (p.x * size) / BADGE_SIZE, y: origin.y + (p.y * size) / BADGE_SIZE }));
  const parts: [Point[], Color][] =
    state === 'unavailable'
      ? [[place(WARNING), stroke], ...EXCLAMATION.map((path): [Point[], Color] => [place(path), new Color('#ffffff')])]
      : [[place(PUZZLE), stroke]];
  for (const [path, color] of parts) {
    const mesh = fillMesh(path, color, 1);
    mesh.name = 'unloaded-badge';
    mesh.renderOrder = PART_ORDER.stroke;
    mesh.position.z = z;
    group.add(mesh);
  }
}

const block = isoBlock(outline, NO_DEFAULTS);

export function unloadedShape(state: Exclude<LibraryShapeState, 'loaded'>): ShapeDefinition {
  return {
    id: state === 'unavailable' ? 'library-unavailable' : 'library-unloaded',
    outline,
    flat: {
      create: (shape, ctx) => {
        const group = createBox(asUnloaded(shape, ctx, state), outline(shape), ctx, NO_DEFAULTS);
        addMarks(group, shape, ctx, state, 0);
        return group;
      },
    },
    iso: {
      create: (shape, ctx) => {
        const group = block.create(asUnloaded(shape, ctx, state), ctx) as Group;
        const height = group.userData.height as number | undefined;
        addMarks(group, shape, ctx, state, height === undefined ? 0 : height + TOP_OFFSET);
        return group;
      },
    },
    minimap: (brush, shape, map) => {
      const corners = rectPath(shape.bounds).map(map.toMinimap);
      brush.polygon(corners, { fill: map.colors?.unloaded ?? UNLOADED_FILL, stroke: UNLOADED_STROKE });
    },
  };
}
