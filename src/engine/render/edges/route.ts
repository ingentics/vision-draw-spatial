import type { Point, Rect } from '../../model/types';

/**
 * Calcul du tracé d'une arête (SPEC §8.3).
 *
 * draw.io n'enregistre que les points intermédiaires posés par l'utilisateur : le tracé réel
 * (coudes des arêtes orthogonales, points d'attache sur les formes) est recalculé à l'affichage.
 * On reproduit ici les styles courants, de façon simplifiée mais déterministe.
 */

export type Direction = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

const LEFT: Direction = { x: -1, y: 0 };
const RIGHT: Direction = { x: 1, y: 0 };
const UP: Direction = { x: 0, y: -1 };
const DOWN: Direction = { x: 0, y: 1 };

/** Distance minimale à laquelle une arête orthogonale s'écarte d'une forme avant de tourner. */
const JETTY = 20;

export interface Terminal {
  bounds: Rect;
  /** Pour l'intersection avec le contour : ellipse ou rectangle (défaut). */
  perimeter: 'rectangle' | 'ellipse';
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

export type RoutingKind = 'straight' | 'orthogonal' | 'elbow-horizontal' | 'elbow-vertical';

/** Style de routage effectif ; `supported` est faux si on a dû se rabattre sur un style voisin. */
export function routingKind(style: Record<string, string>): { kind: RoutingKind; supported: boolean } {
  const edgeStyle = style.edgeStyle;
  switch (edgeStyle) {
    case undefined:
    case '':
    case 'none':
      return { kind: 'straight', supported: true };
    case 'orthogonalEdgeStyle':
    case 'segmentEdgeStyle':
      return { kind: 'orthogonal', supported: true };
    case 'elbowEdgeStyle':
      return { kind: style.elbow === 'vertical' ? 'elbow-vertical' : 'elbow-horizontal', supported: true };
    case 'sideToSideEdgeStyle':
    case 'entityRelationEdgeStyle':
      return { kind: 'elbow-horizontal', supported: true };
    case 'topToBottomEdgeStyle':
      return { kind: 'elbow-vertical', supported: true };
    default:
      return { kind: 'orthogonal', supported: false };
  }
}

/** Tracé complet de l'arête, extrémités comprises. Vide si l'arête n'a pas deux extrémités. */
export function routeEdge(input: RouteInput): Point[] {
  const { kind } = routingKind(input.style);
  let points: Point[];
  if (kind === 'straight') points = routeStraight(input);
  else if (kind === 'orthogonal') points = routeOrthogonal(input);
  else points = routeElbow(input, kind === 'elbow-vertical');
  return simplify(points);
}

// ---------------------------------------------------------------------------
// Ligne droite (passant par les points intermédiaires)

function routeStraight(input: RouteInput): Point[] {
  const { source, target, waypoints } = input;
  const sourceRef =
    waypoints[0] ?? fixedPort(target, 'entry', input.style) ?? terminalCenter(target) ?? input.targetPoint;
  const targetRef =
    waypoints[waypoints.length - 1] ??
    fixedPort(source, 'exit', input.style) ??
    terminalCenter(source) ??
    input.sourcePoint;

  const start = fixedPort(source, 'exit', input.style) ?? perimeterToward(source, sourceRef) ?? input.sourcePoint;
  const end = fixedPort(target, 'entry', input.style) ?? perimeterToward(target, targetRef) ?? input.targetPoint;
  if (!start || !end) return [];
  return [start, ...waypoints, end];
}

// ---------------------------------------------------------------------------
// Orthogonal

interface Port {
  point: Point;
  /** Direction de sortie de la forme (vers l'extérieur). */
  direction: Direction;
}

function routeOrthogonal(input: RouteInput): Point[] {
  const { source, target, waypoints, style } = input;

  if (waypoints.length > 0) {
    const first = waypoints[0]!;
    const last = waypoints[waypoints.length - 1]!;
    const start = portFor(source, 'exit', style, first) ?? freePort(input.sourcePoint, first);
    if (!start) return [];
    const path = pathThrough(start, waypoints);
    const end = target ? portFor(target, 'entry', style, last, path.heading) : freePort(input.targetPoint, last);
    if (!end) return [];
    return finishAt(path.points, end);
  }

  if (source && target && !hasConstraint(style, 'exit') && !hasConstraint(style, 'entry')) {
    const aligned = alignedPorts(source.bounds, target.bounds);
    if (aligned) return aligned;
    return connect(...facingPorts(source.bounds, target.bounds));
  }

  const sourceRef = fixedPort(target, 'entry', style) ?? terminalCenter(target) ?? input.targetPoint;
  const start = portFor(source, 'exit', style, sourceRef) ?? freePort(input.sourcePoint, sourceRef);
  if (!start) return [];
  const end = portFor(target, 'entry', style, start.point) ?? freePort(input.targetPoint, start.point);
  if (!end) return [];
  return connect(start, end);
}

/** Formes en vis-à-vis (projections qui se chevauchent) : un segment droit au milieu du chevauchement. */
function alignedPorts(s: Rect, t: Rect): Point[] | undefined {
  const top = Math.max(s.y, t.y);
  const bottom = Math.min(s.y + s.height, t.y + t.height);
  if (top < bottom) {
    const y = (top + bottom) / 2;
    if (t.x >= s.x + s.width)
      return [
        { x: s.x + s.width, y },
        { x: t.x, y },
      ];
    if (s.x >= t.x + t.width)
      return [
        { x: s.x, y },
        { x: t.x + t.width, y },
      ];
  }
  const left = Math.max(s.x, t.x);
  const right = Math.min(s.x + s.width, t.x + t.width);
  if (left < right) {
    const x = (left + right) / 2;
    if (t.y >= s.y + s.height)
      return [
        { x, y: s.y + s.height },
        { x, y: t.y },
      ];
    if (s.y >= t.y + t.height)
      return [
        { x, y: s.y },
        { x, y: t.y + t.height },
      ];
  }
  return undefined;
}

/**
 * Formes en diagonale, sans contrainte : comme draw.io, on sort sur l'axe où l'écart entre
 * les deux formes est le plus grand, par le milieu des côtés qui se font face.
 */
function facingPorts(s: Rect, t: Rect): [Port, Port] {
  const horizontalGap = Math.max(t.x - (s.x + s.width), s.x - (t.x + t.width));
  const verticalGap = Math.max(t.y - (s.y + s.height), s.y - (t.y + t.height));
  const sy = s.y + s.height / 2;
  const ty = t.y + t.height / 2;
  const sx = s.x + s.width / 2;
  const tx = t.x + t.width / 2;
  if (horizontalGap >= verticalGap) {
    return t.x >= s.x
      ? [
          { point: { x: s.x + s.width, y: sy }, direction: RIGHT },
          { point: { x: t.x, y: ty }, direction: LEFT },
        ]
      : [
          { point: { x: s.x, y: sy }, direction: LEFT },
          { point: { x: t.x + t.width, y: ty }, direction: RIGHT },
        ];
  }
  return t.y >= s.y
    ? [
        { point: { x: sx, y: s.y + s.height }, direction: DOWN },
        { point: { x: tx, y: t.y }, direction: UP },
      ]
    : [
        { point: { x: sx, y: s.y }, direction: UP },
        { point: { x: tx, y: t.y + t.height }, direction: DOWN },
      ];
}

/**
 * Relie deux ports par des segments horizontaux / verticaux.
 * `end.direction` pointe vers l'extérieur de la cible : l'arête arrive donc dans le sens opposé.
 */
function connect(start: Port, end: Port): Point[] {
  const p0 = start.point;
  const p1 = end.point;
  const d0 = start.direction;
  const d1 = end.direction;
  const vertical0 = d0.x === 0;
  const vertical1 = d1.x === 0;

  if (vertical0 !== vertical1) {
    // Directions perpendiculaires : un seul coude, s'il est « devant » les deux ports.
    const corner = vertical0 ? { x: p0.x, y: p1.y } : { x: p1.x, y: p0.y };
    if (ahead(p0, d0, corner) && ahead(p1, d1, corner)) return [p0, corner, p1];
  } else if (d0.x === -d1.x && d0.y === -d1.y) {
    // Directions opposées (ex. droite → gauche) : un Z si la cible est devant.
    if (vertical0 && (p1.y - p0.y) * d0.y > 0) {
      const y = (p0.y + p1.y) / 2;
      return [p0, { x: p0.x, y }, { x: p1.x, y }, p1];
    }
    if (!vertical0 && (p1.x - p0.x) * d0.x > 0) {
      const x = (p0.x + p1.x) / 2;
      return [p0, { x, y: p0.y }, { x, y: p1.y }, p1];
    }
  } else if (d0.x === d1.x && d0.y === d1.y) {
    // Même direction (ex. bas → bas) : un U qui contourne par l'extérieur.
    if (vertical0) {
      const y = d0.y > 0 ? Math.max(p0.y, p1.y) + JETTY : Math.min(p0.y, p1.y) - JETTY;
      return [p0, { x: p0.x, y }, { x: p1.x, y }, p1];
    }
    const x = d0.x > 0 ? Math.max(p0.x, p1.x) + JETTY : Math.min(p0.x, p1.x) - JETTY;
    return [p0, { x, y: p0.y }, { x, y: p1.y }, p1];
  }

  // Cas défavorable : on s'écarte des deux formes, puis on relie les deux points d'écart.
  const a = { x: p0.x + d0.x * JETTY, y: p0.y + d0.y * JETTY };
  const b = { x: p1.x + d1.x * JETTY, y: p1.y + d1.y * JETTY };
  const corner = vertical0 ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
  return [p0, a, corner, b, p1];
}

/** Passe par les points intermédiaires en continuant tout droit tant que possible. */
function pathThrough(start: Port, waypoints: Point[]): { points: Point[]; heading: Direction } {
  const points: Point[] = [start.point];
  let horizontal = start.direction.y === 0;
  for (const next of waypoints) {
    const current = points[points.length - 1]!;
    if (current.x !== next.x && current.y !== next.y) {
      points.push(horizontal ? { x: next.x, y: current.y } : { x: current.x, y: next.y });
      horizontal = !horizontal;
    } else {
      horizontal = current.y === next.y;
    }
    points.push(next);
  }
  return { points, heading: headingOf(points, start.direction) };
}

/** Dernier tronçon jusqu'au port d'entrée, en arrivant dans son axe. */
function finishAt(points: Point[], end: Port): Point[] {
  const current = points[points.length - 1]!;
  const next = end.point;
  if (current.x !== next.x && current.y !== next.y) {
    // Port vertical (haut / bas) : on arrive verticalement, donc on se décale d'abord horizontalement.
    points.push(end.direction.x === 0 ? { x: next.x, y: current.y } : { x: current.x, y: next.y });
  }
  points.push(next);
  return points;
}

/** Sens du dernier segment non nul. */
function headingOf(points: Point[], fallback: Direction): Direction {
  for (let i = points.length - 1; i > 0; i--) {
    const dx = points[i]!.x - points[i - 1]!.x;
    const dy = points[i]!.y - points[i - 1]!.y;
    if (dx !== 0 || dy !== 0) return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? RIGHT : LEFT) : dy > 0 ? DOWN : UP;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Coude (elbowEdgeStyle)

function routeElbow(input: RouteInput, vertical: boolean): Point[] {
  const { source, target, style } = input;
  const sourceCenter = terminalCenter(source) ?? input.sourcePoint;
  const targetCenter = terminalCenter(target) ?? input.targetPoint;
  if (!sourceCenter || !targetCenter) return [];

  const sideToward = (
    terminal: Terminal | undefined,
    from: Point,
    to: Point,
    free: Point | undefined,
  ): Point | undefined => {
    if (!terminal) return free;
    const b = terminal.bounds;
    if (vertical) return { x: b.x + b.width / 2, y: to.y >= from.y ? b.y + b.height : b.y };
    return { x: to.x >= from.x ? b.x + b.width : b.x, y: b.y + b.height / 2 };
  };

  const start = fixedPort(source, 'exit', style) ?? sideToward(source, sourceCenter, targetCenter, input.sourcePoint);
  const end = fixedPort(target, 'entry', style) ?? sideToward(target, targetCenter, sourceCenter, input.targetPoint);
  if (!start || !end) return [];

  const hint = input.waypoints[0];
  if (vertical) {
    const y = hint?.y ?? (start.y + end.y) / 2;
    return [start, { x: start.x, y }, { x: end.x, y }, end];
  }
  const x = hint?.x ?? (start.x + end.x) / 2;
  return [start, { x, y: start.y }, { x, y: end.y }, end];
}

// ---------------------------------------------------------------------------
// Ports et contours

function hasConstraint(style: Record<string, string>, prefix: 'exit' | 'entry'): boolean {
  return style[`${prefix}X`] !== undefined && style[`${prefix}Y`] !== undefined;
}

/** Point d'attache imposé par le style, en coordonnées page (`exitX`… pour la source, `entryX`… pour la cible). */
function fixedPort(
  terminal: Terminal | undefined,
  prefix: 'exit' | 'entry',
  style: Record<string, string>,
): Point | undefined {
  if (!terminal) return undefined;
  const constraint = constraintFromStyle(style, prefix);
  if (!constraint) return undefined;
  const b = terminal.bounds;
  return { x: b.x + constraint.x * b.width + constraint.dx, y: b.y + constraint.y * b.height + constraint.dy };
}

export function constraintFromStyle(style: Record<string, string>, prefix: 'exit' | 'entry'): Constraint | undefined {
  if (!hasConstraint(style, prefix)) return undefined;
  const num = (key: string) => {
    const value = parseFloat(style[key] ?? '');
    return Number.isFinite(value) ? value : 0;
  };
  return { x: num(`${prefix}X`), y: num(`${prefix}Y`), dx: num(`${prefix}Dx`), dy: num(`${prefix}Dy`) };
}

/** Port orthogonal : imposé par le style, sinon milieu du côté qui fait face à `toward`. */
function portFor(
  terminal: Terminal | undefined,
  prefix: 'exit' | 'entry',
  style: Record<string, string>,
  toward: Point | undefined,
  heading?: Direction,
): Port | undefined {
  if (!terminal) return undefined;
  const b = terminal.bounds;
  const fixed = fixedPort(terminal, prefix, style);
  if (fixed) return { point: fixed, direction: sideDirection(b, fixed) };
  if (!toward) return undefined;

  // Si la cible est dans la projection de la forme, on s'aligne sur elle (segment droit).
  if (toward.x > b.x && toward.x < b.x + b.width && (toward.y <= b.y || toward.y >= b.y + b.height)) {
    return toward.y <= b.y
      ? { point: { x: toward.x, y: b.y }, direction: UP }
      : { point: { x: toward.x, y: b.y + b.height }, direction: DOWN };
  }
  if (toward.y > b.y && toward.y < b.y + b.height && (toward.x <= b.x || toward.x >= b.x + b.width)) {
    return toward.x <= b.x
      ? { point: { x: b.x, y: toward.y }, direction: LEFT }
      : { point: { x: b.x + b.width, y: toward.y }, direction: RIGHT };
  }

  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  const facingHorizontal = (): Port =>
    dx >= 0 ? { point: { x: b.x + b.width, y: cy }, direction: RIGHT } : { point: { x: b.x, y: cy }, direction: LEFT };
  const facingVertical = (): Port =>
    dy >= 0 ? { point: { x: cx, y: b.y + b.height }, direction: DOWN } : { point: { x: cx, y: b.y }, direction: UP };

  if (heading) {
    // Arrivée sur la cible : on évite tout demi-tour. Si l'on se dirige déjà vers le centre
    // de la forme, on continue tout droit et on entre par le côté ; sinon par la face qui nous fait face.
    if (heading.x === 0) return Math.sign(cy - toward.y) === heading.y ? facingHorizontal() : facingVertical();
    return Math.sign(cx - toward.x) === heading.x ? facingVertical() : facingHorizontal();
  }
  return Math.abs(dx) * b.height >= Math.abs(dy) * b.width ? facingHorizontal() : facingVertical();
}

/** Extrémité libre : direction vers le point de référence, selon l'axe dominant. */
function freePort(point: Point | undefined, toward: Point | undefined): Port | undefined {
  if (!point) return undefined;
  if (!toward) return { point, direction: RIGHT };
  const dx = toward.x - point.x;
  const dy = toward.y - point.y;
  const direction = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? RIGHT : LEFT) : dy >= 0 ? DOWN : UP;
  return { point, direction };
}

/** Côté de la forme le plus proche d'un point d'attache. */
function sideDirection(b: Rect, p: Point): Direction {
  const distances: Array<[number, Direction]> = [
    [Math.abs(p.x - b.x), LEFT],
    [Math.abs(b.x + b.width - p.x), RIGHT],
    [Math.abs(p.y - b.y), UP],
    [Math.abs(b.y + b.height - p.y), DOWN],
  ];
  distances.sort((a, c) => a[0] - c[0]);
  return distances[0]![1];
}

function terminalCenter(terminal: Terminal | undefined): Point | undefined {
  if (!terminal) return undefined;
  const b = terminal.bounds;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Intersection du contour avec la demi-droite partant du centre vers `toward`. */
export function perimeterToward(terminal: Terminal | undefined, toward: Point | undefined): Point | undefined {
  const center = terminalCenter(terminal);
  if (!terminal || !center) return undefined;
  if (!toward) return center;
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (dx === 0 && dy === 0) return center;
  const hw = terminal.bounds.width / 2;
  const hh = terminal.bounds.height / 2;

  if (terminal.perimeter === 'ellipse') {
    if (hw === 0 || hh === 0) return center;
    const t = 1 / Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh));
    return { x: center.x + dx * t, y: center.y + dy * t };
  }
  const t = Math.min(dx !== 0 ? hw / Math.abs(dx) : Infinity, dy !== 0 ? hh / Math.abs(dy) : Infinity);
  return { x: center.x + dx * t, y: center.y + dy * t };
}

function ahead(origin: Point, direction: Direction, point: Point): boolean {
  return (point.x - origin.x) * direction.x + (point.y - origin.y) * direction.y > 0;
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
