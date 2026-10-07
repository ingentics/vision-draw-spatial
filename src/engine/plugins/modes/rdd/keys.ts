import { modeKeys } from '../../../core/plugins';

/**
 * Clés du mode RDD (sujet 301), par leur nom court : écrites `spatial.rdd.<nom>` ; les anciennes clés `spatial.<nom>`
 * sont lues le temps de la migration.
 */
export const RDD_KEYS = { namespace: 'rdd', legacyKeys: ['fields', 'secondary', 'reverseName', 'cardinalities'] };
export const keys = modeKeys(RDD_KEYS);
