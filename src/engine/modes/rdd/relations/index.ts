import type { EdgeModel, PageModel, ShapeModel } from '../../../model/types';
import type { ModeEdit, ModeProperty, ModeTarget } from '../../types';
import type { Field, TableRow } from '../fieldModel';
import { isRelation, tableFields } from '../fieldModel';
import { setField, writeRows } from '../operations';
import { tableKindOf } from '../tableKinds';
import { edgeTarget, onlyWhen, relationFieldOf, shapeName } from '../tableTargets';
import type { RelationField, RelationFieldText, RelationKind, RelationSettings } from './kind';
import type { RelationIndex } from './relationKinds';
import {
  RELATION_KINDS,
  canLink,
  indexedRelationKind,
  relationIndex,
  relationKindOf,
  relationKindOfField,
  relationSettings,
  writeRelationEdge,
} from './relationKinds';

/**
 * Relations entre formes du mode RDD (sujets 265, 268, 278) : une flèche permise (d'une sorte de `RELATION_KINDS`)
 * prend l'apparence de sa sorte ; si la sorte a un champ, il est ajouté dans la forme d'arrivée, sans type, retient l'id
 * de sa flèche et la suit.
 */

export { canLink } from './relationKinds';

/** Flèche de relation d'une sorte à champ : son id, sa forme de départ, sa sorte et le champ de cette sorte. */
interface RelationEdge {
  edge: string;
  source: ShapeModel;
  kind: RelationKind;
  field: RelationField;
}

/** Flèches de relation des sortes à champ, par forme d'arrivée, dans l'ordre de la page. */
function relationEdges(page: PageModel, index: RelationIndex): Map<string, RelationEdge[]> {
  const byTarget = new Map<string, RelationEdge[]>();
  for (const edge of page.edges) {
    const source = edge.sourceId === undefined ? undefined : index.shapes.get(edge.sourceId);
    const target = edge.targetId === undefined ? undefined : index.shapes.get(edge.targetId);
    const kind = indexedRelationKind(index, edge);
    if (!source || !target || !kind?.field) continue;
    byTarget.set(target.id, [...(byTarget.get(target.id) ?? []), { edge: edge.id, source, kind, field: kind.field }]);
  }
  return byTarget;
}

/** Flèche de relation : entre deux formes qui peuvent être liées (son apparence est alors imposée). */
export const isRelationEdge = (page: PageModel, edge: EdgeModel): boolean => relationKindOf(page, edge) !== undefined;

/** Textes de champ propres aux sortes (ex. préfixe) ; le libellé, commun à tous les champs, n'en est pas. */
const fieldTextKeys = (kinds: readonly RelationKind[]) =>
  [...new Set(kinds.flatMap((kind) => (kind.field?.texts ?? []).map((text) => text.key)))].filter(
    (key) => key !== 'label',
  );

/**
 * Champ remis à la sorte de sa flèche : son kind, les seuls textes de champ de cette sorte (parmi `textKeys`), et
 * optionnel si le champ n'est que la trace de la relation.
 */
function ownField(
  field: Field & { edge: string },
  spec: RelationField,
  textKeys: readonly RelationFieldText['key'][],
): Field & { edge: string } {
  const owned = new Set(spec.texts?.map((text) => text.key));
  const stale = textKeys.filter((key) => !owned.has(key) && field[key] !== undefined);
  const nullable = field.nullable || !!spec.ownedByEdge;
  if (stale.length === 0 && field.kind === spec.kind && field.nullable === nullable) return field;
  const next = { ...field, kind: spec.kind, nullable };
  for (const key of stale) delete next[key];
  return next;
}

/**
 * Champs de relation remis en accord avec les flèches : une flèche de relation d'une sorte à champ sans champ en ajoute
 * un en fin de liste de sa cible (optionnel, comme un champ ajouté, sujet 261), nommé par sa sorte ; un champ dont la
 * flèche a disparu ou ne relie plus sa table est retiré. Une flèche rebranchée emporte son champ (nom et propriétés),
 * renuméroté si son nom est pris ; il prend le kind de sa sorte et perd les textes d'une autre sorte. Chaque flèche de
 * relation est remise à sa sorte (`writeRelationEdge`), avec ou sans champ. `kinds` : les sortes en vigueur (un test
 * en déclare d'autres).
 */
export function syncRelations(
  edit: ModeEdit,
  settings: RelationSettings = relationSettings(edit.page),
  kinds: readonly RelationKind[] = RELATION_KINDS,
): void {
  // Formes et flèches indexées une fois pour toute l'opération (la page de `edit` ne change pas pendant elle).
  const index = relationIndex(edit.page, kinds);
  const textKeys = fieldTextKeys(kinds);
  const wanted = relationEdges(edit.page, index);
  // Sortes sans champ : rien à créer ni à suivre, l'apparence seule.
  for (const edge of edit.page.edges)
    if (indexedRelationKind(index, edge)?.field === undefined)
      writeRelationEdge(edit, edge.id, undefined, settings, index);
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
      return relation ? [ownField(row, relation.field, textKeys)] : [];
    });
    const missing = edges.filter(({ edge }) => !kept.some((row) => isRelation(row) && row.edge === edge));
    for (const row of kept) if (isRelation(row)) writeRelationEdge(edit, row.edge, row, settings, index);
    const unchanged = kept.length === rows.length && kept.every((row, i) => row === rows[i]);
    if (missing.length === 0 && unchanged) continue;
    const next: TableRow[] = [...kept];
    for (const { edge, source, field: spec } of missing) {
      const moved = existing.get(edge);
      const label = moved && !next.some((row) => row.label === moved.label) ? moved.label : spec.label(next, source);
      const field: Field & { edge: string } = moved
        ? { ...ownField(moved, spec, textKeys), label }
        : { kind: spec.kind, label, type: '', nullable: true, edge };
      next.push(field);
      writeRelationEdge(edit, edge, field, settings, index);
    }
    writeRows(edit, shape, next);
  }
}

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
