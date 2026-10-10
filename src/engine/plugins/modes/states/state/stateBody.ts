import type { ModeEdit, ModeProperty, ModeSizing, ShapeModel } from '../../../../core/plugins';
import { shapeTarget } from '../../../../core/plugins';
import { isState } from '../kinds';
import { BODY_TEXT, stateBody } from './bodyText';
import { fittedHeight } from './stateLayout';

/** Opérations sur le contenu d'un état (sujet 433) : écriture, hauteur ajustée, propriété du panneau. */

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

/** Propriété « Contenu » d'un état, dans la section de l'état ; masquée pour les autres formes. */
export const BODY_PROPERTY: ModeProperty = {
  type: 'text',
  key: BODY_TEXT.name,
  label: 'Contenu',
  title:
    'Contenu de l’état sous son titre, en texte libre (spatial.sm.body) ; ⌘ + Entrée pour valider, double-clic dans la zone pour l’éditer sur place',
  multiline: true,
  value: (_page, target) => {
    const shape = shapeTarget(target);
    return shape && stateBody(shape);
  },
  write: (edit, target, value) => {
    const shape = shapeTarget(target);
    if (shape) setBody(edit, shape, value ?? '');
  },
  hidden: (_page, target) => {
    const shape = shapeTarget(target);
    return !shape || !isState(shape);
  },
};
