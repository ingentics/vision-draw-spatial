import { setCellStyleValue, setEdgeTerminal } from '../format/cellEdits';
import type { PageTree } from '../format/xmlTree';
import type { EdgeModel, PageModel, Point, Rect, ShapeModel } from '../model/types';
import type { ShapeRegistry } from '../shapes/registry';
import { clamp } from '../model/numbers';
import { styleNumber } from '../model/styleValues';
import type { ReadonlyEdgeModel } from '../model/readonly';
import { distance } from '../model/geometry';
import { toTerminal } from '../render/edges/terminal';
import { fixedAnchor } from '../render/edges/route';

/**
 * Extrémités d'une flèche (SPEC §8.3, §14.1) : d'où elle part et où elle arrive, comme draw.io.
 * Une extrémité est soit attachée à une forme, en **auto** (le tracé choisit le côté) ou sur un
 * **point de connexion fixe** (`exitX/exitY` pour la source, `entryX/entryY` pour la cible), soit
 * **libre** (un point de la page).
 */

export type TerminalEnd = 'source' | 'target';

export type EndAttachment =
  | { kind: 'floating'; shapeId: string }
  | { kind: 'fixed'; shapeId: string; constraint: Point }
  | { kind: 'free'; point: Point };

/** Côté du cadre d'une forme (point d'ancrage, poignée de connexion, départ d'un tracé). */
export type Side = 'n' | 'e' | 's' | 'w';

/** Les quatre côtés, dans l'ordre des aiguilles d'une montre depuis le haut (ordre d'affichage des poignées). */
export const SIDES: readonly Side[] = ['n', 'e', 's', 'w'];

/** Normale sortante de chaque côté, vers l'extérieur de la forme (y vers le bas). */
export const SIDE_NORMALS: Readonly<Record<Side, Point>> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};

/** Point relatif au cadre à la position `t` d'un côté (de gauche à droite, de haut en bas). */
export function pointOnSide(side: Side, t: number): Point {
  if (side === 'n') return { x: t, y: 0 };
  if (side === 's') return { x: t, y: 1 };
  if (side === 'e') return { x: 1, y: t };
  return { x: 0, y: t };
}

/** Milieu d'un côté, relatif au cadre (point de sortie d'une poignée de connexion). */
export function sideMiddle(side: Side): Point {
  return pointOnSide(side, 0.5);
}

/** Segment d'un côté sur la page, de son début à sa fin (de gauche à droite, de haut en bas). */
export function sideSegment(bounds: Rect, side: Side): [Point, Point] {
  const at = (c: Point) => ({ x: bounds.x + c.x * bounds.width, y: bounds.y + c.y * bounds.height });
  return [at(pointOnSide(side, 0)), at(pointOnSide(side, 1))];
}

/** Point d'ancrage proposé sur une forme : relatif à ses bornes, pris par une flèche ou libre. */
export interface Anchor {
  constraint: Point;
  side?: Side;
  used: boolean;
}

/** Côté du cadre sur lequel tombe un point relatif (un coin compte pour le haut ou le bas) ; undefined à l'intérieur. */
export function sideOfConstraint(c: Point): Side | undefined {
  if (c.y === 0) return 'n';
  if (c.y === 1) return 's';
  if (c.x === 1) return 'e';
  if (c.x === 0) return 'w';
  return undefined;
}

/** Position le long du côté (0 → 1, de gauche à droite ou de haut en bas). */
function alongSide(side: Side, c: Point): number {
  return side === 'n' || side === 's' ? c.x : c.y;
}

/**
 * Points libres d'un côté (mode manuel) : milieu de chaque intervalle entre les coins et les ancres prises, pour
 * qu'il reste toujours un point libre entre deux ancres. Sans ancre prise : le milieu.
 */
export function freeAnchorPositions(used: number[]): number[] {
  const cuts = [...new Set([0, ...used.filter((t) => t >= 0 && t <= 1), 1])].sort((a, b) => a - b);
  return cuts.slice(1).map((t, i) => (cuts[i]! + t) / 2);
}

/**
 * Point touché sur une forme, relatif à son cadre et ramené sur le côté le plus proche (bout en attache auto, dont
 * le tracé choisit le point) ; position le long du côté arrondie au millième.
 */
export function frameConstraint(bounds: Rect, point: Point): Point {
  const x = clamp(bounds.width > 0 ? (point.x - bounds.x) / bounds.width : 0.5, 0, 1);
  const y = clamp(bounds.height > 0 ? (point.y - bounds.y) / bounds.height : 0.5, 0, 1);
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const nearest = Math.min(y, 1 - y, x, 1 - x);
  if (nearest === y) return { x: round(x), y: 0 };
  if (nearest === 1 - y) return { x: round(x), y: 1 };
  if (nearest === 1 - x) return { x: 1, y: round(y) };
  return { x: 0, y: round(y) };
}

/**
 * Point relatif sur le côté gauche ou droit de `bounds` à la hauteur `y` (page), côté le plus proche de `from` (à
 * égalité, le droit) ; `y` ramené dans le cadre (sujet 333, ex. centre de la ligne d'un champ). Arrondi au millième.
 */
export function sideConstraintAt(bounds: Rect, y: number, from: Point): Point {
  const t = bounds.height > 0 ? clamp((y - bounds.y) / bounds.height, 0, 1) : 0.5;
  const left = from.x < bounds.x + bounds.width / 2;
  return { x: left ? 0 : 1, y: Math.round(t * 1000) / 1000 };
}

export interface AnchorOptions {
  /** Bout de flèche en cours de déplacement : sa position du moment ne compte pas. */
  skip?: { edgeId: string; end: TerminalEnd };
  /** Ancres prises en plus (ex. point d'origine du bout déplacé). */
  extra?: readonly Point[];
  /** Point touché par un bout en attache auto, relatif au cadre de la forme (`frameConstraint`). */
  floatingAt?: (edge: EdgeModel, end: TerminalEnd) => Point | undefined;
}

/**
 * Points d'ancrage d'une forme (mode manuel) : ancres prises par les bouts des flèches (point fixe, ou point touché
 * par une attache auto), plus les points libres de chaque côté (`freeAnchorPositions`).
 */
export function shapeAnchors(shapeId: string, edges: readonly EdgeModel[], options: AnchorOptions = {}): Anchor[] {
  const { skip } = options;
  const taken: Point[] = [...(options.extra ?? [])];
  for (const edge of edges)
    for (const end of ['source', 'target'] as const) {
      if (skip && skip.edgeId === edge.id && skip.end === end) continue;
      const attachment = endAttachmentOf(edge, end);
      if (attachment?.kind === 'fixed' && attachment.shapeId === shapeId) taken.push(attachment.constraint);
      else if (attachment?.kind === 'floating' && attachment.shapeId === shapeId) {
        const point = options.floatingAt?.(edge, end);
        if (point) taken.push(point);
      }
    }
  const used: Anchor[] = [];
  for (const constraint of taken)
    if (!used.some((a) => a.constraint.x === constraint.x && a.constraint.y === constraint.y))
      used.push({ constraint, side: sideOfConstraint(constraint), used: true });
  const anchors: Anchor[] = [];
  for (const side of SIDES) {
    const taken = used.filter((a) => a.side === side);
    const free = freeAnchorPositions(taken.map((a) => alongSide(side, a.constraint)));
    anchors.push(
      ...[...taken, ...free.map((t) => ({ constraint: pointOnSide(side, t), side, used: false }))].sort(
        (a, b) => alongSide(side, a.constraint) - alongSide(side, b.constraint),
      ),
    );
  }
  // Ancres prises hors du cadre (point intérieur venu de draw.io) : gardées, accrochables.
  return [...anchors, ...used.filter((a) => !a.side)];
}

/** Position d'un point d'ancrage sur la page, projeté sur le contour de la forme comme le tracé. */
export function anchorPosition(shape: ShapeModel, constraint: Point): Point {
  const terminal = toTerminal(shape);
  const style = { exitX: String(constraint.x), exitY: String(constraint.y) };
  return (
    (terminal && fixedAnchor(terminal, style, 'source')) ?? {
      x: shape.bounds.x + constraint.x * shape.bounds.width,
      y: shape.bounds.y + constraint.y * shape.bounds.height,
    }
  );
}

/**
 * Point d'ancrage libre d'une forme parmi `anchors` (`shapeAnchors`), sur un côté donné ou sur tous, le plus proche
 * d'un point de la page ; à distance égale, le premier.
 */
export function nearestFreeAnchor(
  shape: ShapeModel,
  anchors: readonly Anchor[],
  toward: Point,
  side?: Side,
): { constraint: Point; point: Point } | undefined {
  let best: { constraint: Point; point: Point; distance: number } | undefined;
  for (const anchor of anchors) {
    if (anchor.used || !anchor.side || (side && anchor.side !== side)) continue;
    const point = anchorPosition(shape, anchor.constraint);
    const d = distance(point, toward);
    if (!best || d < best.distance) best = { constraint: anchor.constraint, point, distance: d };
  }
  return best && { constraint: best.constraint, point: best.point };
}

/**
 * Formes auxquelles on peut attacher une flèche : visibles, sur un calque visible, et qui l'acceptent d'après leur
 * définition (pas un groupe invisible).
 */
export function connectableShapes(page: PageModel, shapes: Pick<ShapeRegistry, 'isConnectable'>): ShapeModel[] {
  const hiddenLayers = new Set(page.layers.filter((l) => !l.visible).map((l) => l.id));
  return page.shapes.filter((s) => s.visible && !hiddenLayers.has(s.layerId) && shapes.isConnectable(s));
}

/** Préfixe des clés de style du point d'attache : `exit…` pour la source, `entry…` pour la cible. */
export function constraintPrefix(end: TerminalEnd): 'exit' | 'entry' {
  return end === 'source' ? 'exit' : 'entry';
}

/** Clés de style du point d'attache ; undefined = retirées (attache auto ou extrémité libre). */
export function constraintStyle(end: TerminalEnd, constraint: Point | undefined): Record<string, string | undefined> {
  const prefix = constraintPrefix(end);
  return {
    [`${prefix}X`]: constraint ? String(constraint.x) : undefined,
    [`${prefix}Y`]: constraint ? String(constraint.y) : undefined,
    [`${prefix}Dx`]: constraint ? '0' : undefined,
    [`${prefix}Dy`]: constraint ? '0' : undefined,
    [`${prefix}Perimeter`]: undefined,
  };
}

/** Attache actuelle d'une extrémité ; undefined si elle n'a ni forme ni point. */
export function endAttachmentOf(edge: ReadonlyEdgeModel, end: TerminalEnd): EndAttachment | undefined {
  const shapeId = end === 'source' ? edge.sourceId : edge.targetId;
  if (shapeId) {
    const prefix = constraintPrefix(end);
    // NaN : pas de point fixe (bout flottant).
    const x = styleNumber(edge.style, `${prefix}X`, NaN);
    const y = styleNumber(edge.style, `${prefix}Y`, NaN);
    return Number.isFinite(x) && Number.isFinite(y)
      ? { kind: 'fixed', shapeId, constraint: { x, y } }
      : { kind: 'floating', shapeId };
  }
  const point = end === 'source' ? edge.sourcePoint : edge.targetPoint;
  return point && { kind: 'free', point: { ...point } };
}

export function sameAttachment(a: EndAttachment | undefined, b: EndAttachment | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.kind === 'free') return b.kind === 'free' && a.point.x === b.point.x && a.point.y === b.point.y;
  if (b.kind === 'free' || a.shapeId !== b.shapeId) return false;
  if (a.kind === 'floating') return b.kind === 'floating';
  return b.kind === 'fixed' && a.constraint.x === b.constraint.x && a.constraint.y === b.constraint.y;
}

/** Applique une attache au modèle (aperçu en direct ; l'arbre XML est écrit à la fin du glisser). */
export function applyEndAttachment(edge: EdgeModel, end: TerminalEnd, attachment: EndAttachment): void {
  const constraint = attachment.kind === 'fixed' ? attachment.constraint : undefined;
  for (const [key, value] of Object.entries(constraintStyle(end, constraint))) {
    if (value === undefined) delete edge.style[key];
    else edge.style[key] = value;
  }
  const shapeId = attachment.kind === 'free' ? undefined : attachment.shapeId;
  if (end === 'source') edge.sourceId = shapeId;
  else edge.targetId = shapeId;
  if (attachment.kind === 'free') {
    if (end === 'source') edge.sourcePoint = { ...attachment.point };
    else edge.targetPoint = { ...attachment.point };
  }
}

/** Copie des champs d'une flèche que le glisser d'une extrémité modifie, pour les remettre en place. */
export interface EdgeEndsSnapshot {
  sourceId?: string;
  targetId?: string;
  sourcePoint?: Point;
  targetPoint?: Point;
  style: Record<string, string>;
}

export function snapshotEnds(edge: EdgeModel): EdgeEndsSnapshot {
  return {
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    sourcePoint: edge.sourcePoint && { ...edge.sourcePoint },
    targetPoint: edge.targetPoint && { ...edge.targetPoint },
    style: { ...edge.style },
  };
}

export function restoreEnds(edge: EdgeModel, snapshot: EdgeEndsSnapshot): void {
  edge.sourceId = snapshot.sourceId;
  edge.targetId = snapshot.targetId;
  edge.sourcePoint = snapshot.sourcePoint && { ...snapshot.sourcePoint };
  edge.targetPoint = snapshot.targetPoint && { ...snapshot.targetPoint };
  edge.style = { ...snapshot.style };
}

/**
 * Écrit l'attache d'un bout de flèche dans l'arbre XML : cellule ou point libre (dans le repère du
 * parent de la flèche, groupe ou conteneur, comme draw.io), et clés `exit…` / `entry…` du style.
 */
export function writeEndAttachment(
  pageTree: PageTree,
  page: PageModel,
  edge: EdgeModel,
  end: TerminalEnd,
  attachment: EndAttachment,
): void {
  if (attachment.kind === 'free') {
    const origin = page.shapes.find((s) => s.id === edge.parentId)?.bounds ?? { x: 0, y: 0 };
    setEdgeTerminal(pageTree, edge.id, end, {
      point: { x: attachment.point.x - origin.x, y: attachment.point.y - origin.y },
    });
  } else {
    setEdgeTerminal(pageTree, edge.id, end, { cellId: attachment.shapeId });
  }
  const constraint = attachment.kind === 'fixed' ? attachment.constraint : undefined;
  for (const [key, value] of Object.entries(constraintStyle(end, constraint)))
    setCellStyleValue(pageTree, edge.id, key, value);
}
