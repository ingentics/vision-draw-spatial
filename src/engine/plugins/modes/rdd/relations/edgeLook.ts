import { SIDE_NORMALS, center, sideOfConstraint, styleNumber } from '../../../../core/plugins';
import type { EdgeModel, ModeEdit, Point, ShapeModel } from '../../../../core/plugins';
import type { Field } from '../tables/fieldModel';
import type { EdgeLook } from './kinds/kind';
import type { RelationIndex } from './relationKinds';
import { indexedRelationKind, relationIndex, relationSettings } from './relationKinds';

/**
 * Écriture d'une flèche de relation (sujets 265, 268, 278) : le seul écrivain de ses pointes, de leurs remplissages, de
 * ses textes de bout et de son trait (textes dans le style de base des textes de début / fin), et de sa remise à sa
 * sorte.
 */

/** Marge des textes en plus des écarts des paramètres : hors du cercle et des barres des pointes ER. */
const TEXT_MARGIN = { along: 4, across: 4 };

/**
 * Sens de la flèche en quittant la forme de ce bout : normale du côté où elle s'attache. Point d'attache fixe
 * (`exitX/exitY`, `entryX/entryY`) s'il y en a un ; sinon le côté que traverse la droite du centre de la forme vers le
 * premier coude (ou le centre de l'autre forme), comme une attache auto.
 */
function leavingDirection(shapes: ReadonlyMap<string, ShapeModel>, edge: EdgeModel, end: 'source' | 'target'): Point {
  const own = shapes.get((end === 'source' ? edge.sourceId : edge.targetId) ?? '');
  const other = shapes.get((end === 'source' ? edge.targetId : edge.sourceId) ?? '');
  const prefix = end === 'source' ? 'exit' : 'entry';
  const fixed = {
    x: styleNumber(edge.style, `${prefix}X`, NaN),
    y: styleNumber(edge.style, `${prefix}Y`, NaN),
  };
  const fixedSide = Number.isFinite(fixed.x) && Number.isFinite(fixed.y) ? sideOfConstraint(fixed) : undefined;
  if (fixedSide) return SIDE_NORMALS[fixedSide];
  const bend = end === 'source' ? edge.points[0] : edge.points[edge.points.length - 1];
  const toward: Point | undefined = bend ?? (other && center(other.bounds));
  if (!own || !toward) return SIDE_NORMALS.e;
  const from = center(own.bounds);
  const dx = (toward.x - from.x) / Math.max(own.bounds.width, 1);
  const dy = (toward.y - from.y) / Math.max(own.bounds.height, 1);
  if (Math.abs(dx) >= Math.abs(dy)) return SIDE_NORMALS[dx < 0 ? 'w' : 'e'];
  return SIDE_NORMALS[dy < 0 ? 'n' : 's'];
}

/**
 * Apparence `look` écrite sur la flèche `edgeId`, toutes clés comprises : pointes, remplissages retirés (propres aux
 * pointes de draw.io), tirets, textes des deux bouts (absents : retirés) ; `index` : celui de l'opération en cours.
 */
export function writeEdgeLook(edit: ModeEdit, edgeId: string, look: EdgeLook, index: RelationIndex): void {
  const edge = index.edges.get(edgeId);
  if (!edge) return;
  edit.setElementStyle(edgeId, 'startArrow', look.startArrow);
  edit.setElementStyle(edgeId, 'endArrow', look.endArrow);
  edit.setElementStyle(edgeId, 'startFill', undefined);
  edit.setElementStyle(edgeId, 'endFill', undefined);
  edit.setElementStyle(edgeId, 'dashed', look.dashed ? '1' : undefined);
  edit.setEdgeEndText(edgeId, 'start', look.startText, leavingDirection(index.shapes, edge, 'source'), TEXT_MARGIN);
  edit.setEdgeEndText(edgeId, 'end', look.endText, leavingDirection(index.shapes, edge, 'target'), TEXT_MARGIN);
}

/**
 * Flèche de relation remise à sa sorte : son apparence, d'après son champ (`field`, absent pour une sorte sans champ),
 * et les réglages des autres sortes retirés (flèche qui a changé de sorte). `settings` : passés quand l'opération vient
 * de les changer (`edit.page` ne le montre pas encore) ; `index` : celui de l'opération en cours, s'il est calculé.
 */
export function writeRelationEdge(
  edit: ModeEdit,
  edgeId: string,
  field?: Field,
  settings = relationSettings(edit.page),
  index = relationIndex(edit.page),
): void {
  const edge = index.edges.get(edgeId);
  const kind = edge && indexedRelationKind(index, edge);
  if (!kind) return;
  writeEdgeLook(edit, edgeId, kind.look(field, settings), index);
  for (const other of index.kinds)
    if (other !== kind)
      for (const property of other.properties ?? []) edit.setElementAttribute(edgeId, property.key, undefined);
}
