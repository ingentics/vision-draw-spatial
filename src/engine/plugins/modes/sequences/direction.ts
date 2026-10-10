import type { EdgeModel, ModeEdit, ModeKey, ModeProperty, PageModel } from '../../../core/plugins';
import { edgeOf, styleFlag } from '../../../core/plugins';
import { sequenceState } from './steps';

/**
 * Sens d'une flèche d'un flux (sujets 426, 429) : aller ou retour. Le style draw.io (`dashed`) en est la source de
 * vérité : un retour est en pointillés ; la propriété « Sens », la touche « x » et l'export ne font que le lire et
 * l'écrire.
 */

/**
 * Icônes du sens d'une flèche (sujet 426) : aller en trait plein vers la droite (tout en `accent`, plein), retour en
 * pointillés vers la gauche (trait en `line`, que l'icône dessine en pointillés).
 */
const DIRECTION_ICONS = {
  call: { accent: 'M1.5 8H13.5M10.5 5 13.5 8l-3 3' },
  return: { line: 'M4 8H14.5', accent: 'M5.5 5 2.5 8l3 3' },
};

/** La flèche est-elle un retour (pointillés, `dashed=1`) ? */
export function isReturnEdge(edge: EdgeModel): boolean {
  return styleFlag(edge.style, 'dashed');
}

function isReturn(page: PageModel, edgeId: string): boolean {
  const edge = edgeOf(page, edgeId);
  return edge !== undefined && isReturnEdge(edge);
}

function setReturn(edit: ModeEdit, edgeId: string, back: boolean): void {
  edit.setElementStyle(edgeId, 'dashed', back ? '1' : undefined);
}

/** Propriété « Sens » d'une flèche d'un flux, masquée hors flux. */
export const DIRECTION_PROPERTY: ModeProperty = {
  type: 'choice',
  key: 'dashed',
  label: 'Sens',
  title:
    'Sens de la flèche dans son flux : un retour est en pointillés (dashed=1) ; dès qu’un flux en a un, ses flèches pleines sont toujours des allers',
  options: () => [
    {
      value: 'call',
      label: 'Aller',
      title: 'Aller : appel, flèche pleine (dashed retiré)',
      icon: DIRECTION_ICONS.call,
    },
    {
      value: 'return',
      label: 'Retour',
      title: 'Retour : réponse à un aller ouvert, flèche en pointillés (dashed=1)',
      icon: DIRECTION_ICONS.return,
    },
  ],
  value: (page, target) => (isReturn(page, target.id) ? 'return' : 'call'),
  write: (edit, target, value) => setReturn(edit, target.id, value === 'return'),
  hidden: (page, target) => !sequenceState(page).placement.has(target.id),
};

/** Touche « x » : bascule aller / retour de la flèche sélectionnée d'un flux. */
export const DIRECTION_KEY: ModeKey = {
  label: 'Sens',
  applies: (page, target) => sequenceState(page).placement.has(target.id),
  run: (edit, target) => setReturn(edit, target.id, !isReturn(edit.page, target.id)),
};
