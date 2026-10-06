import { table } from '../common/table';

/** Entité (sujet 180) : le modèle sans mention ni italique, clé primaire `id` toujours en tête de ses champs. */
export const definition = table('rdd-entity', {
  name: 'Entité',
  order: 1,
  keywords: ['entity', 'entité', 'table', 'model'],
  value: 'Entity',
});
