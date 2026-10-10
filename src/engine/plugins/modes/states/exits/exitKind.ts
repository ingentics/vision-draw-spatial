import type { EdgeModel, ModeEdit, ModeProperty, PageModel, ShapeModel } from '../../../../core/plugins';
import { shapeOf, shapeTarget } from '../../../../core/plugins';
import { isFinal } from '../kinds';
import { keys } from '../keys';

/**
 * Sortie attendue ou en erreur (sujet 433) : booléen `spatial.sm.error=1` d'un point de sortie (absent : attendue). En
 * erreur, le point et les transitions qui y mènent sont dessinés en rouge (sujet 434), écrits en rouge à l'export
 * PlantUML (sujet 436).
 */
const ERROR = 'error';

/** Rouge d'une sortie en erreur. */
export const ERROR_COLOR = '#d32f2f';

/** Noir des points d'entrée et des sorties attendues. */
export const POINT_COLOR = '#000000';

export const isErrorExit = (shape: ShapeModel | undefined): boolean =>
  !!shape && isFinal(shape) && keys.flag(shape, ERROR);

/** Transition vers une sortie en erreur. */
export const leadsToError = (page: PageModel, edge: EdgeModel): boolean => isErrorExit(shapeOf(page, edge.targetId));

/** Sortie en erreur ou attendue ; la couleur est aussi écrite dans le style, pour draw.io. */
function setErrorExit(edit: ModeEdit, shape: ShapeModel, error: boolean): void {
  if (!isFinal(shape)) return;
  const color = error ? ERROR_COLOR : POINT_COLOR;
  edit.setElementAttribute(shape.id, ERROR, error ? '1' : undefined);
  edit.setElementStyle(shape.id, 'fillColor', color);
  edit.setElementStyle(shape.id, 'strokeColor', color);
}

/** Icônes du choix : la cible UML (disque dans un cercle) ; une croix dans le cercle pour une sortie en erreur. */
const DOT = 'M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z';
const RING = 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z';
const EXIT_ICONS = {
  expected: { fill: DOT, accent: RING },
  error: { accent: `${RING}M5.5 5.5l5 5M10.5 5.5l-5 5` },
};

/** Choix « Attendue » / « En erreur » du panneau d'un point de sortie. */
export const EXIT_PROPERTY: ModeProperty = {
  type: 'choice',
  key: ERROR,
  section: 'Point de sortie',
  label: 'Sortie',
  title: 'Sortie attendue, ou en erreur : point et transitions qui y mènent en rouge (spatial.sm.error)',
  options: () => [
    {
      value: '',
      label: 'Attendue',
      title: 'Attendue : fin normale de la machine, en noir (spatial.sm.error retiré)',
      icon: EXIT_ICONS.expected,
    },
    {
      value: '1',
      label: 'En erreur',
      title: 'En erreur : point et transitions qui y mènent en rouge (spatial.sm.error=1)',
      icon: EXIT_ICONS.error,
    },
  ],
  value: (_page, target) => (isErrorExit(shapeTarget(target)) ? '1' : ''),
  write: (edit, target, value) => {
    const shape = shapeTarget(target);
    if (shape) setErrorExit(edit, shape, value === '1');
  },
  hidden: (_page, target) => {
    const shape = shapeTarget(target);
    return !shape || !isFinal(shape);
  },
};
