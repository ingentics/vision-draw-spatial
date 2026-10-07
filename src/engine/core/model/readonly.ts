import type { EdgeModel, PageModel, ShapeModel } from './types';

/**
 * Modèle en lecture seule (sujet 303), pour ce que le tronc donne aux plugins : ils lisent la page, ses formes et ses
 * flèches, et n'écrivent que par `ModeEdit`. Les fonctions restent telles quelles.
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

export type ReadonlyPageModel = DeepReadonly<PageModel>;
export type ReadonlyShapeModel = DeepReadonly<ShapeModel>;
export type ReadonlyEdgeModel = DeepReadonly<EdgeModel>;
