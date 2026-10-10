import { modeText } from '../../../../core/plugins';
import type { ModeEdit, ShapeModel } from '../../../../core/plugins';
import { FIELDS, fieldsOf, isDivider } from './fieldModel';
import { tableKindOf } from './tableKinds';
import { keys } from '../keys';

/**
 * Corps d'un document RDD (sujet 269) : texte libre, pas forcément du YAML (sujet 352), à la place des champs, rangé
 * dans `spatial.rdd.body` (`modeText`, sujet 448).
 */
export const BODY_TEXT = modeText(keys, 'body');

/** Partie du corps (`ModeParts.textAt`) : son texte s'édite sur place ; le texte dessiné porte cette marque. */
export const BODY_PART = 'body';

/** Le corps a-t-il sa place dans cette forme (document) ? */
export const hasBody = (shape: ShapeModel): boolean => !!tableKindOf(shape)?.rules.body;

/** Corps d'un document ; vide s'il n'en a pas. */
export const documentBody = (shape: ShapeModel): string => BODY_TEXT.read(shape);

/** Corps du document écrit (saisie sur place ou panneau). */
export function setBody(edit: ModeEdit, shape: ShapeModel, text: string): void {
  if (hasBody(shape)) edit.setElementAttribute(shape.id, BODY_TEXT.name, BODY_TEXT.value(text));
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
  edit.setElementAttribute(shape.id, BODY_TEXT.name, BODY_TEXT.value(body));
  edit.setElementAttribute(shape.id, FIELDS, undefined);
}
