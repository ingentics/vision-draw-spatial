import { table } from '../common/table';

/**
 * Table (sujet 180, « Entité » avant le sujet 416) : le modèle sans italique, clé primaire `id` toujours en tête de ses
 * champs.
 */
export const definition = table('rdd-entity', {
  name: 'Table',
  order: 1,
  keywords: ['entity', 'entité', 'table', 'model'],
  value: 'Entity',
});
