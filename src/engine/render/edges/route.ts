import type { Point, Rect } from '../../model/types';

/**
 * Calcul du tracé d'une arête (SPEC §8.3), **porté de draw.io** (`mxEdgeStyle`,
 * `mxGraphView.updateEdgeState`, `mxPerimeter`, version embarquée par draw.io 24.7.5) pour qu'une flèche
 * s'affiche ici exactement comme dans draw.io, et qu'un point posé ici y reste au même endroit.
 * Vérifié contre l'export SVG de draw.io (fixtures `edge-routing.drawio`, `edge-ends.drawio`).
 *
 * Code d'origine : mxGraph, Copyright (c) 2006-2015, JGraph Ltd, sous licence Apache 2.0
 * (https://www.apache.org/licenses/LICENSE-2.0) ; traduit en TypeScript et adapté au modèle du moteur.
 *
 * draw.io n'enregistre que les choix de l'utilisateur (points d'attache, points intermédiaires,
 * extrémités libres) ; le tracé est recalculé, en trois temps :
 * 1. bouts **fixes** : point d'attache imposé (`exitX`…, projeté sur le contour) ou extrémité libre ;
 * 2. **routeur** du style (`edgeStyle`) : points intermédiaires du tracé ;
 * 3. bouts **flottants** : contour de la forme, visé depuis le point voisin (la cible d'abord).
 *
 * Non repris : rotation des formes, ports (`sourcePort`), bornes de stencils à proportions fixes,
 * géométries relatives (ports) dans `entityRelationEdgeStyle`.
 */

export interface Terminal {
  bounds: Rect;
  /** Contour : ellipse ou rectangle (défaut). */
  perimeter: 'rectangle' | 'ellipse';
  /** Style de la forme (`portConstraint`, `perimeterSpacing`, `routingCenterX`…, `flipH` / `flipV`). */
  style?: Record<string, string>;
  /** Identifiant de la forme : une boucle relie une forme à elle-même. */
  id?: string;
}

/** Point d'attache imposé (`exitX`/`exitY`, `entryX`/`entryY`), relatif aux bornes de la forme. */
export interface Constraint {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export interface RouteInput {
  source?: Terminal;
  target?: Terminal;
  /** Extrémités libres, utilisées en l'absence de forme. */
  sourcePoint?: Point;
  targetPoint?: Point;
  waypoints: Point[];
  style: Record<string, string>;
}

export type RoutingKind =
  'straight' | 'orthogonal' | 'segment' | 'elbow' | 'sideToSide' | 'topToBottom' | 'entityRelation' | 'loop';

const EDGE_STYLES: Record<string, Exclude<RoutingKind, 'straight'>> = {
  orthogonalEdgeStyle: 'orthogonal',
  segmentEdgeStyle: 'segment',
  elbowEdgeStyle: 'elbow',
  sideToSideEdgeStyle: 'sideToSide',
  topToBottomEdgeStyle: 'topToBottom',
  entityRelationEdgeStyle: 'entityRelation',
  loopEdgeStyle: 'loop',
};

/** Style de routage effectif ; `supported` est faux si on a dû se rabattre sur l'orthogonal. */
export function routingKind(style: Record<string, string>): { kind: RoutingKind; supported: boolean } {
  const edgeStyle = style.edgeStyle;
  if (edgeStyle === undefined || edgeStyle === '' || edgeStyle === 'none' || style.noEdgeStyle === '1')
    return { kind: 'straight', supported: true };
  const kind = EDGE_STYLES[edgeStyle];
  return kind ? { kind, supported: true } : { kind: 'orthogonal', supported: false };
}

/** Tracé complet de l'arête, extrémités comprises. Vide si l'arête n'a pas deux extrémités. */
export function routeEdge(input: RouteInput): Point[] {
  const { source, target, style } = input;
  const view = new View(style);

  // 1. Bouts fixes (mxGraphView.updateFixedTerminalPoints).
  const p0 = fixedTerminalPoint(
    source,
    constraintFromStyle(style, 'exit'),
    input.sourcePoint,
    perimeterOn(style, 'exit'),
  );
  const pe = fixedTerminalPoint(
    target,
    constraintFromStyle(style, 'entry'),
    input.targetPoint,
    perimeterOn(style, 'entry'),
  );

  // 2. Routeur (mxGraphView.updatePoints) : `result` commence par le premier bout, comme dans draw.io.
  const sourceState = source && stateOf(source);
  const targetState = target && stateOf(target);
  const router = edgeRouter(input);
  const result: Array<Point | null> = [p0 ?? null];
  if (router) router(view, { p0, pe }, sourceState, targetState, input.waypoints, result);
  else for (const p of input.waypoints) result.push({ ...p });
  result.push(pe ?? null);

  // 3. Bouts flottants (mxGraphView.updateFloatingTerminalPoints) : la cible d'abord.
  // mxGraph.isOrthogonal : d'après `edgeStyle` seul (une boucle d'un style orthogonal l'est aussi).
  const orthogonal =
    style.orthogonal !== undefined ? style.orthogonal !== '0' : !['straight', 'loop'].includes(routingKind(style).kind);
  const spacing = number(style.perimeterSpacing, 0);
  if (result[result.length - 1] === null && target) {
    const next = result[result.length - 2] ?? (source ? center(source.bounds) : undefined);
    result[result.length - 1] = next
      ? perimeterPoint(target, next, orthogonal, spacing + number(style.targetPerimeterSpacing, 0))
      : null;
  }
  if (result[0] === null && source) {
    const next = result[1] ?? (target ? center(target.bounds) : undefined);
    result[0] = next
      ? perimeterPoint(source, next, orthogonal, spacing + number(style.sourcePerimeterSpacing, 0))
      : null;
  }
  if (result.some((p) => p === null) || result.length < 2) return [];
  return simplify(result as Point[]);
}

// ---------------------------------------------------------------------------
// Bouts

function perimeterOn(style: Record<string, string>, prefix: 'exit' | 'entry'): boolean {
  return style[`${prefix}Perimeter`] !== '0';
}

/** Bout fixe : point d'attache imposé (projeté sur le contour, sauf `exitPerimeter=0`), ou extrémité libre. */
function fixedTerminalPoint(
  terminal: Terminal | undefined,
  constraint: Constraint | undefined,
  free: Point | undefined,
  onPerimeter: boolean,
): Point | undefined {
  if (terminal && constraint) {
    const b = perimeterBounds(terminal, 0);
    const point = { x: b.x + constraint.x * b.width + constraint.dx, y: b.y + constraint.y * b.height + constraint.dy };
    if (onPerimeter) return perimeterPoint(terminal, point, false, 0);
    // Sans projection, le point suit les retournements de la forme.
    if (terminal.style?.flipH === '1') point.x = 2 * (b.x + b.width / 2) - point.x;
    if (terminal.style?.flipV === '1') point.y = 2 * (b.y + b.height / 2) - point.y;
    return point;
  }
  return terminal ? undefined : free && { ...free };
}

export function constraintFromStyle(style: Record<string, string>, prefix: 'exit' | 'entry'): Constraint | undefined {
  if (style[`${prefix}X`] === undefined || style[`${prefix}Y`] === undefined) return undefined;
  const num = (key: string) => {
    const value = parseFloat(style[key] ?? '');
    return Number.isFinite(value) ? value : 0;
  };
  return { x: num(`${prefix}X`), y: num(`${prefix}Y`), dx: num(`${prefix}Dx`), dy: num(`${prefix}Dy`) };
}

function perimeterBounds(terminal: Terminal, border: number): Rect {
  const grow = border + number(terminal.style?.perimeterSpacing, 0);
  const b = terminal.bounds;
  return { x: b.x - grow, y: b.y - grow, width: b.width + 2 * grow, height: b.height + 2 * grow };
}

/** Point du contour visé depuis `next` (mxGraphView.getPerimeterPoint), `orthogonal` : projeté dans l'axe. */
function perimeterPoint(terminal: Terminal, next: Point, orthogonal: boolean, border: number): Point {
  const bounds = perimeterBounds(terminal, border);
  if (bounds.width <= 0 && bounds.height <= 0) return center(terminal.bounds);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const flipH = terminal.style?.flipH === '1';
  const flipV = terminal.style?.flipV === '1';
  const aim = { x: flipH ? 2 * cx - next.x : next.x, y: flipV ? 2 * cy - next.y : next.y };
  const point =
    terminal.perimeter === 'ellipse'
      ? ellipsePerimeter(bounds, aim, orthogonal)
      : rectanglePerimeter(bounds, aim, orthogonal);
  if (flipH) point.x = 2 * cx - point.x;
  if (flipV) point.y = 2 * cy - point.y;
  return point;
}

function rectanglePerimeter(bounds: Rect, next: Point, orthogonal: boolean): Point {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const alpha = Math.atan2(next.y - cy, next.x - cx);
  const p = { x: 0, y: 0 };
  const beta = Math.PI / 2 - alpha;
  const t = Math.atan2(bounds.height, bounds.width);
  if (alpha < -Math.PI + t || alpha > Math.PI - t) {
    p.x = bounds.x;
    p.y = cy - (bounds.width * Math.tan(alpha)) / 2;
  } else if (alpha < -t) {
    p.y = bounds.y;
    p.x = cx - (bounds.height * Math.tan(beta)) / 2;
  } else if (alpha < t) {
    p.x = bounds.x + bounds.width;
    p.y = cy + (bounds.width * Math.tan(alpha)) / 2;
  } else {
    p.y = bounds.y + bounds.height;
    p.x = cx + (bounds.height * Math.tan(beta)) / 2;
  }
  if (orthogonal) {
    if (next.x >= bounds.x && next.x <= bounds.x + bounds.width) p.x = next.x;
    else if (next.y >= bounds.y && next.y <= bounds.y + bounds.height) p.y = next.y;
    if (next.x < bounds.x) p.x = bounds.x;
    else if (next.x > bounds.x + bounds.width) p.x = bounds.x + bounds.width;
    if (next.y < bounds.y) p.y = bounds.y;
    else if (next.y > bounds.y + bounds.height) p.y = bounds.y + bounds.height;
  }
  return p;
}

function ellipsePerimeter(bounds: Rect, next: Point, orthogonal: boolean): Point {
  const { x, y } = bounds;
  const a = bounds.width / 2;
  const b = bounds.height / 2;
  const cx = x + a;
  const cy = y + b;
  const px = next.x;
  const py = next.y;
  // draw.io tronque l'écart au centre (`parseInt`).
  const dx = Math.trunc(px - cx);
  const dy = Math.trunc(py - cy);
  if (dx === 0 && dy !== 0) return { x: cx, y: cy + (b * dy) / Math.abs(dy) };
  if (dx === 0 && dy === 0) return { x: px, y: py };
  if (orthogonal) {
    if (py >= y && py <= y + bounds.height) {
      const ty = py - cy;
      let tx = Math.sqrt(a * a * (1 - (ty * ty) / (b * b))) || 0;
      if (px <= x) tx = -tx;
      return { x: cx + tx, y: py };
    }
    if (px >= x && px <= x + bounds.width) {
      const tx = px - cx;
      let ty = Math.sqrt(b * b * (1 - (tx * tx) / (a * a))) || 0;
      if (py <= y) ty = -ty;
      return { x: px, y: cy + ty };
    }
  }
  const d = dy / dx;
  const h = cy - d * cx;
  const e = a * a * d * d + b * b;
  const f = -2 * cx * e;
  const g = a * a * d * d * cx * cx + b * b * cx * cx - a * a * b * b;
  const det = Math.sqrt(f * f - 4 * e * g);
  const x1 = (-f + det) / (2 * e);
  const x2 = (-f - det) / (2 * e);
  const y1 = d * x1 + h;
  const y2 = d * x2 + h;
  return Math.hypot(x1 - px, y1 - py) < Math.hypot(x2 - px, y2 - py) ? { x: x1, y: y1 } : { x: x2, y: y2 };
}

/** Intersection du contour avec la demi-droite partant du centre vers `toward` (sans projection). */
export function perimeterToward(terminal: Terminal | undefined, toward: Point | undefined): Point | undefined {
  if (!terminal) return undefined;
  return toward ? perimeterPoint(terminal, toward, false, 0) : center(terminal.bounds);
}

// ---------------------------------------------------------------------------
// Routeurs (mxEdgeStyle)

/** Forme vue par un routeur (mxCellState) ; une extrémité libre est un état de taille nulle, sans style. */
interface State extends Rect {
  style?: Record<string, string>;
  id?: string;
}

/** Bouts fixes connus avant le routage (`state.absolutePoints`). */
interface Fixed {
  p0?: Point;
  pe?: Point;
}

type Router = (
  view: View,
  fixed: Fixed,
  source: State | undefined,
  target: State | undefined,
  points: Point[],
  result: Array<Point | null>,
) => void;

/** Ce que les routeurs lisent de la vue et du style de l'arête. */
class View {
  constructor(readonly style: Record<string, string>) {}

  routingCenterX(state: State): number {
    return state.x + state.width / 2 + number(state.style?.routingCenterX, 0) * state.width;
  }

  routingCenterY(state: State): number {
    return state.y + state.height / 2 + number(state.style?.routingCenterY, 0) * state.height;
  }
}

function stateOf(terminal: Terminal): State {
  return { ...terminal.bounds, style: terminal.style, id: terminal.id };
}

function freeState(p: Point): State {
  return { x: p.x, y: p.y, width: 0, height: 0 };
}

function edgeRouter(input: RouteInput): Router | undefined {
  const { source, target, style, waypoints } = input;
  // Boucle (mxGraphView.isLoopStyleEnabled) : une forme reliée à elle-même, sans tracé imposé.
  const sameTerminal = !!source && !!target && (source.id !== undefined ? source.id === target.id : source === target);
  const constrained =
    constraintFromStyle(style, 'exit') !== undefined || constraintFromStyle(style, 'entry') !== undefined;
  if (sameTerminal && waypoints.length < 2 && (style.orthogonalLoop !== '1' || !constrained)) {
    const loop = style.loop ? ROUTERS[EDGE_STYLES[style.loop] ?? 'loop'] : loopConnector;
    return loop ?? loopConnector;
  }
  const { kind } = routingKind(style);
  return kind === 'straight' ? undefined : ROUTERS[kind];
}

const ORTH_BUFFER = 10;
const DEFAULT_MARKER_SIZE = 6;
const ENTITY_SEGMENT = 30;
const LOOP_SEGMENT = 10;

const WEST = 1;
const NORTH = 2;
const SOUTH = 4;
const EAST = 8;
const ALL = 15;

const SIDE_MASK = 480;
const CENTER_MASK = 512;
const SOURCE_MASK = 1024;
const TARGET_MASK = 2048;

const DIR_VECTORS: Array<[number, number]> = [
  [-1, 0],
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 0],
];

const ROUTE_PATTERNS: number[][][] = [
  [
    [513, 2308, 2081, 2562],
    [513, 1090, 514, 2184, 2114, 2561],
    [513, 1090, 514, 2564, 2184, 2562],
    [513, 2308, 2561, 1090, 514, 2568, 2308],
  ],
  [
    [514, 1057, 513, 2308, 2081, 2562],
    [514, 2184, 2114, 2561],
    [514, 2184, 2562, 1057, 513, 2564, 2184],
    [514, 1057, 513, 2568, 2308, 2561],
  ],
  [
    [1090, 514, 1057, 513, 2308, 2081, 2562],
    [2114, 2561],
    [1090, 2562, 1057, 513, 2564, 2184],
    [1090, 514, 1057, 513, 2308, 2561, 2568],
  ],
  [
    [2081, 2562],
    [1057, 513, 1090, 514, 2184, 2114, 2561],
    [1057, 513, 1090, 514, 2184, 2562, 2564],
    [1057, 2561, 1090, 514, 2568, 2308],
  ],
];

const r10 = (v: number) => Math.round(v * 10) / 10;
const scaled = (s: State | undefined): State | undefined =>
  s && { ...s, x: r10(s.x), y: r10(s.y), width: r10(s.width), height: r10(s.height) };
const scaledPoint = (p: Point | undefined): Point | undefined => p && { x: r10(p.x), y: r10(p.y) };

function contains(s: State, x: number, y: number): boolean {
  return s.x <= x && s.x + s.width >= x && s.y <= y && s.y + s.height >= y;
}

function reversePortConstraints(constraint: number): number {
  return (
    ((constraint & WEST) << 3) | ((constraint & NORTH) << 1) | ((constraint & SOUTH) >> 1) | ((constraint & EAST) >> 3)
  );
}

/** Côtés autorisés d'une forme (`portConstraint` de la forme, sinon `sourcePortConstraint` de l'arête). */
function portConstraints(state: State, style: Record<string, string>, isSource: boolean, fallback: number): number {
  const value = state.style?.portConstraint ?? style[isSource ? 'sourcePortConstraint' : 'targetPortConstraint'];
  if (value === undefined) return fallback;
  let mask = 0;
  if (value.includes('north')) mask |= NORTH;
  if (value.includes('west')) mask |= WEST;
  if (value.includes('south')) mask |= SOUTH;
  if (value.includes('east')) mask |= EAST;
  return mask;
}

function jettySize(style: Record<string, string>, isSource: boolean): number {
  const value = style[isSource ? 'sourceJettySize' : 'targetJettySize'] ?? style.jettySize;
  if (value === 'auto') {
    // Pointe par défaut de draw.io : aucune au départ, classic à l'arrivée.
    const arrow = isSource ? (style.startArrow ?? 'none') : (style.endArrow ?? 'classic');
    if (arrow !== 'none') {
      const size = number(style[isSource ? 'startSize' : 'endSize'], DEFAULT_MARKER_SIZE);
      return Math.max(2, Math.ceil((size + ORTH_BUFFER) / ORTH_BUFFER)) * ORTH_BUFFER;
    }
    return 2 * ORTH_BUFFER;
  }
  return number(value, ORTH_BUFFER);
}

/** Orthogonal sans point intermédiaire (mxEdgeStyle.OrthConnector) ; avec points : SegmentConnector. */
const orthConnector: Router = (view, fixed, sourceIn, targetIn, hints, result) => {
  const source = scaled(sourceIn);
  const target = scaled(targetIn);
  const p0 = scaledPoint(fixed.p0);
  const pe = scaledPoint(fixed.pe);

  let sourceBuffer = jettySize(view.style, true);
  let targetBuffer = jettySize(view.style, false);
  if (
    source &&
    targetIn &&
    sourceIn &&
    (sourceIn.id !== undefined ? sourceIn.id === targetIn.id : sourceIn === targetIn)
  ) {
    targetBuffer = Math.max(sourceBuffer, targetBuffer);
    sourceBuffer = targetBuffer;
  }
  const totalBuffer = targetBuffer + sourceBuffer;
  let tooShort = false;
  if (p0 && pe) {
    const dx = pe.x - p0.x;
    const dy = pe.y - p0.y;
    tooShort = dx * dx + dy * dy < totalBuffer * totalBuffer;
  }
  if (tooShort || hints.length > 0) {
    segmentConnector(view, fixed, sourceIn, targetIn, hints, result);
    return;
  }
  if ((!source && !p0) || (!target && !pe)) return;

  const sourceX = source ? source.x : p0!.x;
  const sourceY = source ? source.y : p0!.y;
  const sourceWidth = source ? source.width : 1;
  const sourceHeight = source ? source.height : 1;
  const targetX = target ? target.x : pe!.x;
  const targetY = target ? target.y : pe!.y;
  const targetWidth = target ? target.width : 1;
  const targetHeight = target ? target.height : 1;

  const portConstraint = [ALL, ALL];
  if (source) portConstraint[0] = portConstraints(source, view.style, true, ALL);
  if (target) portConstraint[1] = portConstraints(target, view.style, false, ALL);
  if (sourceWidth === 0 || sourceHeight === 0 || targetWidth === 0 || targetHeight === 0) return;

  const dir = [0, 0];
  const geo = [
    [sourceX, sourceY, sourceWidth, sourceHeight],
    [targetX, targetY, targetWidth, targetHeight],
  ] as const;
  const buffer = [sourceBuffer, targetBuffer];
  const limits = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];
  for (let i = 0; i < 2; i++) {
    limits[i]![1] = geo[i]![0] - buffer[i]!;
    limits[i]![2] = geo[i]![1] - buffer[i]!;
    limits[i]![4] = geo[i]![0] + geo[i]![2] + buffer[i]!;
    limits[i]![8] = geo[i]![1] + geo[i]![3] + buffer[i]!;
  }

  // Quadrant de la cible par rapport à la source : 0 | 1 / 3 | 2.
  const dx = geo[0][0] + geo[0][2] / 2 - (geo[1][0] + geo[1][2] / 2);
  const dy = geo[0][1] + geo[0][3] / 2 - (geo[1][1] + geo[1][3] / 2);
  let quad = 0;
  if (dx < 0) quad = dy < 0 ? 2 : 1;
  else if (dy <= 0) quad = dx === 0 ? 2 : 3;

  // Points d'attache imposés : côté de sortie et position relative.
  const constraint = [
    [0.5, 0.5],
    [0.5, 0.5],
  ];
  let currentTerm = source ? p0 : undefined;
  for (let i = 0; i < 2; i++) {
    if (currentTerm) {
      constraint[i]![0] = (currentTerm.x - geo[i]![0]) / geo[i]![2];
      if (Math.abs(currentTerm.x - geo[i]![0]) <= 1) dir[i] = WEST;
      else if (Math.abs(currentTerm.x - geo[i]![0] - geo[i]![2]) <= 1) dir[i] = EAST;
      constraint[i]![1] = (currentTerm.y - geo[i]![1]) / geo[i]![3];
      if (Math.abs(currentTerm.y - geo[i]![1]) <= 1) dir[i] = NORTH;
      else if (Math.abs(currentTerm.y - geo[i]![1] - geo[i]![3]) <= 1) dir[i] = SOUTH;
    }
    currentTerm = target ? pe : undefined;
  }

  const sourceTopDist = geo[0][1] - (geo[1][1] + geo[1][3]);
  const sourceLeftDist = geo[0][0] - (geo[1][0] + geo[1][2]);
  const sourceBottomDist = geo[1][1] - (geo[0][1] + geo[0][3]);
  const sourceRightDist = geo[1][0] - (geo[0][0] + geo[0][2]);
  const separations: number[] = [];
  separations[1] = Math.max(sourceLeftDist - totalBuffer, 0);
  separations[2] = Math.max(sourceTopDist - totalBuffer, 0);
  separations[4] = Math.max(sourceBottomDist - totalBuffer, 0);
  separations[3] = Math.max(sourceRightDist - totalBuffer, 0);

  // Côtés préférés de la source et de la cible, dans l'ordre.
  const dirPref: number[] = [];
  const horPref: number[] = [];
  const vertPref: number[] = [];
  horPref[0] = sourceLeftDist >= sourceRightDist ? WEST : EAST;
  vertPref[0] = sourceTopDist >= sourceBottomDist ? NORTH : SOUTH;
  horPref[1] = reversePortConstraints(horPref[0]);
  vertPref[1] = reversePortConstraints(vertPref[0]);
  const preferredHorizDist = sourceLeftDist >= sourceRightDist ? sourceLeftDist : sourceRightDist;
  const preferredVertDist = sourceTopDist >= sourceBottomDist ? sourceTopDist : sourceBottomDist;

  const prefOrdering = [
    [0, 0],
    [0, 0],
  ];
  let preferredOrderSet = false;
  for (let i = 0; i < 2; i++) {
    if (dir[i] !== 0) continue;
    if ((horPref[i]! & portConstraint[i]!) === 0) horPref[i] = reversePortConstraints(horPref[i]!);
    if ((vertPref[i]! & portConstraint[i]!) === 0) vertPref[i] = reversePortConstraints(vertPref[i]!);
    prefOrdering[i]![0] = vertPref[i]!;
    prefOrdering[i]![1] = horPref[i]!;
  }
  if (preferredVertDist > 0 && preferredHorizDist > 0) {
    // Connexion possible en deux segments.
    if ((horPref[0]! & portConstraint[0]!) > 0 && (vertPref[1]! & portConstraint[1]!) > 0) {
      prefOrdering[0] = [horPref[0]!, vertPref[0]!];
      prefOrdering[1] = [vertPref[1]!, horPref[1]!];
      preferredOrderSet = true;
    } else if ((vertPref[0]! & portConstraint[0]!) > 0 && (horPref[1]! & portConstraint[1]!) > 0) {
      prefOrdering[0] = [vertPref[0]!, horPref[0]!];
      prefOrdering[1] = [horPref[1]!, vertPref[1]!];
      preferredOrderSet = true;
    }
  }
  if (preferredVertDist > 0 && !preferredOrderSet) {
    prefOrdering[0] = [vertPref[0]!, horPref[0]!];
    prefOrdering[1] = [vertPref[1]!, horPref[1]!];
    preferredOrderSet = true;
  }
  if (preferredHorizDist > 0 && !preferredOrderSet) {
    prefOrdering[0] = [horPref[0]!, vertPref[0]!];
    prefOrdering[1] = [horPref[1]!, vertPref[1]!];
    preferredOrderSet = true;
  }

  for (let i = 0; i < 2; i++) {
    if (dir[i] !== 0) continue;
    const pc = portConstraint[i]!;
    if ((prefOrdering[i]![0]! & pc) === 0) prefOrdering[i]![0] = prefOrdering[i]![1]!;
    let pref = prefOrdering[i]![0]! & pc;
    pref |= (prefOrdering[i]![1]! & pc) << 8;
    pref |= (prefOrdering[1 - i]![i]! & pc) << 16;
    pref |= (prefOrdering[1 - i]![1 - i]! & pc) << 24;
    if ((pref & 0xf) === 0) pref = pref << 8;
    if ((pref & 0xf00) === 0) pref = (pref & 0xf) | (pref >> 8);
    if ((pref & 0xf0000) === 0) pref = (pref & 0xffff) | ((pref & 0xf000000) >> 8);
    dirPref[i] = pref;
    dir[i] = pref & 0xf;
    if (pc === WEST || pc === NORTH || pc === EAST || pc === SOUTH) dir[i] = pc;
  }

  let sourceIndex = (dir[0] === EAST ? 3 : dir[0]!) - quad;
  let targetIndex = (dir[1] === EAST ? 3 : dir[1]!) - quad;
  if (sourceIndex < 1) sourceIndex += 4;
  if (targetIndex < 1) targetIndex += 4;
  const routePattern = ROUTE_PATTERNS[sourceIndex - 1]![targetIndex - 1]!;

  const wayPoints: Array<[number, number]> = Array.from({ length: 12 }, () => [0, 0]);
  wayPoints[0] = [geo[0][0], geo[0][1]];
  switch (dir[0]) {
    case WEST:
      wayPoints[0][0] -= sourceBuffer;
      wayPoints[0][1] += constraint[0]![1]! * geo[0][3];
      break;
    case SOUTH:
      wayPoints[0][0] += constraint[0]![0]! * geo[0][2];
      wayPoints[0][1] += geo[0][3] + sourceBuffer;
      break;
    case EAST:
      wayPoints[0][0] += geo[0][2] + sourceBuffer;
      wayPoints[0][1] += constraint[0]![1]! * geo[0][3];
      break;
    case NORTH:
      wayPoints[0][0] += constraint[0]![0]! * geo[0][2];
      wayPoints[0][1] -= sourceBuffer;
      break;
  }

  let currentIndex = 0;
  // Orientation : 0 horizontal, 1 vertical.
  let lastOrientation = (dir[0]! & (EAST | WEST)) > 0 ? 0 : 1;
  const initialOrientation = lastOrientation;
  let currentOrientation = 0;

  for (const step of routePattern) {
    const nextDirection = step & 0xf;
    let directionIndex = (nextDirection === EAST ? 3 : nextDirection) + quad;
    if (directionIndex > 4) directionIndex -= 4;
    const direction = DIR_VECTORS[directionIndex - 1]!;
    currentOrientation = directionIndex % 2 > 0 ? 0 : 1;
    if (currentOrientation !== lastOrientation) {
      currentIndex++;
      wayPoints[currentIndex] = [wayPoints[currentIndex - 1]![0], wayPoints[currentIndex - 1]![1]];
    }
    const current = wayPoints[currentIndex]!;
    const tar = (step & TARGET_MASK) > 0;
    const sou = (step & SOURCE_MASK) > 0;
    let side = (step & SIDE_MASK) >> 5;
    side = side << quad;
    if (side > 0xf) side = side >> 4;
    const centre = (step & CENTER_MASK) > 0;

    if ((sou || tar) && side < 9) {
      const souTar = sou ? 0 : 1;
      let limit: number;
      if (centre && currentOrientation === 0) limit = geo[souTar]![0] + constraint[souTar]![0]! * geo[souTar]![2];
      else if (centre) limit = geo[souTar]![1] + constraint[souTar]![1]! * geo[souTar]![3];
      else limit = limits[souTar]![side]!;
      if (currentOrientation === 0) {
        const delta = (limit - current[0]) * direction[0];
        if (delta > 0) current[0] += direction[0] * delta;
      } else {
        const delta = (limit - current[1]) * direction[1];
        if (delta > 0) current[1] += direction[1] * delta;
      }
    } else if (centre) {
      // Vers le milieu de l'écart entre les deux formes.
      current[0] += direction[0] * Math.abs(separations[directionIndex]! / 2);
      current[1] += direction[1] * Math.abs(separations[directionIndex]! / 2);
    }

    if (currentIndex > 0 && current[currentOrientation] === wayPoints[currentIndex - 1]![currentOrientation])
      currentIndex--;
    else lastOrientation = currentOrientation;
  }

  for (let i = 0; i <= currentIndex; i++) {
    if (i === currentIndex) {
      // Le dernier point n'est gardé que si le nombre de coudes est cohérent avec les orientations
      // de départ et d'arrivée (paire si elles sont identiques, impaire sinon).
      const targetOrientation = (dir[1]! & (EAST | WEST)) > 0 ? 0 : 1;
      const sameOrient = targetOrientation === initialOrientation ? 0 : 1;
      if (sameOrient !== (currentIndex + 1) % 2) break;
    }
    result.push({ x: r10(wayPoints[i]![0]), y: r10(wayPoints[i]![1]) });
  }

  // Doublons retirés.
  let index = 1;
  while (index < result.length) {
    const a = result[index - 1];
    const b = result[index];
    if (!a || !b || a.x !== b.x || a.y !== b.y) index++;
    else result.splice(index, 1);
  }
};

/** Segments orthogonaux passant par les points intermédiaires (mxEdgeStyle.SegmentConnector). */
const segmentConnector: Router = (view, fixed, sourceIn, targetIn, controlHints, result) => {
  const pts = [scaledPoint(fixed.p0), scaledPoint(fixed.pe)];
  const source = scaled(sourceIn);
  const target = scaled(targetIn);
  const tol = 1;
  const tempPoints: Point[] = [];
  let lastPushed: Point | null = result.length > 0 ? result[0]! : null;
  let horizontal = true;
  let hint: Point | null = null;
  let pe: Point | undefined;

  const pushPoint = (p: Point) => {
    p.x = r10(p.x);
    p.y = r10(p.y);
    if (!lastPushed || Math.abs(lastPushed.x - p.x) >= tol || Math.abs(lastPushed.y - p.y) >= 1) {
      result.push(p);
      lastPushed = p;
    }
  };

  let pt: Point | undefined = pts[0]
    ? { ...pts[0] }
    : source
      ? { x: view.routingCenterX(source), y: view.routingCenterY(source) }
      : undefined;
  const lastInx = pts.length - 1;

  if (controlHints.length > 0) {
    let hints = controlHints.map((p) => ({ ...p }));
    // Premier et dernier point intermédiaires alignés sur les bouts fixes, à 1 px près.
    if (pt && hints[0]) {
      if (Math.abs(hints[0].x - pt.x) < tol) hints[0].x = pt.x;
      if (Math.abs(hints[0].y - pt.y) < tol) hints[0].y = pt.y;
    }
    pe = pts[lastInx];
    const lastHint = hints[hints.length - 1];
    if (pe && lastHint) {
      if (Math.abs(lastHint.x - pe.x) < tol) lastHint.x = pe.x;
      if (Math.abs(lastHint.y - pe.y) < tol) lastHint.y = pe.y;
    }
    hint = hints[0]!;

    let currentTerm: State | undefined = source;
    let currentPt = pts[0];
    let currentHint = hint;
    if (currentPt) currentTerm = undefined;

    // Orientation du premier segment : alignement sur un bout fixe, ou « canal » d'une forme.
    for (let i = 0; i < 2; i++) {
      const fixedVertAlign = !!currentPt && currentPt.x === currentHint.x;
      const fixedHozAlign = !!currentPt && currentPt.y === currentHint.y;
      const inHozChan =
        !!currentTerm && currentHint.y >= currentTerm.y && currentHint.y <= currentTerm.y + currentTerm.height;
      const inVertChan =
        !!currentTerm && currentHint.x >= currentTerm.x && currentHint.x <= currentTerm.x + currentTerm.width;
      const hozChan = fixedHozAlign || (!currentPt && inHozChan);
      const vertChan = fixedVertAlign || (!currentPt && inVertChan);

      if (!(i === 0 && ((hozChan && vertChan) || (fixedVertAlign && fixedHozAlign)))) {
        if (currentPt && !fixedHozAlign && !fixedVertAlign && (inHozChan || inVertChan)) {
          horizontal = !inHozChan;
          break;
        }
        if (vertChan || hozChan) {
          horizontal = hozChan;
          // Depuis la cible : on remonte le nombre de points.
          if (i === 1) horizontal = hints.length % 2 === 0 ? hozChan : vertChan;
          break;
        }
      }
      currentTerm = target;
      currentPt = pts[lastInx];
      if (currentPt) currentTerm = undefined;
      currentHint = hints[hints.length - 1]!;
      if (fixedVertAlign && fixedHozAlign) hints = hints.slice(1);
    }

    if (
      horizontal &&
      ((pts[0] && pts[0].y !== hint.y) ||
        (!pts[0] && source && (hint.y < source.y || hint.y > source.y + source.height)))
    ) {
      tempPoints.push({ x: pt!.x, y: hint.y });
    } else if (
      !horizontal &&
      ((pts[0] && pts[0].x !== hint.x) ||
        (!pts[0] && source && (hint.x < source.x || hint.x > source.x + source.width)))
    ) {
      tempPoints.push({ x: hint.x, y: pt!.y });
    }
    if (horizontal) pt!.y = hint.y;
    else pt!.x = hint.x;

    for (const h of hints) {
      horizontal = !horizontal;
      hint = h;
      if (horizontal) pt!.y = hint.y;
      else pt!.x = hint.x;
      tempPoints.push({ ...pt! });
    }
  } else {
    hint = pt ?? null;
    horizontal = true;
  }

  // Dernier coude vers le bout d'arrivée.
  pt = pts[lastInx] ?? (target ? { x: view.routingCenterX(target), y: view.routingCenterY(target) } : undefined);
  if (pt && hint) {
    const end = pts[lastInx];
    if (
      horizontal &&
      ((end && end.y !== hint.y) || (!end && target && (hint.y < target.y || hint.y > target.y + target.height)))
    ) {
      tempPoints.push({ x: pt.x, y: hint.y });
    } else if (
      !horizontal &&
      ((end && end.x !== hint.x) || (!end && target && (hint.x < target.x || hint.x > target.x + target.width)))
    ) {
      tempPoints.push({ x: hint.x, y: pt.y });
    }
  }

  // Coudes à l'intérieur des formes retirés.
  if (!pts[0] && source)
    while (tempPoints.length > 0 && contains(source, tempPoints[0]!.x, tempPoints[0]!.y)) tempPoints.shift();
  if (!pts[lastInx] && target)
    while (
      tempPoints.length > 0 &&
      contains(target, tempPoints[tempPoints.length - 1]!.x, tempPoints[tempPoints.length - 1]!.y)
    )
      tempPoints.pop();

  for (const p of tempPoints) pushPoint(p);

  // Dernier point confondu avec le bout d'arrivée : retiré, l'avant-dernier aligné sur lui.
  const last = result[result.length - 1];
  if (pe && last && Math.abs(pe.x - last.x) <= tol && Math.abs(pe.y - last.y) <= tol) {
    result.splice(result.length - 1, 1);
    const previous = result[result.length - 1];
    if (previous) {
      if (Math.abs(previous.x - pe.x) < tol) previous.x = pe.x;
      if (Math.abs(previous.y - pe.y) < tol) previous.y = pe.y;
    }
  }
};

/** Coude (mxEdgeStyle.ElbowConnector) : de côté à côté, ou de haut en bas (`elbow=vertical`). */
const elbowConnector: Router = (view, fixed, source, target, points, result) => {
  const pt = points[0];
  let vertical = false;
  let horizontal = false;
  if (source && target) {
    if (pt) {
      const left = Math.min(source.x, target.x);
      const right = Math.max(source.x + source.width, target.x + target.width);
      const top = Math.min(source.y, target.y);
      const bottom = Math.max(source.y + source.height, target.y + target.height);
      vertical = pt.y < top || pt.y > bottom;
      horizontal = pt.x < left || pt.x > right;
    } else {
      const left = Math.max(source.x, target.x);
      const right = Math.min(source.x + source.width, target.x + target.width);
      vertical = left === right;
      if (!vertical) {
        const top = Math.max(source.y, target.y);
        const bottom = Math.min(source.y + source.height, target.y + target.height);
        horizontal = top === bottom;
      }
    }
  }
  if (!horizontal && (vertical || view.style.elbow === 'vertical'))
    topToBottom(view, fixed, source, target, points, result);
  else sideToSide(view, fixed, source, target, points, result);
};

const sideToSide: Router = (view, fixed, sourceIn, targetIn, points, result) => {
  const pt = points[0];
  const source = fixed.p0 ? freeState(fixed.p0) : sourceIn;
  const target = fixed.pe ? freeState(fixed.pe) : targetIn;
  if (!source || !target) return;
  const l = Math.max(source.x, target.x);
  const r = Math.min(source.x + source.width, target.x + target.width);
  const x = pt ? pt.x : Math.round(r + (l - r) / 2);
  let y1 = view.routingCenterY(source);
  let y2 = view.routingCenterY(target);
  if (pt) {
    if (pt.y >= source.y && pt.y <= source.y + source.height) y1 = pt.y;
    if (pt.y >= target.y && pt.y <= target.y + target.height) y2 = pt.y;
  }
  if (!contains(target, x, y1) && !contains(source, x, y1)) result.push({ x, y: y1 });
  if (!contains(target, x, y2) && !contains(source, x, y2)) result.push({ x, y: y2 });
  if (result.length === 1) {
    if (pt) {
      if (!contains(target, x, pt.y) && !contains(source, x, pt.y)) result.push({ x, y: pt.y });
    } else {
      const t = Math.max(source.y, target.y);
      const b = Math.min(source.y + source.height, target.y + target.height);
      result.push({ x, y: t + (b - t) / 2 });
    }
  }
};

const topToBottom: Router = (view, fixed, sourceIn, targetIn, points, result) => {
  const pt = points[0];
  const source = fixed.p0 ? freeState(fixed.p0) : sourceIn;
  const target = fixed.pe ? freeState(fixed.pe) : targetIn;
  if (!source || !target) return;
  const t = Math.max(source.y, target.y);
  const b = Math.min(source.y + source.height, target.y + target.height);
  let x = view.routingCenterX(source);
  if (pt && pt.x >= source.x && pt.x <= source.x + source.width) x = pt.x;
  const y = pt ? pt.y : Math.round(b + (t - b) / 2);
  if (!contains(target, x, y) && !contains(source, x, y)) result.push({ x, y });
  x = pt && pt.x >= target.x && pt.x <= target.x + target.width ? pt.x : view.routingCenterX(target);
  if (!contains(target, x, y) && !contains(source, x, y)) result.push({ x, y });
  if (result.length === 1) {
    if (pt) {
      if (!contains(target, pt.x, y) && !contains(source, pt.x, y)) result.push({ x: pt.x, y });
    } else {
      const l = Math.max(source.x, target.x);
      const r = Math.min(source.x + source.width, target.x + target.width);
      result.push({ x: l + (r - l) / 2, y });
    }
  }
};

/** Relation d'entités (mxEdgeStyle.EntityRelation) : sorties horizontales de `segment` px. */
const entityRelation: Router = (view, fixed, sourceIn, targetIn, _points, result) => {
  const segment = number(view.style.segment, ENTITY_SEGMENT);
  const { p0, pe } = fixed;
  let source = sourceIn;
  let target = targetIn;
  let isSourceLeft = false;
  if (source && target) isSourceLeft = (pe ? pe.x : target.x + target.width) < (p0 ? p0.x : source.x);
  if (p0) source = freeState(p0);
  else if (source) {
    const c = portConstraints(source, view.style, true, 0);
    if (c !== 0 && c !== WEST + EAST) isSourceLeft = c === WEST;
  } else return;

  let isTargetLeft = true;
  if (target && source) isTargetLeft = (p0 ? p0.x : source.x + source.width) < (pe ? pe.x : target.x);
  if (pe) target = freeState(pe);
  else if (target) {
    const c = portConstraints(target, view.style, false, 0);
    if (c !== 0 && c !== WEST + EAST) isTargetLeft = c === WEST;
  }
  if (!source || !target) return;

  const x0 = isSourceLeft ? source.x : source.x + source.width;
  const y0 = view.routingCenterY(source);
  const xe = isTargetLeft ? target.x : target.x + target.width;
  const ye = view.routingCenterY(target);
  const dep = { x: x0 + (isSourceLeft ? -segment : segment), y: y0 };
  const arr = { x: xe + (isTargetLeft ? -segment : segment), y: ye };
  if (isSourceLeft === isTargetLeft) {
    const x = isSourceLeft ? Math.min(x0, xe) - segment : Math.max(x0, xe) + segment;
    result.push({ x, y: y0 }, { x, y: ye });
  } else if (dep.x < arr.x === isSourceLeft) {
    const midY = y0 + (ye - y0) / 2;
    result.push(dep, { x: dep.x, y: midY }, { x: arr.x, y: midY }, arr);
  } else {
    result.push(dep, arr);
  }
};

/** Boucle sur une même forme (mxEdgeStyle.Loop). */
const loopConnector: Router = (view, fixed, source, _target, points, result) => {
  if (fixed.p0 && fixed.pe) {
    for (const p of points) result.push({ ...p });
    return;
  }
  if (!source) return;
  let pt: Point | undefined = points[0];
  if (pt && contains(source, pt.x, pt.y)) pt = undefined;
  let x = 0;
  let dx = 0;
  let y = 0;
  let dy = 0;
  const seg = number(view.style.segment, LOOP_SEGMENT);
  const dir = view.style.direction ?? 'west';
  if (dir === 'north' || dir === 'south') {
    x = view.routingCenterX(source);
    dx = seg;
  } else {
    y = view.routingCenterY(source);
    dy = seg;
  }
  if (!pt || pt.x < source.x || pt.x > source.x + source.width) {
    if (pt) {
      x = pt.x;
      dy = Math.max(Math.abs(y - pt.y), dy);
    } else if (dir === 'north') y = source.y - 2 * dx;
    else if (dir === 'south') y = source.y + source.height + 2 * dx;
    else if (dir === 'east') x = source.x - 2 * dy;
    else x = source.x + source.width + 2 * dy;
  } else {
    x = view.routingCenterX(source);
    dx = Math.max(Math.abs(x - pt.x), dy);
    y = pt.y;
    dy = 0;
  }
  result.push({ x: x - dx, y: y - dy }, { x: x + dx, y: y + dy });
};

const ROUTERS: Record<Exclude<RoutingKind, 'straight'>, Router> = {
  orthogonal: orthConnector,
  segment: segmentConnector,
  elbow: elbowConnector,
  sideToSide,
  topToBottom,
  entityRelation,
  loop: loopConnector,
};

// ---------------------------------------------------------------------------
// Utilitaires

function center(b: Rect): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

function number(value: string | undefined, fallback: number): number {
  const parsed = parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Retire les points dupliqués et les points alignés intermédiaires. */
export function simplify(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const p of points) {
    const last = result[result.length - 1];
    if (last && Math.abs(last.x - p.x) < 1e-6 && Math.abs(last.y - p.y) < 1e-6) continue;
    result.push(p);
    while (result.length >= 3) {
      const [a, b, c] = result.slice(-3) as [Point, Point, Point];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      const dot = (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y);
      if (Math.abs(cross) < 1e-6 && dot > 0) result.splice(-2, 1);
      else break;
    }
  }
  return result;
}
