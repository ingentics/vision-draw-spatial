import type { PickedElement } from './pick';

/**
 * Sélection multiple (SPEC §11.1) : un clic avec la touche de sélection multiple (paramètre
 * `controls.multiSelectKey`, Ctrl par défaut) ajoute l'élément à la sélection, ou l'en retire.
 */

/** Touche de modification qui, maintenue pendant un clic, ajoute ou retire l'élément de la sélection. */
export type MultiSelectKey = 'ctrl' | 'meta' | 'shift' | 'alt';

export const MULTI_SELECT_KEYS: readonly MultiSelectKey[] = ['ctrl', 'meta', 'shift', 'alt'];

/** La touche de sélection multiple est-elle enfoncée pendant cet événement ? */
export function hasMultiSelectKey(
  event: Pick<MouseEvent, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  key: MultiSelectKey,
): boolean {
  if (key === 'ctrl') return event.ctrlKey;
  if (key === 'meta') return event.metaKey;
  if (key === 'shift') return event.shiftKey;
  return event.altKey;
}

/** Ajoute l'élément à la sélection, ou l'en retire s'il y est déjà (comparaison par id). */
export function toggleSelected(items: readonly PickedElement[], picked: PickedElement): PickedElement[] {
  const id = picked.element.id;
  return items.some((item) => item.element.id === id)
    ? items.filter((item) => item.element.id !== id)
    : [...items, picked];
}

/**
 * Formes à déplacer ensemble : une par forme sélectionnée, sans celles déjà contenues dans une
 * autre (déplacer le conteneur emporte son contenu, il ne faut pas le déplacer deux fois).
 * `containedIn(id)` : ids des formes déplacées avec la forme `id` (elle comprise).
 */
export function independentRoots(rootIds: readonly string[], containedIn: (id: string) => Set<string>): string[] {
  const unique = [...new Set(rootIds)];
  return unique.filter((id) => !unique.some((other) => other !== id && containedIn(other).has(id)));
}
