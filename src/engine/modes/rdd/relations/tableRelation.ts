import { newFieldLabel } from '../fieldModel';
import { writeCardinalities } from './cardinalities';
import type { RelationKind } from './kind';

/** Nom inverse d'une relation, sur sa flèche : la relation vue depuis la table d'arrivée. */
export const REVERSE_NAME = 'spatial.reverseName';

/**
 * Relation entre tables (sujet 265) : d'une entité ou d'une énumération vers une entité ou une énumération ; champ
 * `relation1`, `relation2`… ; cardinalités aux bouts, d'après « Optionnel » du champ.
 */
export const tableRelation: RelationKind = {
  id: 'table',
  from: ['rdd-entity', 'rdd-enum'],
  to: ['rdd-entity', 'rdd-enum'],
  fieldKind: 'fk',
  fieldLabel: (rows) => newFieldLabel(rows, 'relation'),
  writeEnds: (edit, edge, field, settings, shapes) =>
    writeCardinalities(edit, edge, shapes, field.nullable, settings.cardinalities),
  properties: [
    {
      type: 'text',
      key: REVERSE_NAME,
      section: 'Relation',
      label: 'Nom inverse',
      title: 'Nom de la relation vue depuis la table d’arrivée (reverseName)',
    },
  ],
};
