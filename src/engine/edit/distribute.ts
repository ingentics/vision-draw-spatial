import type { EdgeModel, PageModel, Point, Rect } from '../model/types';
import { endAttachmentOf, sideOfConstraint } from './edgeEnds';
import type { AnchorSide, TerminalEnd } from './edgeEnds';

/**
 * Ancrage automatique des flèches (SPEC §14.1) : l'utilisateur ne choisit que le côté d'une forme, et les flèches
 * d'un côté y sont réparties à 1/(n+1), 2/(n+1)…, ordonnées par la position de leur autre bout le long du côté pour
 * ne pas se croiser.
 */

export type Anchoring = 'manual' | 'auto';

/** Nouveau point d'attache d'un bout de flèche, relatif au cadre de sa forme. */
export interface AnchorChange {
  edgeId: string;
  end: TerminalEnd;
  constraint: Point;
}

function center(b: Rect): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Côté du cadre qui fait face à un point (direction depuis le centre, rapportée aux dimensions). */
export function facingSide(bounds: Rect, toward: Point): AnchorSide {
  const c = center(bounds);
  const dx = (toward.x - c.x) / Math.max(bounds.width, 1);
  const dy = (toward.y - c.y) / Math.max(bounds.height, 1);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'e' : 'w';
  return dy >= 0 ? 's' : 'n';
}

/** Point relatif au cadre à la position `t` d'un côté (de gauche à droite, de haut en bas). */
export function pointOnSide(side: AnchorSide, t: number): Point {
  if (side === 'n') return { x: t, y: 0 };
  if (side === 's') return { x: t, y: 1 };
  if (side === 'e') return { x: 1, y: t };
  return { x: 0, y: t };
}

/** Milieu d'un côté. */
export function sideMiddle(side: AnchorSide): Point {
  return pointOnSide(side, 0.5);
}

/**
 * Point vers lequel part un bout de flèche : son point intermédiaire le plus proche s'il y en a, sinon l'autre bout
 * (point d'attache fixe, centre de la forme, ou point libre).
 */
function reference(page: PageModel, edge: EdgeModel, end: TerminalEnd): Point | undefined {
  if (edge.points.length > 0) return end === 'source' ? edge.points[0] : edge.points[edge.points.length - 1];
  const other: TerminalEnd = end === 'source' ? 'target' : 'source';
  const attachment = endAttachmentOf(edge, other);
  if (!attachment) return undefined;
  if (attachment.kind === 'free') return attachment.point;
  const shape = page.shapes.find((s) => s.id === attachment.shapeId);
  if (!shape) return undefined;
  const b = shape.bounds;
  if (attachment.kind === 'fixed')
    return { x: b.x + attachment.constraint.x * b.width, y: b.y + attachment.constraint.y * b.height };
  return center(b);
}

const round = (v: number) => Math.round(v * 10000) / 10000;

/**
 * Répartition des bouts de flèches attachés aux formes `shapeIds` : regroupés par côté (point fixe sur le cadre, ou
 * attache auto rangée sur le côté qui fait face à son autre bout), ordonnés le long du côté par leur point de
 * référence, placés à (k + 1) / (n + 1). Ne renvoie que les bouts qui changent.
 */
export function distributeAnchors(page: PageModel, shapeIds: ReadonlySet<string>): AnchorChange[] {
  const shapes = new Map(page.shapes.map((s) => [s.id, s]));
  const groups = new Map<
    string,
    Array<{ edgeId: string; end: TerminalEnd; along: number; current?: Point; side: AnchorSide }>
  >();
  for (const edge of page.edges)
    for (const end of ['source', 'target'] as const) {
      const attachment = endAttachmentOf(edge, end);
      if (!attachment || attachment.kind === 'free' || !shapeIds.has(attachment.shapeId)) continue;
      const shape = shapes.get(attachment.shapeId);
      if (!shape) continue;
      const toward = reference(page, edge, end) ?? center(shape.bounds);
      const side =
        attachment.kind === 'fixed' ? sideOfConstraint(attachment.constraint) : facingSide(shape.bounds, toward);
      // Point fixe à l'intérieur de la forme (venu de draw.io) : laissé tel quel.
      if (!side) continue;
      const key = `${shape.id}\u0000${side}`;
      const along = side === 'n' || side === 's' ? toward.x : toward.y;
      const current = attachment.kind === 'fixed' ? attachment.constraint : undefined;
      groups.set(key, [...(groups.get(key) ?? []), { edgeId: edge.id, end, along, current, side }]);
    }
  const changes: AnchorChange[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.along - b.along || a.edgeId.localeCompare(b.edgeId) || a.end.localeCompare(b.end));
    group.forEach(({ edgeId, end, current, side }, k) => {
      const constraint = pointOnSide(side, round((k + 1) / (group.length + 1)));
      if (!current || current.x !== constraint.x || current.y !== constraint.y)
        changes.push({ edgeId, end, constraint });
    });
  }
  return changes;
}

/**
 * Empreinte de la géométrie d'une page (bornes des formes, bouts et points des flèches), copiée : le moteur modifie
 * le modèle en direct pendant un glisser, l'empreinte garde l'état d'avant l'édition.
 */
export interface PageGeometry {
  shapes: Map<string, Rect>;
  edges: Map<string, { ends: string[]; signature: string }>;
}

export function pageGeometry(page: PageModel): PageGeometry {
  return {
    shapes: new Map(page.shapes.map((s) => [s.id, { ...s.bounds }])),
    edges: new Map(
      page.edges.map((edge) => [
        edge.id,
        {
          ends: [edge.sourceId, edge.targetId].filter((id): id is string => !!id),
          signature: JSON.stringify([
            edge.sourceId,
            edge.targetId,
            edge.points,
            ...['exitX', 'exitY', 'entryX', 'entryY'].map((k) => edge.style[k]),
          ]),
        },
      ]),
    ),
  };
}

/**
 * Formes dont la répartition peut changer après une édition : formes ajoutées, déplacées ou redimensionnées, bouts
 * des flèches ajoutées, retirées ou rattachées, puis les formes à l'autre bout de leurs flèches (l'ordre sur leurs
 * côtés dépend de la position de celles-ci).
 */
export function affectedShapes(before: PageGeometry | undefined, after: PageModel): Set<string> {
  const touched = new Set<string>();
  const now = pageGeometry(after);
  for (const [id, b] of now.shapes) {
    const old = before?.shapes.get(id);
    if (!old || old.x !== b.x || old.y !== b.y || old.width !== b.width || old.height !== b.height) touched.add(id);
  }
  for (const [id, edge] of now.edges) {
    const old = before?.edges.get(id);
    if (!old || old.signature !== edge.signature)
      for (const end of [...edge.ends, ...(old?.ends ?? [])]) touched.add(end);
  }
  for (const [id, old] of before?.edges ?? []) if (!now.edges.has(id)) for (const end of old.ends) touched.add(end);
  const affected = new Set(touched);
  for (const { ends } of now.edges.values()) {
    const [a, b] = ends;
    if (a && b && touched.has(a)) affected.add(b);
    if (a && b && touched.has(b)) affected.add(a);
  }
  return new Set([...affected].filter((id) => now.shapes.has(id)));
}
