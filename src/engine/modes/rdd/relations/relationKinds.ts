import type { EdgeModel, PageModel, ShapeModel } from '../../../model/types';
import type { ModeEdit } from '../../types';
import type { Field } from '../fieldModel';
import { shapeById } from '../tableTargets';
import { cardinalitiesShown } from './cardinalities';
import { embeddedRelation } from './embeddedRelation';
import type { RelationKind, RelationSettings } from './kind';
import { tableRelation } from './tableRelation';

/**
 * Sortes de relation du mode RDD (sujet 268) : une flèche permise relie deux formes d'une même sorte, qui lui impose ses
 * bouts et son formulaire. Une forme absente de toutes les sortes n'a aucune flèche (ni poignée de connexion, ni cible).
 */
export const RELATION_KINDS: readonly RelationKind[] = [tableRelation, embeddedRelation];

/** Sorte de la relation de `source` vers `target` ; undefined si la flèche n'est pas permise. */
export const relationKindBetween = (source: ShapeModel, target: ShapeModel): RelationKind | undefined =>
  RELATION_KINDS.find((kind) => kind.from.includes(source.kind) && kind.to.includes(target.kind));

/** Flèche permise de `source` vers `target` ? */
export const linksTables = (source: ShapeModel, target: ShapeModel): boolean =>
  relationKindBetween(source, target) !== undefined;

/** Forme (kind) qui peut porter une flèche, au départ ou à l'arrivée. */
export const isLinkable = (shapeKind: string): boolean =>
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

/** Index de la page pour les relations : formes et flèches par id, calculés une fois par opération. */
export interface RelationIndex {
  shapes: ReadonlyMap<string, ShapeModel>;
  edges: ReadonlyMap<string, EdgeModel>;
}

export const relationIndex = (page: PageModel): RelationIndex => ({
  shapes: shapeById(page),
  edges: new Map(page.edges.map((edge) => [edge.id, edge])),
});

/** Sorte de relation d'une flèche, d'après l'index de la page ; undefined si elle ne relie pas deux formes liables. */
export function indexedRelationKind(index: RelationIndex, edge: EdgeModel): RelationKind | undefined {
  const source = edge.sourceId === undefined ? undefined : index.shapes.get(edge.sourceId);
  const target = edge.targetId === undefined ? undefined : index.shapes.get(edge.targetId);
  return source && target ? relationKindBetween(source, target) : undefined;
}

/**
 * Flèche d'un champ de relation remise à sa sorte : bouts imposés d'après le champ, réglages des autres sortes retirés
 * (flèche qui a changé de sorte). `settings` : passés quand l'opération vient de les changer (`edit.page` ne le montre
 * pas encore) ; `index` : celui de l'opération en cours, s'il est déjà calculé.
 */
export function writeRelationEdge(
  edit: ModeEdit,
  field: Field & { edge: string },
  settings = relationSettings(edit.page),
  index = relationIndex(edit.page),
): void {
  const edge = index.edges.get(field.edge);
  const kind = edge && indexedRelationKind(index, edge);
  if (!edge || !kind) return;
  kind.writeEnds(edit, edge, field, settings, index.shapes);
  for (const other of RELATION_KINDS)
    if (other !== kind)
      for (const property of other.properties) edit.setElementAttribute(field.edge, property.key, undefined);
}
