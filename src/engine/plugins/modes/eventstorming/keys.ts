import { modeKeys } from '../../../core/plugins';

/** Clés du mode Event storming (sujet 475), par leur nom court : écrites `spatial.es.<nom>`. */
export const EVENT_STORMING_KEYS = { namespace: 'es' };
export const keys = modeKeys(EVENT_STORMING_KEYS);

/** Clé du réglage « Labels » (sujet 475), sur la page et recopiée sur chaque post-it : `spatial.es.labels=0`. */
export const LABELS = 'labels';
