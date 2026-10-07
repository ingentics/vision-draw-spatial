import type { EdgeModel, PageModel, ShapeModel } from '../../../model/types';
import type { ModeEdit } from '../../types';
import type { Field } from '../fieldModel';
import { isTableKindId } from '../tableKinds';
import { shapeById } from '../tableTargets';
import { cardinalitiesShown } from './cardinalities';
import { writeEdgeLook } from './edgeLook';
import { embeddedRelation } from './embeddedRelation';
import type { RelationKind, RelationSettings } from './kind';
import { tableRelation } from './tableRelation';

/**
 * Sortes de relation du mode RDD (sujets 268, 278) : une flèche permise relie deux formes d'une même sorte, qui lui
 * impose son apparence et son formulaire. Une forme absente de toutes les sortes n'a aucune flèche (ni poignée de
 * connexion, ni cible).
 */
export const RELATION_KINDS: readonly RelationKind[] = [tableRelation, embeddedRelation];

/** Sorte de la relation de `source` vers `target` parmi `kinds` ; undefined si la flèche n'est pas permise. */
export function relationKindBetween(
  source: ShapeModel,
  target: ShapeModel,
  kinds: readonly RelationKind[] = RELATION_KINDS,
): RelationKind | undefined {
  if (!isTableKindId(source.kind) || !isTableKindId(target.kind)) return undefined;
  const from = source.kind;
  const to = target.kind;
  return kinds.find((kind) => kind.from.includes(from) && kind.to.includes(to));
}

/** Flèche permise de `source` vers `target` ? */
export const canLink = (source: ShapeModel, target: ShapeModel): boolean =>
  relationKindBetween(source, target) !== undefined;

/** Forme (kind) qui peut porter une flèche, au départ ou à l'arrivée. */
export const isLinkable = (shapeKind: string): boolean =>
  isTableKindId(shapeKind) &&
  RELATION_KINDS.some((kind) => kind.from.includes(shapeKind) || kind.to.includes(shapeKind));

/** Sorte de relation d'une flèche de la page ; undefined si elle ne relie pas deux formes qui peuvent être liées. */
export function relationKindOf(page: PageModel, edge: EdgeModel): RelationKind | undefined {
  const source = page.shapes.find((shape) => shape.id === edge.sourceId);
  const target = page.shapes.find((shape) => shape.id === edge.targetId);
  return source && target ? relationKindBetween(source, target) : undefined;
}

/** Sorte de relation d'un champ de relation, par sa flèche ; undefined si la flèche n'en est plus une. */
export function relationKindOfField(page: PageModel, field: Field & { edge: string }): RelationKind | undefined {
  const edge = page.edges.find((e) => e.id === field.edge);
  return edge && relationKindOf(page, edge);
}

/** Réglages de la page qui touchent les relations. */
export const relationSettings = (page: PageModel): RelationSettings => ({ cardinalities: cardinalitiesShown(page) });

/**
 * Index de la page pour les relations, calculé une fois par opération : formes et flèches par id, et les sortes en
 * vigueur (`RELATION_KINDS`, ou celles d'un test).
 */
export interface RelationIndex {
  shapes: ReadonlyMap<string, ShapeModel>;
  edges: ReadonlyMap<string, EdgeModel>;
  kinds: readonly RelationKind[];
}

export const relationIndex = (page: PageModel, kinds: readonly RelationKind[] = RELATION_KINDS): RelationIndex => ({
  shapes: shapeById(page),
  edges: new Map(page.edges.map((edge) => [edge.id, edge])),
  kinds,
});

/** Sorte de relation d'une flèche, d'après l'index de la page ; undefined si elle ne relie pas deux formes liables. */
export function indexedRelationKind(index: RelationIndex, edge: EdgeModel): RelationKind | undefined {
  const source = edge.sourceId === undefined ? undefined : index.shapes.get(edge.sourceId);
  const target = edge.targetId === undefined ? undefined : index.shapes.get(edge.targetId);
  return source && target ? relationKindBetween(source, target, index.kinds) : undefined;
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
