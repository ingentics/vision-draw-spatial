import type { ShapeDefinition } from '../../../../../core/plugins';
import { QUERY } from '../../kinds';
import { stickyDefinition } from '../common/stickyShape';

/** Post-it typé du mode Event storming (sujet 475), dessiné par `stickyDefinition`. */
export const definition: ShapeDefinition = stickyDefinition(QUERY);
