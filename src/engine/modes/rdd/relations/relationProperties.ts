import type { PageModel, ShapeModel } from '../../../model/types';
import type { ModeProperty, ModeTarget } from '../../types';
import { edgeTarget, onlyWhen, relationFieldOf } from '../editing/tableTargets';
import type { Field } from '../tables/fieldModel';
import { isRelation, tableFields } from '../tables/fieldModel';
import { setField } from '../tables/operations';
import { tableKindOf } from '../tables/tableKinds';
import type { RelationFieldText } from './kinds/kind';
import { RELATION_KINDS, relationKindOf, relationKindOfField } from './relationKinds';

/**
 * Formulaires des relations (sujets 265, 268) : celui de la flèche, dans la section « Relation », et celui d'un champ
 * qui n'est que la trace de sa relation ; les textes du champ s'y règlent des deux côtés.
 */

/** Champ de relation d'une flèche : sa table, son rang et le champ. */
function relationField(page: PageModel, edgeId: string) {
  for (const shape of page.shapes) {
    const rows = tableKindOf(shape) ? tableFields(shape) : [];
    const index = rows.findIndex((row) => isRelation(row) && row.edge === edgeId);
    const field = rows[index];
    if (isRelation(field)) return { shape, index, field };
  }
  return undefined;
}

/** Champ de relation visé par un formulaire : celui de la flèche, ou le champ sélectionné dans sa table. */
type FieldLocator = (
  page: PageModel,
  target: ModeTarget,
  part?: string,
) => { shape: ShapeModel; index: number; field: Field & { edge: string } } | undefined;

const fromEdge: FieldLocator = (page, target) => {
  const edge = edgeTarget(target);
  return edge && relationField(page, edge.id);
};

/**
 * Texte du champ de relation (sujet 268), au formulaire de la flèche ou du champ sélectionné : les deux écrivent le
 * champ. Un libellé vide est refusé (`setField`), un préfixe vide retiré.
 */
const fieldTextProperty = (
  { key, label, title }: RelationFieldText,
  locate: FieldLocator,
  scope: 'edge' | 'field',
): ModeProperty => ({
  type: 'text',
  // Écrit à chaque frappe : la ligne de la table suit la saisie (sujet 271).
  live: true,
  ...(scope === 'field' && { part: true }),
  key: `rdd.relation.${scope}.${key}`,
  section: 'Relation',
  label,
  title,
  value: (page, target, part) => locate(page, target, part)?.field[key],
  write: (edit, target, value, part) => {
    const found = locate(edit.page, target, part);
    if (found) setField(edit, found.shape, found.index, { [key]: value?.trim() ?? '' });
  },
});

/** Champ de relation sélectionné qui n'est que la trace de sa relation (`field.ownedByEdge`, relation embedded). */
export function edgeOwnedField(page: PageModel, target: ModeTarget, part?: string): boolean {
  const found = relationFieldOf(target, part);
  return !!found && !!relationKindOfField(page, found.field)?.field?.ownedByEdge;
}

/** Formulaires des flèches de relation : chaque sorte montre le sien sur ses seules flèches. */
export const RELATION_PROPERTIES: ModeProperty[] = RELATION_KINDS.flatMap((kind) =>
  onlyWhen(
    [...(kind.properties ?? []), ...(kind.field?.texts ?? []).map((text) => fieldTextProperty(text, fromEdge, 'edge'))],
    (page, target) => {
      const edge = edgeTarget(target);
      return !!edge && relationKindOf(page, edge) === kind;
    },
  ),
);

/**
 * Formulaire d'un champ qui n'est que la trace de sa relation (embedded) : les textes de champ de la flèche, et rien
 * d'autre (les réglages d'un champ sont masqués, `FIELD_PROPERTIES`).
 */
export const RELATION_FIELD_PROPERTIES: ModeProperty[] = RELATION_KINDS.filter(
  (kind) => kind.field?.ownedByEdge,
).flatMap((kind) =>
  onlyWhen(
    (kind.field?.texts ?? []).map((text) =>
      fieldTextProperty(text, (_page, target, part) => relationFieldOf(target, part), 'field'),
    ),
    (page, target, part) => {
      const found = relationFieldOf(target, part);
      return !!found && relationKindOfField(page, found.field) === kind;
    },
  ),
);
