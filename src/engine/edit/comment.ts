import type { EdgeModel, ShapeModel } from '../model/types';

/**
 * Commentaire d'un élément : l'attribut `tooltip` de son `<UserObject>`, celui que draw.io montre en infobulle au
 * survol (ticket 188).
 */
export const COMMENT_ATTRIBUTE = 'tooltip';

/** Commentaire de l'élément ; undefined s'il n'en a pas (ou s'il est vide). */
export function commentOf(element: ShapeModel | EdgeModel): string | undefined {
  const comment = element.attributes[COMMENT_ATTRIBUTE];
  return comment?.trim() ? comment : undefined;
}
