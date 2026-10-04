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

/**
 * Suivre un lien (SPEC §11.1) : touche (paramètre `controls.followLinkKey`, ⌘ par défaut) + geste
 * (`controls.followLinkGesture`, clic simple par défaut, ou double-clic). 'none' : sans touche, ce
 * qui n'a de sens qu'au double-clic (un clic seul doit rester une sélection). Maintenir la touche
 * fait ressortir les zones liées.
 */
export type FollowLinkKey = MultiSelectKey | 'none';
export type FollowLinkGesture = 'click' | 'doubleClick';

export const FOLLOW_LINK_KEYS: readonly FollowLinkKey[] = [...MULTI_SELECT_KEYS, 'none'];
export const FOLLOW_LINK_GESTURES: readonly FollowLinkGesture[] = ['click', 'doubleClick'];

/** Geste effectif : sans touche, toujours le double-clic. */
export function followLinkGesture(key: FollowLinkKey, gesture: FollowLinkGesture): FollowLinkGesture {
  return key === 'none' ? 'doubleClick' : gesture;
}

/** `KeyboardEvent.key` de chaque touche de modification. */
const MODIFIER_EVENT_KEYS: Record<MultiSelectKey, string> = {
  ctrl: 'Control',
  meta: 'Meta',
  shift: 'Shift',
  alt: 'Alt',
};

/** Cet événement clavier est-il cette touche de modification (enfoncée ou relâchée) ? */
export function isModifierKeyEvent(event: Pick<KeyboardEvent, 'key'>, key: FollowLinkKey): boolean {
  return key !== 'none' && event.key === MODIFIER_EVENT_KEYS[key];
}

/** Touches de modification, telles qu'affichées dans les infobulles. */
export const MODIFIER_KEY_LABELS: Record<MultiSelectKey, string> = {
  ctrl: 'Ctrl',
  meta: '⌘',
  shift: 'Maj',
  alt: 'Alt',
};

/** La touche pour suivre un lien est-elle enfoncée (toujours vrai pour 'none') ? */
export function hasFollowLinkKey(
  event: Pick<MouseEvent, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  key: FollowLinkKey,
): boolean {
  return key === 'none' || hasMultiSelectKey(event, key);
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
