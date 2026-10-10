import type { ShapeDefinition } from '../../../../../core/plugins';
import { SYSTEM } from '../../kinds';
import { stickyDefinition } from '../common/stickyShape';

/** Post-it typé du mode Event storming (sujet 475), dessiné par `stickyDefinition`. */
export const definition: ShapeDefinition = stickyDefinition(SYSTEM);
