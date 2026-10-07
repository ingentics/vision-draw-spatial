import type { EdgeModel, PageModel, ShapeModel } from '../../../../core/model/types';
import type { Field } from '../tables/fieldModel';
import { isTableKindId } from '../tables/tableKinds';
import { shapeById, shapeName } from '../editing/tableTargets';
import { embeddedRelation } from './kinds/embedded';
import type { RelationKind, RelationSettings } from './kinds/kind';
import { tableRelation } from './kinds/table';
import { cardinalitiesShown } from './kinds/table/cardinalities';

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

/** Flèche de relation : entre deux formes qui peuvent être liées (son apparence est alors imposée). */
export const isRelationEdge = (page: PageModel, edge: EdgeModel): boolean => relationKindOf(page, edge) !== undefined;

/** Flèches de la page entre deux formes qui ne peuvent pas être liées (fichier modifié) : signalées. */
export function forbiddenLinks(page: PageModel): Array<{ edgeId: string; message: string }> {
  const { shapes } = relationIndex(page);
  return page.edges.flatMap((edge) => {
    const source = edge.sourceId === undefined ? undefined : shapes.get(edge.sourceId);
    const target = edge.targetId === undefined ? undefined : shapes.get(edge.targetId);
    if (!source || !target || canLink(source, target)) return [];
    const name = (shape: ShapeModel) => `« ${shapeName(shape)} »`;
    return [{ edgeId: edge.id, message: `Flèche de ${name(source)} vers ${name(target)} : liaison non permise` }];
  });
}
