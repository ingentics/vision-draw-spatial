import { SIDE_NORMALS } from '../../../edit/edgeEnds';
import type { ModeEdit } from '../../types';

/** Briques communes des bouts d'une flèche de relation, imposés par sa sorte (sujet 268). */

/** Pointes des deux bouts (`none` : sans pointe) ; le remplissage, propre aux pointes de draw.io, est retiré. */
export function setEndArrows(edit: ModeEdit, edgeId: string, start: string, end: string): void {
  edit.setElementStyle(edgeId, 'startArrow', start);
  edit.setElementStyle(edgeId, 'endArrow', end);
  edit.setElementStyle(edgeId, 'startFill', undefined);
  edit.setElementStyle(edgeId, 'endFill', undefined);
}

/** Textes de début et de fin retirés (le sens de la flèche ne sert qu'à placer un texte écrit). */
export function removeEndTexts(edit: ModeEdit, edgeId: string): void {
  edit.setEdgeEndText(edgeId, 'start', undefined, SIDE_NORMALS.e);
  edit.setEdgeEndText(edgeId, 'end', undefined, SIDE_NORMALS.e);
}
