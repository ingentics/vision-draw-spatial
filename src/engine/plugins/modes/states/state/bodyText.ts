import type { ShapeModel } from '../../../../core/plugins';
import { keys } from '../keys';

/**
 * Contenu d'un état (sujet 433) : texte libre sous son titre, rangé dans `spatial.sm.body` en chaîne JSON (retours à
 * la ligne en `\n`) dont les `;`, séparateurs du style draw.io, sont échappés : le texte revient tel quel. draw.io ne le
 * dessine pas.
 */
export const BODY = 'body';

/** Partie du contenu (`ModeParts.textAt`) : son texte s'édite sur place ; le texte dessiné porte cette marque. */
export const BODY_PART = 'body';

/** Valeur écrite du contenu ; undefined (attribut retiré) pour un contenu vide. */
export function bodyValue(text: string): string | undefined {
  return text.trim() ? JSON.stringify(text).replaceAll(';', '\\u003b') : undefined;
}

/** Contenu d'un état ; vide s'il n'en a pas. Une valeur qui n'est pas une chaîne JSON (fichier modifié) est lue telle quelle. */
export function stateBody(shape: ShapeModel): string {
  const value = keys.value(shape, BODY);
  if (!value) return '';
  try {
    const text: unknown = JSON.parse(value);
    return typeof text === 'string' ? text : value;
  } catch {
    return value;
  }
}

/** Texte saisi remis en forme : fins de ligne `\n`, tabulations en deux espaces. */
export const normalized = (text: string) => text.replace(/\r\n?/g, '\n').replaceAll('\t', '  ');
