import { center, sideConstraintAt } from '../../../../core/plugins';
import type { ModeEdit, Rect, ShapeModel } from '../../../../core/plugins';
import type { Field, TableRow } from '../tables/fieldModel';
import { isDivider } from '../tables/fieldModel';
import type { TableLevel } from '../tables/tableLayout';
import { fieldRowIn } from '../tables/tableLayout';
import type { RelationIndex } from './relationKinds';
import { relationIndex, relationKindBetween } from './relationKinds';

/**
 * Flèches qui arrivent sur un champ (sujet 269, document → champ dynamique) : point d'arrivée sur la ligne du champ,
 * et flèches supprimées quand leur champ ne les permet plus.
 */

/**
 * Point d'arrivée des flèches retenues par les champs de `rows` (lignes d'une table de bornes `bounds`) : au milieu de
 * la ligne du champ, sur le côté gauche ou droit le plus proche de la forme de départ (`entryX`, `entryY`,
 * `entryPerimeter=0`, relatifs à la table : la flèche suit la table). `bounds`, `level`, `rows` : ceux que
 * l'opération en cours vient d'écrire.
 */
export function placeArrivals(
  edit: ModeEdit,
  bounds: Rect,
  level: TableLevel,
  rows: readonly TableRow[],
  index?: RelationIndex,
): void {
  if (!rows.some((row) => !isDivider(row) && row.incoming?.length)) return;
  const { shapes, edges } = index ?? relationIndex(edit.page);
  rows.forEach((row, i) => {
    if (isDivider(row)) return;
    const line = fieldRowIn(bounds, level, i);
    for (const id of row.incoming ?? []) {
      const source = shapes.get(edges.get(id)?.sourceId ?? '');
      if (!source) continue;
      const entry = sideConstraintAt(bounds, line.y + line.height / 2, center(source.bounds));
      edit.setElementStyle(id, 'entryX', String(entry.x));
      edit.setElementStyle(id, 'entryY', String(entry.y));
      edit.setElementStyle(id, 'entryPerimeter', '0');
    }
  });
}

/**
 * Champ `field` de la table `table` qui devient `next` (undefined : retiré) : les flèches qu'il retient et que `next` ne
 * permet plus (type changé, champ retiré) sont supprimées ; renvoie `next` sans elles.
 */
export function releaseArrivals(
  edit: ModeEdit,
  table: ShapeModel,
  field: Field,
  next: Field | undefined,
): Field | undefined {
  if (!field.incoming?.length) return next;
  const { shapes, edges } = relationIndex(edit.page);
  const kept = (field.incoming ?? []).filter((id) => {
    const source = shapes.get(edges.get(id)?.sourceId ?? '');
    const allowed = !!next && !!source && !!relationKindBetween(source, table)?.toField?.(next);
    if (!allowed) edit.removeEdge(id);
    return allowed;
  });
  if (!next || kept.length === next.incoming?.length) return next;
  return { ...next, incoming: kept.length > 0 ? kept : undefined };
}
