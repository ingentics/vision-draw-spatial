import { table } from '../common/table';

/**
 * Table énumérative (sujet 180, « Entité énumérative » avant le sujet 416) : la table, entête à cadre double (sujets
 * 215, 216) ; ses champs après `id` sont ses valeurs.
 */
export const definition = table('rdd-enum', {
  name: 'Table énumérative',
  order: 2,
  keywords: ['enum', 'énumération', 'entity', 'entité', 'valeurs', 'table'],
  value: 'Enum',
});
