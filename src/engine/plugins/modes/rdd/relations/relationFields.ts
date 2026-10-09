import type { ModeEdit, PageModel, ShapeModel } from '../../../../core/plugins';
import { edgeEnds, edgesById, shapesById } from '../../../../core/plugins';
import type { Field, TableRow } from '../tables/fieldModel';
import { isDivider, isRelation, tableFields } from '../tables/fieldModel';
import { writeRows } from '../tables/operations';
import { tableKindOf } from '../tables/tableKinds';
import { tableLevel } from '../tables/tableLayout';
import { fieldIndex } from '../editing/tableTargets';
import { placeArrivals } from './arrivals';
import { writeRelationEdge } from './edgeLook';
import type { RelationField, RelationFieldText, RelationKind, RelationSettings } from './kinds/kind';
import type { Arrival, RelationIndex } from './relationKinds';
import {
  RELATION_KINDS,
  indexedRelationKind,
  relationIndex,
  relationKindBetween,
  relationSettings,
} from './relationKinds';

/**
 * Champs de relation (sujets 265, 268, 278) : une flèche d'une sorte à champ ajoute dans sa forme d'arrivée un champ
 * sans type, qui retient l'id de sa flèche et la suit.
 */

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
    const { source, target } = edgeEnds(index.shapes, edge);
    const kind = indexedRelationKind(index, edge);
    if (!source || !target || !kind?.field) continue;
    byTarget.set(target.id, [...(byTarget.get(target.id) ?? []), { edge: edge.id, source, kind, field: kind.field }]);
  }
  return byTarget;
}

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

/** Flèche qui vient d'être tirée ou rebranchée vers une partie de sa forme d'arrivée (sujet 333). */
export interface EdgeArrival {
  edgeId: string;
  part: string;
}

/**
 * Champs d'arrivée des flèches qui visent un champ (sujet 269), remis en ordre : un id retenu par un champ reste si sa
 * flèche existe, arrive sur cette table et part d'une forme dont la sorte permet ce champ ; la flèche `link` (tirée ou
 * rebranchée) passe au champ visé, s'il la permet. Renvoie le champ d'arrivée de chaque flèche (rang et ligne tels
 * qu'ils sont lus de la page).
 */
function arrivalsAfter(
  page: PageModel,
  kinds: readonly RelationKind[],
  link: EdgeArrival | undefined,
): Map<string, Arrival> {
  const shapes = shapesById(page);
  const edges = edgesById(page);
  const permits = (id: string, table: ShapeModel, field: Field) => {
    const edge = edges.get(id);
    const source = shapes.get(edge?.sourceId ?? '');
    return edge?.targetId === table.id && !!source && !!relationKindBetween(source, table, kinds)?.toField?.(field);
  };
  // Flèche tirée ou rebranchée : le champ visé, s'il la permet ; sinon elle garde le sien.
  const linkedTable = link && shapes.get(edges.get(link.edgeId)?.targetId ?? '');
  const linkedIndex = linkedTable && tableKindOf(linkedTable) ? fieldIndex(linkedTable, link.part) : undefined;
  const linkedRow = linkedTable && linkedIndex !== undefined ? tableFields(linkedTable)[linkedIndex] : undefined;
  const linked =
    link && linkedTable && linkedIndex !== undefined && linkedRow && !isDivider(linkedRow)
      ? permits(link.edgeId, linkedTable, linkedRow) && { table: linkedTable, index: linkedIndex, field: linkedRow }
      : undefined;
  const arrivals = new Map<string, Arrival>();
  if (link && linked) arrivals.set(link.edgeId, linked);
  for (const table of page.shapes) {
    if (!tableKindOf(table)) continue;
    tableFields(table).forEach((field, index) => {
      if (isDivider(field)) return;
      for (const id of field.incoming ?? [])
        if (!arrivals.has(id) && permits(id, table, field)) arrivals.set(id, { table, index, field });
    });
  }
  return arrivals;
}

/**
 * Ligne `index` de la table `tableId` avec les flèches que `arrivals` lui donne, dans l'ordre retenu puis les
 * nouvelles ; `row` si rien ne change.
 */
function withArrivals(row: TableRow, tableId: string, index: number, arrivals: ReadonlyMap<string, Arrival>): TableRow {
  if (isDivider(row)) return row;
  const ids = [...arrivals]
    .filter(([, arrival]) => arrival.table.id === tableId && arrival.index === index)
    .map(([id]) => id);
  const current = row.incoming ?? [];
  const ordered = [...current.filter((id) => ids.includes(id)), ...ids.filter((id) => !current.includes(id))];
  if (ordered.length === current.length && ordered.every((id, i) => id === current[i])) return row;
  const next: Field = { ...row, incoming: ordered };
  if (ordered.length === 0) delete next.incoming;
  return next;
}

/**
 * Champs de relation remis en accord avec les flèches : une flèche de relation d'une sorte à champ sans champ en ajoute
 * un en fin de liste de sa cible (optionnel, comme un champ ajouté, sujet 261), nommé par sa sorte ; un champ dont la
 * flèche a disparu ou ne relie plus sa table est retiré. Une flèche rebranchée emporte son champ (nom et propriétés),
 * renuméroté si son nom est pris ; il prend le kind de sa sorte et perd les textes d'une autre sorte. Chaque flèche de
 * relation est remise à sa sorte (`writeRelationEdge`), avec ou sans champ. Les flèches qui visent un champ (document,
 * sujet 269) sont retenues par leur champ (`arrivalsAfter`, `link` : flèche qui vient d'être tirée ou rebranchée vers
 * une partie) et arrivent sur sa ligne (`placeArrivals`). `kinds` : les sortes en vigueur (un test en déclare d'autres).
 */
export function syncRelations(
  edit: ModeEdit,
  settings: RelationSettings = relationSettings(edit.page),
  kinds: readonly RelationKind[] = RELATION_KINDS,
  link?: EdgeArrival,
): void {
  // Formes, flèches et champs d'arrivée indexés une fois pour toute l'opération (la page de `edit` ne change pas
  // pendant elle).
  const arrivals = arrivalsAfter(edit.page, kinds, link);
  const index = relationIndex(edit.page, kinds, arrivals);
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
    const kept = rows.flatMap((row, i) => {
      if (!isRelation(row)) return [withArrivals(row, shape.id, i, arrivals)];
      const relation = edges.find(({ edge }) => edge === row.edge);
      return relation ? [ownField(row, relation.field, textKeys)] : [];
    });
    const missing = edges.filter(({ edge }) => !kept.some((row) => isRelation(row) && row.edge === edge));
    for (const row of kept) if (isRelation(row)) writeRelationEdge(edit, row.edge, row, settings, index);
    const unchanged = kept.length === rows.length && kept.every((row, i) => row === rows[i]);
    if (missing.length === 0 && unchanged) {
      placeArrivals(edit, shape.bounds, tableLevel(shape), rows, index);
      continue;
    }
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
