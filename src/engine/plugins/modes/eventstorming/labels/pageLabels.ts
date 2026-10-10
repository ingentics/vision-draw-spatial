import type { ModeEdit, ModeProperty, PageModel } from '../../../../core/plugins';
import { isToggled, shapeOf, toggleValue } from '../../../../core/plugins';
import { keys, LABELS } from '../keys';
import { isSticky } from '../kinds';

/**
 * Réglage « Labels » de la page (sujet 475) : `spatial.es.labels=0` sur `<diagram>` masque le label de tous les
 * post-it (aide pour débuter), absent = affichés. La valeur est recopiée sur chaque post-it (`spatial.es.labels=0`),
 * car son dessin et sa zone d'édition ne voient que la forme ; le mode la tient à jour quand des post-it arrivent.
 */

const labelsShown = (page: PageModel): boolean => keys.pageFlag(page, LABELS, true);

/** Recopie le réglage de la page sur ces post-it (tous ceux de la page par défaut). */
export function syncLabels(edit: ModeEdit, shapeIds?: readonly string[], shown = labelsShown(edit.page)): void {
  const shapes = shapeIds ? shapeIds.map((id) => shapeOf(edit.page, id)).filter((shape) => !!shape) : edit.page.shapes;
  // Copie du réglage de la page : tenue à jour même sur un post-it verrouillé (sujet 508).
  for (const shape of shapes)
    if (isSticky(shape)) edit.setElementAttribute(shape.id, LABELS, shown ? undefined : '0', { derived: true });
}

export const LABELS_PROPERTY: ModeProperty = {
  type: 'toggle',
  key: LABELS,
  label: 'Labels',
  title: 'Nom du type en haut de chaque post-it ; décoché, le texte prend tout le post-it (spatial.es.labels)',
  value: (page) => toggleValue(labelsShown(page)),
  write: (edit, _target, value) => {
    const shown = isToggled(value);
    edit.setPageAttribute(LABELS, shown ? undefined : '0');
    syncLabels(edit, undefined, shown);
  },
};
