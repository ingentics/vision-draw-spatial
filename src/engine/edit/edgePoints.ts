import type { Point, Rect } from '../model/types';
import { routingKind } from '../render/edges/route';

/**
 * Découpage d'une flèche en morceaux (SPEC §14.1) : poignées entre les bouts et points intermédiaires
 * qu'elles écrivent, **portés de draw.io** (mxGraph, Apache 2.0 : `mxEdgeSegmentHandler`,
 * `mxElbowEdgeHandler`, `mxEdgeHandler`) pour qu'un point posé ici donne le même tracé dans draw.io.
 *
 * Trois éditeurs, selon le style de la flèche :
 * - **segments** (orthogonal, `segmentEdgeStyle`) : une poignée au milieu de chaque segment, qui le
 *   déplace perpendiculairement ; les points écrits sont les coudes du nouveau tracé ;
 * - **coude** (`elbowEdgeStyle`, côte à côte, haut en bas, boucle) : une seule poignée, qui fixe le coude ;
 * - **points** (droit) : une poignée par point intermédiaire, et une « virtuelle » au milieu de chaque
 *   morceau qui en ajoute un ; un point remis dans l'alignement de ses voisins, ou posé sur une autre
 *   poignée, disparaît.
 */

export type PointsEditor = 'segments' | 'elbow' | 'points';

/** Éditeur de la flèche (mxGraph.createEdgeHandler). */
export function pointsEditor(style: Record<string, string>): PointsEditor {
  const { kind } = routingKind(style);
  if (kind === 'orthogonal' || kind === 'segment') return 'segments';
  if (kind === 'elbow' || kind === 'sideToSide' || kind === 'topToBottom' || kind === 'loop') return 'elbow';
  return 'points';
}

/**
 * Poignée entre les bouts. `index` suit la numérotation de draw.io : pour les segments, le segment
 * `[pts[index - 1], pts[index]]` ; pour un point, son rang dans le tracé (1 = premier point
 * intermédiaire) ; pour une poignée virtuelle, le morceau `[pts[index], pts[index + 1]]` où insérer.
 */
export interface PointHandle {
  kind: 'segment' | 'elbow' | 'point' | 'virtual';
  index: number;
  point: Point;
  /** Segment vertical (se déplace en x) : curseur `col-resize` ; horizontal : `row-resize`. */
  vertical?: boolean;
  /** Poignée secondaire, affichée en transparence (milieux d'un tracé droit, poignées virtuelles). */
  faded?: boolean;
}

/** Ce que les éditeurs savent de la flèche : tracé brut, points enregistrés, formes et points d'appui. */
export interface PointsContext {
  editor: PointsEditor;
  /** Tracé brut (`routeEdgePoints`), bouts compris. */
  route: Point[];
  /** Points intermédiaires enregistrés (coordonnées de page). */
  waypoints: Point[];
  source?: Rect;
  target?: Rect;
  /**
   * Point d'appui de chaque bout : point d'attache imposé, sinon centre de la forme ; absent pour un
   * bout libre (on garde alors le bout du tracé).
   */
  sourceAnchor?: Point;
  targetAnchor?: Point;
  /** Vrai si le bout est attaché sur un point imposé (`exitX`…). */
  sourceFixed?: boolean;
  targetFixed?: boolean;
  /** Recalcule le tracé brut avec d'autres points intermédiaires. */
  reroute: (waypoints: Point[]) => Point[];
  /** Tolérance d'alignement (mxGraph.tolerance, 4 px écran), en unités de page. */
  tolerance: number;
  /** Demi-côté d'une poignée, en unités de page (un point lâché sur une autre poignée est retiré). */
  handleRadius: number;
}

const round = (v: number) => Math.round(v);
const roundPoint = (p: Point): Point => ({ x: round(p.x), y: round(p.y) });

/** Tracé vu par les poignées de segments : un tracé droit reçoit deux points au milieu (mxEdgeSegmentHandler). */
function currentPoints(route: Point[]): Point[] {
  const pts = route;
  const tol = 1;
  if (
    pts.length === 2 ||
    (pts.length === 3 &&
      ((Math.abs(pts[0]!.x - pts[1]!.x) < tol && Math.abs(pts[1]!.x - pts[2]!.x) < tol) ||
        (Math.abs(pts[0]!.y - pts[1]!.y) < tol && Math.abs(pts[1]!.y - pts[2]!.y) < tol)))
  ) {
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    const c = { x: first.x + (last.x - first.x) / 2, y: first.y + (last.y - first.y) / 2 };
    return [first, c, { ...c }, last];
  }
  return pts;
}

/** Poignées entre les bouts de la flèche. */
export function pointHandles(ctx: Pick<PointsContext, 'editor' | 'route' | 'waypoints'>): PointHandle[] {
  const { route } = ctx;
  if (route.length < 2) return [];
  if (ctx.editor === 'elbow') {
    // Au milieu du tracé, entre le premier et le dernier coude (mxElbowEdgeHandler.redrawInnerBends).
    const p0 = route.length > 1 ? route[1]! : route[0]!;
    const pe = route.length > 1 ? route[route.length - 2]! : route[route.length - 1]!;
    return [{ kind: 'elbow', index: 1, point: { x: p0.x + (pe.x - p0.x) / 2, y: p0.y + (pe.y - p0.y) / 2 } }];
  }
  if (ctx.editor === 'segments') {
    const pts = currentPoints(route).map((p) => ({ ...p }));
    let straight = false;
    // Tracé droit : poignée du milieu au centre, les deux autres en transparence.
    if (pts.length === 4 && round(pts[1]!.x - pts[2]!.x) === 0 && round(pts[1]!.y - pts[2]!.y) === 0) {
      straight = true;
      const first = pts[0]!;
      const last = pts[pts.length - 1]!;
      if (round(first.y - last.y) === 0) {
        const cx = first.x + (last.x - first.x) / 2;
        pts[1]!.x = cx;
        pts[2]!.x = cx;
      } else {
        const cy = first.y + (last.y - first.y) / 2;
        pts[1]!.y = cy;
        pts[2]!.y = cy;
      }
    }
    const handles: PointHandle[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      let vertical = round(a.x - b.x) === 0;
      if (round(a.y - b.y) === 0 && i < pts.length - 2) vertical = round(a.x - pts[i + 2]!.x) === 0;
      handles.push({
        kind: 'segment',
        index: i + 1,
        point: { x: a.x + (b.x - a.x) / 2, y: a.y + (b.y - a.y) / 2 },
        vertical,
        faded: straight && i !== 1,
      });
    }
    return handles;
  }
  // Droit : un point par point intermédiaire, une poignée virtuelle au milieu de chaque morceau.
  const handles: PointHandle[] = [];
  for (let i = 1; i < route.length - 1; i++) handles.push({ kind: 'point', index: i, point: { ...route[i]! } });
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i]!;
    const b = route[i + 1]!;
    handles.push({
      kind: 'virtual',
      index: i,
      point: { x: a.x + (b.x - a.x) / 2, y: a.y + (b.y - a.y) / 2 },
      faded: true,
    });
  }
  return handles;
}

/**
 * Points intermédiaires écrits en tirant une poignée jusqu'à `pointer` (déjà aimanté à la grille),
 * calculés sur l'état de la flèche au début du glisser.
 */
export function dragPoints(ctx: PointsContext, handle: PointHandle, pointer: Point): Point[] {
  if (handle.kind === 'segment') return dragSegment(ctx, handle.index, pointer);
  return dragBend(ctx, handle, pointer);
}

/** mxEdgeSegmentHandler.getPreviewPoints puis updatePreviewState. */
function dragSegment(ctx: PointsContext, index: number, pointerIn: Point): Point[] {
  const pts = currentPoints(ctx.route);
  const point = roundPoint(pointerIn);
  let last = roundPoint(pts[0]!);
  let preview: Point[] = [];
  for (let i = 1; i < pts.length; i++) {
    const pt = roundPoint(pts[i]!);
    if (i === index) {
      if (round(last.x - pt.x) === 0) {
        last.x = point.x;
        pt.x = point.x;
      }
      if (round(last.y - pt.y) === 0) {
        last.y = point.y;
        pt.y = point.y;
      }
    }
    if (i < pts.length - 1) preview.push(pt);
    last = pt;
  }
  // Un seul point, dans la source ou la cible : remplacé par le pointeur (deux fois).
  if (preview.length === 1) {
    const p = preview[0]!;
    if ((ctx.source && contains(ctx.source, p)) || (ctx.target && contains(ctx.target, p))) preview = [point, point];
  }

  // Tracé obtenu, réduit à ses coudes.
  const routed = ctx.reroute(preview);
  let result = corners(routed);
  const original = ctx.route;
  if (
    result.length === 0 &&
    (round(routed[0]!.x - routed[routed.length - 1]!.x) === 0 ||
      round(routed[0]!.y - routed[routed.length - 1]!.y) === 0)
  ) {
    // Un tracé droit est représenté par deux points confondus.
    result = [point, { ...point }];
  } else if (
    routed.length === 5 &&
    result.length === 2 &&
    ctx.source &&
    ctx.target &&
    round(original[0]!.x - original[original.length - 1]!.x) === 0
  ) {
    // Passage d'un tracé droit vertical à un tracé à coudes.
    const y0 = (ctx.sourceAnchor ?? center(ctx.source)).y;
    const ye = (ctx.targetAnchor ?? center(ctx.target)).y;
    result = [
      { x: point.x, y: y0 },
      { x: point.x, y: ye },
    ];
  }
  return result;
}

/** Coudes d'un tracé : points intermédiaires où il tourne (segments alignés fusionnés). */
function corners(pts: Point[]): Point[] {
  const result: Point[] = [];
  if (pts.length < 3) return result;
  let pt0 = pts[0]!;
  let pt1 = pts[1]!;
  for (let i = 2; i < pts.length; i++) {
    const pt2 = pts[i]!;
    if (
      (round(pt0.x - pt1.x) !== 0 || round(pt1.x - pt2.x) !== 0) &&
      (round(pt0.y - pt1.y) !== 0 || round(pt1.y - pt2.y) !== 0)
    ) {
      result.push(roundPoint(pt1));
    }
    pt0 = pt1;
    pt1 = pt2;
  }
  return result;
}

/** mxEdgeHandler.getPreviewPoints : point existant, coude (une seule poignée) ou poignée virtuelle. */
function dragBend(ctx: PointsContext, handle: PointHandle, pointerIn: Point): Point[] {
  const point = roundPoint(pointerIn);
  const points = ctx.waypoints.map((p) => ({ ...p }));
  if (points.length === 0 && handle.kind !== 'virtual') return [point];
  // Rang du point dans `points`, et dans le tracé (pour l'alignement).
  const virtual = handle.kind === 'virtual';
  const pointIndex = virtual ? handle.index : handle.index - 1;
  if (virtual) points.splice(pointIndex, 0, point);

  // Posé sur une autre poignée de l'éditeur (bouts, autres points) : retiré.
  const others =
    ctx.editor === 'points'
      ? ctx.route.filter((_, i) => virtual || i !== handle.index)
      : [ctx.route[0]!, ctx.route[ctx.route.length - 1]!];
  const onOther = others.some(
    (p) => Math.abs(p.x - pointerIn.x) <= ctx.handleRadius && Math.abs(p.y - pointerIn.y) <= ctx.handleRadius,
  );
  if (onOther) {
    points.splice(pointIndex, 1);
    return points;
  }

  // Remis dans l'alignement de ses voisins : retiré (pas pour une poignée virtuelle, comme draw.io).
  if (!virtual) {
    const abs = ctx.route.map((p) => ({ ...p }));
    abs[handle.index] = pointerIn;
    if (!ctx.sourceFixed && ctx.sourceAnchor) abs[0] = ctx.sourceAnchor;
    if (!ctx.targetFixed && ctx.targetAnchor) abs[abs.length - 1] = ctx.targetAnchor;
    const idx = handle.index;
    if (
      idx > 0 &&
      idx < abs.length - 1 &&
      segmentDistanceSquared(abs[idx - 1]!, abs[idx + 1]!, pointerIn) < ctx.tolerance * ctx.tolerance
    ) {
      points.splice(idx - 1, 1);
      return points;
    }
    points[pointIndex] = point;
  }
  return points;
}

/** Retire le point intermédiaire de rang `index` dans le tracé (double-clic sur un point). */
export function removePoint(waypoints: Point[], index: number): Point[] {
  return waypoints.filter((_, i) => i !== index - 1);
}

function contains(r: Rect, p: Point): boolean {
  return r.x <= p.x && r.x + r.width >= p.x && r.y <= p.y && r.y + r.height >= p.y;
}

function center(r: Rect): Point {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/** Carré de la distance de `p` au segment `[a, b]` (mxUtils.ptSegDistSq). */
function segmentDistanceSquared(a: Point, b: Point, p: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  const x = a.x + t * dx - p.x;
  const y = a.y + t * dy - p.y;
  return x * x + y * y;
}
