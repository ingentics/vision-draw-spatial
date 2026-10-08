import type { EdgeModel, PageModel, ShapeModel } from '../../../../core/plugins';
import { edgeEnds, edgeOf, edgesById, elementName, shapesById } from '../../../../core/plugins';
import type { Field } from '../tables/fieldModel';
import { isDivider, tableFields } from '../tables/fieldModel';
import { isTableKindId, tableKindOf } from '../tables/tableKinds';
import { fieldIndex } from '../editing/tableTargets';
import { documentRelation } from './kinds/document';
import { embeddedRelation } from './kinds/embedded';
import type { RelationKind, RelationSettings } from './kinds/kind';
import { tableRelation } from './kinds/table';
import { viewSourceRelation } from './kinds/viewSource';
import { cardinalitiesShown } from './kinds/table/cardinalities';

/**
 * Sortes de relation du mode RDD (sujets 268, 278) : une flèche permise relie deux formes d'une même sorte, qui lui
 * impose son apparence et son formulaire. Une forme absente de toutes les sortes n'a aucune flèche (ni poignée de
 * connexion, ni cible).
 */
export const RELATION_KINDS: readonly RelationKind[] = [
  tableRelation,
  embeddedRelation,
  documentRelation,
  viewSourceRelation,
];

/** Sorte de la relation de `source` vers `target` parmi `kinds` ; undefined si la flèche n'est pas permise. */
export function relationKindBetween(
  source: ShapeModel,
  target: ShapeModel,
  kinds: readonly RelationKind[] = RELATION_KINDS,
): RelationKind | undefined {
  if (!isTableKindId(source.kind) || !isTableKindId(target.kind)) return undefined;
  const from = source.kind;
  const to = target.kind;
  return kinds.find(
    (kind) => kind.from.includes(from) && kind.to.includes(to) && !(kind.distinct && source.id === target.id),
  );
}

/**
 * Flèche permise de `source` vers `target` ? `part` : partie visée de `target` (rang d'un champ) ; une sorte qui vise
 * un champ (`toField`) n'accepte que la ligne d'un champ qu'elle permet (sujet 269).
 */
export function canLink(source: ShapeModel, target: ShapeModel, part?: string): boolean {
  const kind = relationKindBetween(source, target);
  if (!kind?.toField) return kind !== undefined;
  const index = fieldIndex(target, part);
  const row = index === undefined ? undefined : tableFields(target)[index];
  return !!row && !isDivider(row) && kind.toField(row);
}

/** Champ d'arrivée d'une flèche qui vise un champ (sujet 269) : sa table, le rang du champ et le champ. */
export interface Arrival {
  table: ShapeModel;
  index: number;
  field: Field;
}

/**
 * Champs d'arrivée retenus par les tables de la page (`Field.incoming`), par id de flèche ; un id n'est retenu que si
 * la flèche arrive bien sur cette table (un champ collé garde des ids d'ailleurs), au premier champ qui le cite.
 */
export function storedArrivals(page: PageModel): Map<string, Arrival> {
  const targets = new Map(page.edges.map((edge) => [edge.id, edge.targetId]));
  const arrivals = new Map<string, Arrival>();
  for (const table of page.shapes) {
    if (!tableKindOf(table)) continue;
    tableFields(table).forEach((field, index) => {
      if (isDivider(field)) return;
      for (const id of field.incoming ?? [])
        if (targets.get(id) === table.id && !arrivals.has(id)) arrivals.set(id, { table, index, field });
    });
  }
  return arrivals;
}

/**
 * Sorte de la flèche `edge` de `source` vers `target` : une sorte qui vise un champ demande que la flèche soit retenue
 * (`arrivals`) par un champ de `target` qu'elle permet ; sinon ce n'est pas une relation (sujet 269).
 */
function edgeKind(
  edge: EdgeModel,
  source: ShapeModel,
  target: ShapeModel,
  arrivals: ReadonlyMap<string, Arrival>,
  kinds: readonly RelationKind[],
): RelationKind | undefined {
  const kind = relationKindBetween(source, target, kinds);
  if (!kind?.toField) return kind;
  const arrival = arrivals.get(edge.id);
  return arrival && arrival.table.id === target.id && kind.toField(arrival.field) ? kind : undefined;
}

/** Forme (kind) qui peut porter une flèche, au départ ou à l'arrivée. */
export const isLinkable = (shapeKind: string): boolean =>
  isTableKindId(shapeKind) &&
  RELATION_KINDS.some((kind) => kind.from.includes(shapeKind) || kind.to.includes(shapeKind));

/** Sorte de relation d'une flèche de la page ; undefined si elle ne relie pas deux formes qui peuvent être liées. */
export function relationKindOf(page: PageModel, edge: EdgeModel): RelationKind | undefined {
  return indexedRelationKind(relationIndex(page), edge);
}

/** Sorte de relation d'un champ de relation, par sa flèche ; undefined si la flèche n'en est plus une. */
export function relationKindOfField(page: PageModel, field: Field & { edge: string }): RelationKind | undefined {
  const edge = edgeOf(page, field.edge);
  return edge && relationKindOf(page, edge);
}

/** Réglages de la page qui touchent les relations. */
export const relationSettings = (page: PageModel): RelationSettings => ({ cardinalities: cardinalitiesShown(page) });

/**
 * Index de la page pour les relations, calculé une fois par opération : formes et flèches par id, champs d'arrivée des
 * flèches qui visent un champ, et les sortes en vigueur (`RELATION_KINDS`, ou celles d'un test).
 */
export interface RelationIndex {
  shapes: ReadonlyMap<string, ShapeModel>;
  edges: ReadonlyMap<string, EdgeModel>;
  arrivals: ReadonlyMap<string, Arrival>;
  kinds: readonly RelationKind[];
}

/** `arrivals` : ceux de la page, ou ceux qu'une opération vient de remettre en ordre (`syncRelations`). */
export const relationIndex = (
  page: PageModel,
  kinds: readonly RelationKind[] = RELATION_KINDS,
  arrivals: ReadonlyMap<string, Arrival> = storedArrivals(page),
): RelationIndex => ({
  shapes: shapesById(page),
  edges: edgesById(page),
  arrivals,
  kinds,
});

/** Sorte de relation d'une flèche, d'après l'index de la page ; undefined si ce n'est pas une relation. */
export function indexedRelationKind(index: RelationIndex, edge: EdgeModel): RelationKind | undefined {
  const { source, target } = edgeEnds(index.shapes, edge);
  return source && target ? edgeKind(edge, source, target, index.arrivals, index.kinds) : undefined;
}

/**
 * Flèches retenues par un champ (sujet 269) : leur point d'arrivée est sur la ligne du champ (`placeArrivals`), pas
 * réparti par l'ancrage automatique ni Typon (sujet 338).
 */
export const arrivalEdges = (page: PageModel): string[] => [...storedArrivals(page).keys()];

/** Flèche de relation : entre deux formes qui peuvent être liées (son apparence est alors imposée). */
export const isRelationEdge = (page: PageModel, edge: EdgeModel): boolean => relationKindOf(page, edge) !== undefined;

/**
 * Flèches de la page entre deux formes qui ne peuvent pas être liées (fichier modifié), ou d'un document vers autre
 * chose qu'un champ dynamique (sujet 269) : signalées.
 */
export function forbiddenLinks(page: PageModel): Array<{ edgeId: string; message: string }> {
  const index = relationIndex(page);
  return page.edges.flatMap((edge) => {
    const { source, target } = edgeEnds(index.shapes, edge);
    if (!source || !target || indexedRelationKind(index, edge)) return [];
    const name = (shape: ShapeModel) => `« ${elementName(shape)} »`;
    return [{ edgeId: edge.id, message: `Flèche de ${name(source)} vers ${name(target)} : liaison non permise` }];
  });
}
