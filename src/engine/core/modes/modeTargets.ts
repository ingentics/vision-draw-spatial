import type { ReadonlyEdgeModel, ReadonlyPageModel, ReadonlyShapeModel } from '../model/readonly';
import type { ModeProperty, ModeTarget } from './types';

/** Forme sélectionnée ; undefined pour la page ou une flèche. */
export const shapeTarget = (target: ModeTarget): ReadonlyShapeModel | undefined =>
  'kind' in target ? target : undefined;

/** Flèche sélectionnée ; undefined pour la page ou une forme. */
export const edgeTarget = (target: ModeTarget): ReadonlyEdgeModel | undefined =>
  'sourceId' in target ? target : undefined;

/**
 * Réglages montrés seulement pour les cibles où `shown` est vrai (ex. flèches d'une sorte de relation), en plus de leur
 * propre condition.
 */
export const onlyWhen = (
  properties: readonly ModeProperty[],
  shown: (page: ReadonlyPageModel, target: ModeTarget, part?: string) => boolean,
): ModeProperty[] =>
  properties.map((property) => ({
    ...property,
    hidden: (page: ReadonlyPageModel, target: ModeTarget, part?: string) =>
      !shown(page, target, part) || !!property.hidden?.(page, target, part),
  }));
