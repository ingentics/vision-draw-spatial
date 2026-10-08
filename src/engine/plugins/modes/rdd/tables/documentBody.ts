import type { ModeEdit, ShapeModel } from '../../../../core/plugins';
import { FIELDS, fieldsOf, isDivider } from './fieldModel';
import { tableKindOf } from './tableKinds';
import { keys } from '../keys';

/**
 * Corps d'un document RDD (sujet 269) : texte libre, pas forcément du YAML (sujet 352), à la place des champs. Rangé
 * dans `spatial.rdd.body` en chaîne JSON (retours à la ligne en `\n`) dont les `;`, séparateurs du style draw.io, sont
 * échappés en `;` : le texte revient tel quel. Seul l'import compte, pas l'affichage dans draw.io.
 */
export const BODY = 'body';

/** Partie du corps (`ModeParts.textAt`) : son texte s'édite sur place ; le texte dessiné porte cette marque. */
export const BODY_PART = 'body';

/** Indentation d'une tabulation (alignement en police à chasse fixe). */
const TAB = '  ';

/** Le corps a-t-il sa place dans cette forme (document) ? */
export const hasBody = (shape: ShapeModel): boolean => !!tableKindOf(shape)?.rules.body;

/** Valeur écrite du corps ; undefined (attribut retiré) pour un corps vide. */
export function bodyValue(text: string): string | undefined {
  return text ? JSON.stringify(text).replaceAll(';', '\\u003b') : undefined;
}

/** Corps d'un document ; vide s'il n'en a pas. Une valeur qui n'est pas une chaîne JSON (fichier modifié) est lue telle quelle. */
export function documentBody(shape: ShapeModel): string {
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
export const normalizedBody = (text: string): string => text.replace(/\r\n?/g, '\n').replaceAll('\t', TAB);

/** Corps du document écrit (saisie sur place ou panneau). */
export function setBody(edit: ModeEdit, shape: ShapeModel, text: string): void {
  if (hasBody(shape)) edit.setElementAttribute(shape.id, BODY, bodyValue(normalizedBody(text)));
}

/**
 * Document d'avant le corps en texte (sujet 181 : clés en italique dans `spatial.rdd.fields`) : ses clés deviennent un
 * corps, une ligne `clé:` par clé (ajoutées à un corps déjà là), et les champs sont retirés.
 */
export function convertDocumentKeys(edit: ModeEdit, shape: ShapeModel): void {
  if (!hasBody(shape) || keys.value(shape, FIELDS) === undefined) return;
  const lines = fieldsOf(shape)
    .filter((row) => !isDivider(row) && row.label.trim())
    .map((row) => `${row.label.trim()}:`);
  const body = [documentBody(shape), ...lines].filter(Boolean).join('\n');
  edit.setElementAttribute(shape.id, BODY, bodyValue(body));
  edit.setElementAttribute(shape.id, FIELDS, undefined);
}
