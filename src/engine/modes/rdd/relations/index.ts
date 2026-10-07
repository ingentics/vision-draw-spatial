import type { EdgeModel, PageModel, ShapeModel } from '../../../model/types';
import type { ModeEdit, ModeProperty, ModeTarget } from '../../types';
import { fieldIndex } from '../fieldParts';
import { setField, writeRows } from '../operations';
import type { Field, TableRow } from '../tables';
import { isRelation, tableFields, tableKindOf } from '../tables';
import type { RelationFieldText, RelationKind, RelationSettings } from './kind';
import {
  RELATION_KINDS,
  linksTables,
  relationKindBetween,
  relationKindOf,
  relationKindOfField,
  relationSettings,
  writeRelationEdge,
} from './relationKinds';

/**
 * Relations entre formes du mode RDD (sujets 265, 268) : une flèche permise (d'une sorte de `RELATION_KINDS`) ajoute
 * dans sa forme d'arrivée un champ de relation `fk`, sans type, qui retient l'id de sa flèche et la suit ; sa sorte
 * impose les bouts de la flèche et son formulaire.
 */

export { linksTables } from './relationKinds';

const shapeById = (page: PageModel) => new Map(page.shapes.map((shape) => [shape.id, shape]));

/** Flèche de relation : son id, sa forme de départ et sa sorte. */
interface RelationEdge {
  edge: string;
  source: ShapeModel;
  kind: RelationKind;
}

/** Flèches de relation de la page, par forme d'arrivée, dans l'ordre de la page. */
function relationEdges(page: PageModel): Map<string, RelationEdge[]> {
  const shapes = shapeById(page);
  const byTarget = new Map<string, RelationEdge[]>();
  for (const edge of page.edges) {
    const source = edge.sourceId === undefined ? undefined : shapes.get(edge.sourceId);
    const target = edge.targetId === undefined ? undefined : shapes.get(edge.targetId);
    const kind = source && target ? relationKindBetween(source, target) : undefined;
    if (!source || !target || !kind) continue;
    byTarget.set(target.id, [...(byTarget.get(target.id) ?? []), { edge: edge.id, source, kind }]);
  }
  return byTarget;
}

/** Flèche de relation : entre deux formes qui peuvent être liées (ses bouts sont alors imposés). */
export const isRelationEdge = (page: PageModel, edge: EdgeModel): boolean => relationKindOf(page, edge) !== undefined;

/** Textes de champ propres aux sortes (ex. préfixe) ; le libellé, commun à tous les champs, n'en est pas. */
const FIELD_TEXT_KEYS = [
  ...new Set(RELATION_KINDS.flatMap((kind) => (kind.fieldTexts ?? []).map((text) => text.key))),
].filter((key) => key !== 'label');

/**
 * Champ remis à la sorte de sa flèche : son kind, les seuls textes de champ de cette sorte, et optionnel si le champ
 * n'est que la trace de la relation.
 */
function ownField(field: Field & { edge: string }, kind: RelationKind): Field & { edge: string } {
  const owned = new Set(kind.fieldTexts?.map((text) => text.key));
  const stale = FIELD_TEXT_KEYS.filter((key) => !owned.has(key) && field[key] !== undefined);
  const nullable = field.nullable || !!kind.fieldIsRelation;
  if (stale.length === 0 && field.kind === kind.fieldKind && field.nullable === nullable) return field;
  const next = { ...field, kind: kind.fieldKind, nullable };
  for (const key of stale) delete next[key];
  return next;
}

/**
 * Champs de relation remis en accord avec les flèches : une flèche de relation sans champ en ajoute un en fin de liste
 * de sa cible (optionnel, comme un champ ajouté, sujet 261), nommé par sa sorte ; un champ dont la flèche a disparu ou
 * ne relie plus sa table est retiré. Une flèche rebranchée emporte son champ (nom et propriétés), renuméroté si son nom
 * est pris ; il prend le kind de sa sorte et perd les textes d'une autre sorte. Chaque flèche de relation est remise à sa sorte (`writeRelationEdge`).
 */
export function syncRelations(edit: ModeEdit, settings: RelationSettings = relationSettings(edit.page)): void {
  const wanted = relationEdges(edit.page);
  const tables = edit.page.shapes.filter((shape) => tableKindOf(shape));
  // Champs de relation actuels, où qu'ils soient : un champ rebranché garde ses propriétés.
  const existing = new Map(
    tables.flatMap((shape) => tableFields(shape).filter(isRelation)).map((field) => [field.edge, field]),
  );
  for (const shape of tables) {
    const edges = wanted.get(shape.id) ?? [];
    const rows = tableFields(shape);
    const kept = rows.flatMap((row) => {
      if (!isRelation(row)) return [row];
      const relation = edges.find(({ edge }) => edge === row.edge);
      return relation ? [ownField(row, relation.kind)] : [];
    });
    const missing = edges.filter(({ edge }) => !kept.some((row) => isRelation(row) && row.edge === edge));
    for (const row of kept) if (isRelation(row)) writeRelationEdge(edit, row, settings);
    const unchanged = kept.length === rows.length && kept.every((row, i) => row === rows[i]);
    if (missing.length === 0 && unchanged) continue;
    const next: TableRow[] = [...kept];
    for (const { edge, source, kind } of missing) {
      const moved = existing.get(edge);
      const label =
        moved && !next.some((row) => row.label === moved.label) ? moved.label : kind.fieldLabel(next, source);
      const field: Field & { edge: string } = moved
        ? { ...ownField(moved, kind), label }
        : { kind: kind.fieldKind, label, type: '', nullable: true, edge };
      next.push(field);
      writeRelationEdge(edit, field, settings);
    }
    writeRows(edit, shape, next);
  }
}

/** Flèches de la page entre deux formes qui ne peuvent pas être liées (fichier modifié) : signalées. */
export function forbiddenLinks(page: PageModel): Array<{ edgeId: string; message: string }> {
  const shapes = shapeById(page);
  return page.edges.flatMap((edge) => {
    const source = edge.sourceId === undefined ? undefined : shapes.get(edge.sourceId);
    const target = edge.targetId === undefined ? undefined : shapes.get(edge.targetId);
    if (!source || !target || linksTables(source, target)) return [];
    const name = (shape: ShapeModel) => `« ${shape.label || shape.id} »`;
    return [{ edgeId: edge.id, message: `Flèche de ${name(source)} vers ${name(target)} : liaison non permise` }];
  });
}

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

const fromEdge: FieldLocator = (page, target) => ('sourceId' in target ? relationField(page, target.id) : undefined);

const fromField: FieldLocator = (_page, target, part) => {
  if (!('kind' in target) || !tableKindOf(target)) return undefined;
  const index = fieldIndex(target, part);
  const row = index === undefined ? undefined : tableFields(target)[index];
  return index !== undefined && isRelation(row) ? { shape: target, index, field: row } : undefined;
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

/** Champ de relation sélectionné qui n'est que la trace de sa relation (`fieldIsRelation`, relation embedded). */
export function relationOnlyField(page: PageModel, target: ModeTarget, part?: string): boolean {
  const found = fromField(page, target, part);
  return !!found && !!relationKindOfField(page, found.field)?.fieldIsRelation;
}

/** Formulaires des flèches de relation : chaque sorte montre le sien sur ses seules flèches. */
export const RELATION_PROPERTIES: ModeProperty[] = RELATION_KINDS.flatMap((kind) =>
  [...kind.properties, ...(kind.fieldTexts ?? []).map((text) => fieldTextProperty(text, fromEdge, 'edge'))].map(
    (property) => ({
      ...property,
      hidden: (page, target, part) =>
        !('sourceId' in target) || relationKindOf(page, target) !== kind || !!property.hidden?.(page, target, part),
    }),
  ),
);

/**
 * Formulaire d'un champ qui n'est que la trace de sa relation (embedded) : les textes de champ de la flèche, et rien
 * d'autre (les réglages d'un champ sont masqués, `FIELD_PROPERTIES`).
 */
export const RELATION_FIELD_PROPERTIES: ModeProperty[] = RELATION_KINDS.filter((kind) => kind.fieldIsRelation).flatMap(
  (kind) =>
    (kind.fieldTexts ?? []).map((text) => ({
      ...fieldTextProperty(text, fromField, 'field'),
      hidden: (page: PageModel, target: ModeTarget, part?: string) => {
        const found = fromField(page, target, part);
        return !found || relationKindOfField(page, found.field) !== kind;
      },
    })),
);
