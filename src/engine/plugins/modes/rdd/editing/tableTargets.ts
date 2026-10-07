import type { EdgeModel, ModeProperty, ModeTarget, PageModel, ShapeModel } from '../../../../core/plugins';
import type { Field, TableRow } from '../tables/fieldModel';
import { isDivider, isRelation, tableFields } from '../tables/fieldModel';
import { tableKindOf } from '../tables/tableKinds';

/**
 * Cibles des réglages et des touches du mode RDD : forme ou flèche sélectionnée, table, ligne, champ (sujets 249, 253,
 * 268) ; le seul endroit qui distingue une forme d'une flèche ou de la page.
 */

/** Forme sélectionnée ; undefined pour la page ou une flèche. */
export const shapeTarget = (target: ModeTarget): ShapeModel | undefined => ('kind' in target ? target : undefined);

/** Flèche sélectionnée ; undefined pour la page ou une forme. */
export const edgeTarget = (target: ModeTarget): EdgeModel | undefined => ('sourceId' in target ? target : undefined);

/** Formes de la page, par id. */
export const shapeById = (page: PageModel): Map<string, ShapeModel> =>
  new Map(page.shapes.map((shape) => [shape.id, shape]));

/** Nom d'une forme dans un message : son label, sinon son id. */
export const shapeName = (shape: ShapeModel): string => shape.label || shape.id;

/** Rang du champ désigné par `part`, s'il existe dans la table. */
export function fieldIndex(shape: ShapeModel, part: string | undefined): number | undefined {
  const index = Number(part);
  return part !== undefined && Number.isInteger(index) && index >= 0 && index < tableFields(shape).length
    ? index
    : undefined;
}

/** Table du mode sélectionnée ; undefined pour une autre cible. */
export const tableOf = (target: ModeTarget): ShapeModel | undefined => {
  const shape = shapeTarget(target);
  return shape && tableKindOf(shape) ? shape : undefined;
};

/** Ligne sélectionnée d'une table (champ ou séparateur) : la table, le rang et la ligne. */
export function rowOf(
  target: ModeTarget,
  part: string | undefined,
): { shape: ShapeModel; index: number; row: TableRow } | undefined {
  const shape = tableOf(target);
  const index = shape && fieldIndex(shape, part);
  return shape && index !== undefined ? { shape, index, row: tableFields(shape)[index]! } : undefined;
}

/** Champ sélectionné d'une table (pas un séparateur). */
export function fieldOf(
  target: ModeTarget,
  part: string | undefined,
): { shape: ShapeModel; index: number; field: Field } | undefined {
  const selected = rowOf(target, part);
  return selected && !isDivider(selected.row) ? { ...selected, field: selected.row } : undefined;
}

/** Champ de relation sélectionné dans sa table (sujet 268). */
export function relationFieldOf(
  target: ModeTarget,
  part: string | undefined,
): { shape: ShapeModel; index: number; field: Field & { edge: string } } | undefined {
  const selected = fieldOf(target, part);
  return selected && isRelation(selected.field) ? { ...selected, field: selected.field } : undefined;
}

/**
 * Réglages montrés seulement pour les cibles où `shown` est vrai (ex. flèches d'une sorte de relation), en plus de leur
 * propre condition.
 */
export const onlyWhen = (
  properties: readonly ModeProperty[],
  shown: (page: PageModel, target: ModeTarget, part?: string) => boolean,
): ModeProperty[] =>
  properties.map((property) => ({
    ...property,
    hidden: (page: PageModel, target: ModeTarget, part?: string) =>
      !shown(page, target, part) || !!property.hidden?.(page, target, part),
  }));
