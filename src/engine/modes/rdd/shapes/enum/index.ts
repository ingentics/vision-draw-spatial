import { table } from '../../table';

/** Entité énumérative (sujet 180) : l'entité avec la mention `«enum»` ; ses champs après `id` sont ses valeurs. */
export const definition = table('rdd-enum', {
  name: 'Entité énumérative',
  order: 2,
  keywords: ['enum', 'énumération', 'entity', 'valeurs', 'table'],
  value: 'Enum',
});
