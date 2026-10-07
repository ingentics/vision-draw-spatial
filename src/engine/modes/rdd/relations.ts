import type { EdgeModel, PageModel, ShapeModel } from '../../model/types';
import type { ModeEdit } from '../types';
import { cardinalitiesShown, writeCardinalities } from './cardinalities';
import { newFieldLabel, writeRows } from './operations';
import type { Field, TableRow } from './tables';
import { isRelation, tableFields, tableKindOf } from './tables';

/**
 * Relations entre tables du mode RDD (sujet 265) : une flèche part d'une table `links` (entité, énumération, embedded)
 * et arrive sur une table `links: 'both'` (entité, énumération) ; la cible porte un champ de relation `fk`, sans type,
 * qui retient l'id de sa flèche et la suit. Il s'appelle `relation1`, `relation2`… ; depuis un embedded, du nom de
 * l'embedded (`Adresse`, puis `Adresse1`, `Adresse2`… s'il est pris).
 */

/** Nom inverse d'une relation, sur sa flèche : la relation vue depuis la table d'arrivée. */
export const REVERSE_NAME = 'spatial.reverseName';

/** Préfixe du nom d'un champ de relation : `relation1`, `relation2`… */
const RELATION_PREFIX = 'relation';

/** Nom d'un champ de relation neuf, d'après sa table de départ, libre dans `rows`. */
function relationLabel(rows: readonly TableRow[], source: ShapeModel): string {
  if (source.kind !== 'rdd-embedded') return newFieldLabel(rows, RELATION_PREFIX);
  // Embedded : son nom sur une ligne, sinon celui de sa forme.
  const name = source.label.replace(/\s+/g, ' ').trim() || 'Embedded';
  return rows.some((row) => row.label === name) ? newFieldLabel(rows, name) : name;
}

/** Flèche permise de `source` vers `target` ? */
export const linksTables = (source: ShapeModel, target: ShapeModel): boolean =>
  tableKindOf(source)?.links !== undefined && tableKindOf(target)?.links === 'both';

const shapeById = (page: PageModel) => new Map(page.shapes.map((shape) => [shape.id, shape]));

/** Flèches de relation de la page (id et table de départ), par table d'arrivée, dans l'ordre de la page. */
function relationEdges(page: PageModel): Map<string, Array<{ edge: string; source: ShapeModel }>> {
  const shapes = shapeById(page);
  const byTarget = new Map<string, Array<{ edge: string; source: ShapeModel }>>();
  for (const edge of page.edges) {
    const source = edge.sourceId === undefined ? undefined : shapes.get(edge.sourceId);
    const target = edge.targetId === undefined ? undefined : shapes.get(edge.targetId);
    if (!source || !target || !linksTables(source, target)) continue;
    byTarget.set(target.id, [...(byTarget.get(target.id) ?? []), { edge: edge.id, source }]);
  }
  return byTarget;
}

/** Flèche de relation : entre deux tables qui peuvent être liées (ses bouts sont alors imposés). */
export function isRelationEdge(page: PageModel, edge: EdgeModel): boolean {
  const source = page.shapes.find((shape) => shape.id === edge.sourceId);
  const target = page.shapes.find((shape) => shape.id === edge.targetId);
  return !!source && !!target && linksTables(source, target);
}

/**
 * Champs de relation remis en accord avec les flèches : une flèche de relation sans champ en ajoute un en fin de liste
 * de sa cible (optionnel, comme un champ ajouté, sujet 261) ; un champ dont la flèche a disparu ou ne relie plus sa
 * table est retiré. Une flèche rebranchée emporte son champ (nom et propriétés), renuméroté si son nom est pris.
 * Les cardinalités de chaque flèche de relation suivent son champ (`shown` : réglage de la page, `cardinalitiesShown`).
 */
export function syncRelations(edit: ModeEdit, shown = cardinalitiesShown(edit.page)): void {
  const wanted = relationEdges(edit.page);
  const tables = edit.page.shapes.filter((shape) => tableKindOf(shape));
  // Champs de relation actuels, où qu'ils soient : un champ rebranché garde ses propriétés.
  const existing = new Map(
    tables.flatMap((shape) => tableFields(shape).filter(isRelation)).map((field) => [field.edge, field]),
  );
  for (const shape of tables) {
    const edges = wanted.get(shape.id) ?? [];
    const rows = tableFields(shape);
    const kept = rows.filter((row) => !isRelation(row) || edges.some(({ edge }) => edge === row.edge));
    const missing = edges.filter(({ edge }) => !kept.some((row) => isRelation(row) && row.edge === edge));
    for (const row of kept) if (isRelation(row)) writeCardinalities(edit, row.edge, row.nullable, shown);
    if (missing.length === 0 && kept.length === rows.length) continue;
    const next: TableRow[] = [...kept];
    for (const { edge, source } of missing) {
      const moved = existing.get(edge);
      const label = moved && !next.some((row) => row.label === moved.label) ? moved.label : relationLabel(next, source);
      const field: Field = moved ? { ...moved, label } : { kind: 'fk', label, type: '', nullable: true, edge };
      next.push(field);
      writeCardinalities(edit, edge, field.nullable, shown);
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
