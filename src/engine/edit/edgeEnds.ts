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

/** Points de connexion d'une forme, relatifs à ses bornes : milieux des côtés (haut, droite, bas, gauche). */
export const CONNECTION_POINTS: readonly Point[] = [
  { x: 0.5, y: 0 },
  { x: 1, y: 0.5 },
  { x: 0.5, y: 1 },
  { x: 0, y: 0.5 },
];

export function connectionPoints(bounds: Rect): Point[] {
  return CONNECTION_POINTS.map((c) => ({ x: bounds.x + c.x * bounds.width, y: bounds.y + c.y * bounds.height }));
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
