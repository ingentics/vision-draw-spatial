import type { ShapeDefinition } from '../../../../core/plugins';
import { STICKY_TYPES } from '../kinds';
import { stickyDefinition } from './common/stickyShape';

/** Post-it typés du mode Event storming (sujets 475, 511) : un par type de `kinds.ts`, dans l'ordre de la palette. */
export const definitions: ShapeDefinition[] = STICKY_TYPES.map(stickyDefinition);
