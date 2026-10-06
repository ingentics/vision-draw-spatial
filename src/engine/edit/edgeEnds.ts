import { setCellStyleValue, setEdgeTerminal } from '../format/edit';
import type { PageTree } from '../format/xmlTree';
import type { EdgeModel, PageModel, Point, Rect, ShapeModel } from '../model/types';
import type { ShapeRegistry } from '../shapes/registry';

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

/** Côté du cadre d'une forme. */
export type AnchorSide = 'n' | 'e' | 's' | 'w';

/** Normale sortante de chaque côté, vers l'extérieur de la forme. */
export const SIDE_NORMALS: Readonly<Record<AnchorSide, Point>> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};

/** Point d'ancrage proposé sur une forme : relatif à ses bornes, pris par une flèche ou libre. */
export interface Anchor {
  constraint: Point;
  side?: AnchorSide;
  used: boolean;
}

const ANCHOR_SIDES: readonly AnchorSide[] = ['n', 'e', 's', 'w'];

/** Côté du cadre sur lequel tombe un point relatif (un coin compte pour le haut ou le bas) ; undefined à l'intérieur. */
export function sideOfConstraint(c: Point): AnchorSide | undefined {
  if (c.y === 0) return 'n';
  if (c.y === 1) return 's';
  if (c.x === 1) return 'e';
  if (c.x === 0) return 'w';
  return undefined;
}

/** Position le long du côté (0 → 1, de gauche à droite ou de haut en bas). */
function alongSide(side: AnchorSide, c: Point): number {
  return side === 'n' || side === 's' ? c.x : c.y;
}

function onSide(side: AnchorSide, t: number): Point {
  if (side === 'n') return { x: t, y: 0 };
  if (side === 's') return { x: t, y: 1 };
  if (side === 'e') return { x: 1, y: t };
  return { x: 0, y: t };
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
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const x = clamp(bounds.width > 0 ? (point.x - bounds.x) / bounds.width : 0.5);
  const y = clamp(bounds.height > 0 ? (point.y - bounds.y) / bounds.height : 0.5);
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const nearest = Math.min(y, 1 - y, x, 1 - x);
  if (nearest === y) return { x: round(x), y: 0 };
  if (nearest === 1 - y) return { x: round(x), y: 1 };
  if (nearest === 1 - x) return { x: 1, y: round(y) };
  return { x: 0, y: round(y) };
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
  for (const side of ANCHOR_SIDES) {
    const taken = used.filter((a) => a.side === side);
    const free = freeAnchorPositions(taken.map((a) => alongSide(side, a.constraint)));
    anchors.push(
      ...[...taken, ...free.map((t) => ({ constraint: onSide(side, t), side, used: false }))].sort(
        (a, b) => alongSide(side, a.constraint) - alongSide(side, b.constraint),
      ),
    );
  }
  // Ancres prises hors du cadre (point intérieur venu de draw.io) : gardées, accrochables.
  return [...anchors, ...used.filter((a) => !a.side)];
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
export function endAttachmentOf(edge: EdgeModel, end: TerminalEnd): EndAttachment | undefined {
  const shapeId = end === 'source' ? edge.sourceId : edge.targetId;
  if (shapeId) {
    const prefix = constraintPrefix(end);
    const x = parseFloat(edge.style[`${prefix}X`] ?? '');
    const y = parseFloat(edge.style[`${prefix}Y`] ?? '');
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
