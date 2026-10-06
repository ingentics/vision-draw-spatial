import { table } from '../common/table';

/** Entité énumérative (sujet 180) : l'entité, entête à cadre double (sujets 215, 216) ; ses champs après `id` sont ses valeurs. */
export const definition = table('rdd-enum', {
  name: 'Entité énumérative',
  order: 2,
  keywords: ['enum', 'énumération', 'entity', 'valeurs', 'table'],
  value: 'Enum',
});
