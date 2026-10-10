import { modeKeys } from '../../../core/plugins';

/** Clés du mode Machine à états (sujet 433), par leur nom court : écrites `spatial.sm.<nom>`. */
export const STATES_KEYS = { namespace: 'sm' };
export const keys = modeKeys(STATES_KEYS);
