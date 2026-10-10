import type { ShapeModel } from '../../../core/plugins';

/**
 * Formes du mode Machine à états (sujets 433, 435). Leurs ids sont préfixés par celui du mode (`states-`), comme le
 * registre l'exige de toute forme de mode.
 */
export const STATE_KIND = 'states-state';
export const INITIAL_KIND = 'states-initial';
export const FINAL_KIND = 'states-final';
export const COMPOSITE_KIND = 'states-composite';

export const isState = (shape: ShapeModel) => shape.kind === STATE_KIND;
export const isInitial = (shape: ShapeModel) => shape.kind === INITIAL_KIND;
export const isFinal = (shape: ShapeModel) => shape.kind === FINAL_KIND;
export const isComposite = (shape: ShapeModel) => shape.kind === COMPOSITE_KIND;

/** État ou ensemble : il a un nom et reçoit les transitions dans les deux sens. */
export const isStateLike = (shape: ShapeModel) => isState(shape) || isComposite(shape);

/** Forme du mode : elle peut être dans un ensemble et porter une transition. */
export const isNode = (shape: ShapeModel) => isStateLike(shape) || isInitial(shape) || isFinal(shape);
