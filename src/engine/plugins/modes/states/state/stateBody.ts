import type { ModeEdit, ModeSizing, ShapeModel } from '../../../../core/plugins';
import { isState } from '../kinds';
import { BODY_TEXT, stateBody } from './bodyText';
import { fittedHeight } from './stateLayout';

/** Opérations sur le contenu d'un état (sujet 433) : écriture et hauteur ajustée. */

/**
 * État avec ce contenu et la hauteur qui va avec, rien d'écrit (aperçu de la saisie) ; `sizing` : la mesure du texte
 * de l'opération qui l'écrira ensuite.
 */
export function withBody(shape: ShapeModel, text: string, sizing: ModeSizing): ShapeModel {
  const height = fittedHeight(shape, BODY_TEXT.normalize(text), sizing.measureText);
  return { ...BODY_TEXT.preview(shape, text), bounds: { ...shape.bounds, height } };
}

/** Hauteur de l'état ajustée à son titre et à son contenu (`body` : le contenu qui va être écrit). */
export function fitState(edit: ModeEdit, shape: ShapeModel, body = stateBody(shape)): void {
  if (!isState(shape)) return;
  edit.setShapeBounds(shape.id, { ...shape.bounds, height: fittedHeight(shape, body, edit.measureText) });
}

/** Contenu de l'état écrit (saisie sur place ou panneau), puis sa hauteur ajustée. */
export function setBody(edit: ModeEdit, shape: ShapeModel, text: string): void {
  if (!isState(shape)) return;
  edit.setElementAttribute(shape.id, BODY_TEXT.name, BODY_TEXT.value(text));
  fitState(edit, shape, BODY_TEXT.normalize(text));
}
