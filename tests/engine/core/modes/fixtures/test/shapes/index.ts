import type { ShapeDefinition } from '../../../../../../../src/engine/core/shapes/types';
import { definition as box } from './test-box';

/** Formes générées du mode de test (sujet 511) : une variante de la boîte, id préfixé par celui du mode. */
export const definitions: ShapeDefinition[] = [{ ...box, id: 'test-wide', palette: undefined }];
