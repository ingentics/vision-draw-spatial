import type { EdgeModel, PageModel, Point, Rect } from '../model/types';
import { endAttachmentOf, sideOfConstraint } from './edgeEnds';
import { seededUnit } from './seed';
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
 * Sens du côté pour un faisceau parcouru de la forme de départ vers celle d'arrivée : signe de la position le long
 * du côté (x pour haut / bas, y pour gauche / droite) dans la « gauche » du sens de parcours. Un faisceau ne se croise
 * pas si la gauche reste à gauche : même ordre aux deux bouts si les signes sont égaux, ordre inversé sinon.
 */
const LEFT_OUT: Record<AnchorSide, number> = { n: -1, e: -1, s: 1, w: 1 };
const LEFT_IN: Record<AnchorSide, number> = { n: 1, e: 1, s: -1, w: -1 };

/** Côté où se trouve un bout attaché à une forme (point fixe sur le cadre, ou côté qui fait face à `toward`). */
function endSide(page: PageModel, edge: EdgeModel, end: TerminalEnd, toward: Point): AnchorSide | undefined {
  const attachment = endAttachmentOf(edge, end);
  if (!attachment || attachment.kind === 'free') return undefined;
  if (attachment.kind === 'fixed') return sideOfConstraint(attachment.constraint);
  const shape = page.shapes.find((s) => s.id === attachment.shapeId);
  return shape && facingSide(shape.bounds, toward);
}

const round = (v: number) => Math.round(v * 10000) / 10000;

interface Slot {
  edgeId: string;
  end: TerminalEnd;
  /** Position de référence le long du côté (centre de la forme à l'autre bout, point libre, ou sa propre place). */
  along: number;
  /** Côté de l'autre bout (forme + côté), pour ordonner un faisceau. */
  other?: string;
  /** Sens d'un faisceau dans ce groupe : +1 = ids croissants, -1 = décroissants. */
  bundle: number;
  current?: Point;
  side: AnchorSide;
}

/**
 * Répartition des bouts de flèches attachés aux formes `shapeIds` : regroupés par côté (point fixe sur le cadre, ou
 * attache auto rangée sur le côté qui fait face à son autre bout), ordonnés le long du côté par la position de la
 * forme à l'autre bout (pas son point d'attache, qui dépend lui-même de la répartition), placés à (k + 1) / (n + 1).
 * Les flèches qui relient les deux mêmes côtés (faisceau) gardent un ordre cohérent aux deux bouts, sans croisement.
 * Les deux bouts d'une boucle sur un même côté y sont rangés ensemble, en fin de côté. Ne renvoie que les bouts qui
 * changent.
 */
export function distributeAnchors(page: PageModel, shapeIds: ReadonlySet<string>, seed = 0): AnchorChange[] {
  // Égalités (faisceaux, flèches vers une même forme) : ordre des ids, ou celui que donne la graine.
  const tie = (a: string, b: string) =>
    (seed === 0 ? 0 : seededUnit(seed, a) - seededUnit(seed, b)) || a.localeCompare(b);
  const shapes = new Map(page.shapes.map((s) => [s.id, s]));
  const groups = new Map<string, Slot[]>();
  for (const edge of page.edges)
    for (const end of ['source', 'target'] as const) {
      const attachment = endAttachmentOf(edge, end);
      if (!attachment || attachment.kind === 'free' || !shapeIds.has(attachment.shapeId)) continue;
      const shape = shapes.get(attachment.shapeId);
      if (!shape) continue;
      const otherEnd: TerminalEnd = end === 'source' ? 'target' : 'source';
      const otherAttachment = endAttachmentOf(edge, otherEnd);
      const otherShape =
        otherAttachment && otherAttachment.kind !== 'free' ? shapes.get(otherAttachment.shapeId) : undefined;
      const loop = otherShape?.id === shape.id;
      const current = attachment.kind === 'fixed' ? attachment.constraint : undefined;
      // Boucle : son autre bout s'il est sur un autre côté (la boucle passe par ce coin).
      const otherConstraint = otherAttachment?.kind === 'fixed' ? otherAttachment.constraint : undefined;
      const sameSide = !current || !otherConstraint || sideOfConstraint(current) === sideOfConstraint(otherConstraint);
      const placeOf = (c: Point) => ({
        x: shape.bounds.x + c.x * shape.bounds.width,
        y: shape.bounds.y + c.y * shape.bounds.height,
      });
      const toward = loop
        ? sameSide
          ? current
            ? placeOf(current)
            : center(shape.bounds)
          : placeOf(otherConstraint)
        : otherShape
          ? center(otherShape.bounds)
          : otherAttachment?.kind === 'free'
            ? otherAttachment.point
            : center(shape.bounds);
      const side = endSide(page, edge, end, toward);
      // Point fixe à l'intérieur de la forme (venu de draw.io) : laissé tel quel.
      if (!side) continue;
      const key = `${shape.id}\u0000${side}`;
      const otherSide = otherShape && !loop ? endSide(page, edge, otherEnd, center(shape.bounds)) : undefined;
      const other = otherShape && otherSide ? `${otherShape.id}\u0000${otherSide}` : undefined;
      // Faisceau parcouru du groupe de plus petite clé vers l'autre : ids croissants au départ, et à l'arrivée selon
      // que la gauche du parcours tombe du même côté de l'axe ou non.
      const first = other !== undefined && key < other;
      const bundle = other === undefined || first ? 1 : LEFT_OUT[otherSide!] * LEFT_IN[side] > 0 ? 1 : -1;
      // Boucle sur un seul côté : ses deux bouts côte à côte, en fin de côté (aucune flèche ne passe dans son U).
      const along = loop && sameSide ? Infinity : side === 'n' || side === 's' ? toward.x : toward.y;
      groups.set(key, [...(groups.get(key) ?? []), { edgeId: edge.id, end, along, other, bundle, current, side }]);
    }
  const changes: AnchorChange[] = [];
  for (const group of groups.values()) {
    group.sort(
      (a, b) =>
        (a.along === b.along ? 0 : a.along - b.along) ||
        (a.other !== undefined && a.other === b.other ? a.bundle * tie(a.edgeId, b.edgeId) : 0) ||
        tie(a.edgeId, b.edgeId) ||
        a.end.localeCompare(b.end),
    );
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

/** Formes `ids` et celles à l'autre bout de leurs flèches (l'ordre sur leurs côtés dépend des premières). */
export function withNeighbours(page: PageModel, ids: Iterable<string>): Set<string> {
  const result = new Set(ids);
  const touched = new Set(result);
  for (const edge of page.edges) {
    const [a, b] = [edge.sourceId, edge.targetId];
    if (a && b && touched.has(a)) result.add(b);
    if (a && b && touched.has(b)) result.add(a);
  }
  return result;
}

/** Graine d'agencement d'une page (`spatial.anchorSeed`, entier ≥ 0) ; 0 si absente ou invalide. */
export function anchorSeedOf(page: PageModel): number {
  const seed = Number.parseInt(page.attributes['spatial.anchorSeed'] ?? '', 10);
  return Number.isFinite(seed) && seed > 0 ? seed : 0;
}
