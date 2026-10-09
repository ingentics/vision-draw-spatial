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
 * Suivre un lien (SPEC §11.1) : touche (paramètre `controls.followLinkKey`, Espace par défaut) + geste
 * (`controls.followLinkGesture`, clic simple par défaut, ou double-clic). 'none' : sans touche, ce
 * qui n'a de sens qu'au double-clic (un clic seul doit rester une sélection). Maintenir la touche
 * fait ressortir les zones liées. Espace garde son glisser (déplacement de la vue) : seul un clic
 * sans glisser suit le lien (ticket 121).
 */
export type FollowLinkKey = MultiSelectKey | 'space' | 'none';
export type FollowLinkGesture = 'click' | 'doubleClick';

export const FOLLOW_LINK_KEYS: readonly FollowLinkKey[] = [...MULTI_SELECT_KEYS, 'space', 'none'];
export const FOLLOW_LINK_GESTURES: readonly FollowLinkGesture[] = ['click', 'doubleClick'];

/** Geste effectif : sans touche, toujours le double-clic. */
export function followLinkGesture(key: FollowLinkKey, gesture: FollowLinkGesture): FollowLinkGesture {
  return key === 'none' ? 'doubleClick' : gesture;
}

/** `KeyboardEvent.key` de chaque touche de modification (et d'Espace). */
const MODIFIER_EVENT_KEYS: Record<Exclude<FollowLinkKey, 'none'>, string> = {
  ctrl: 'Control',
  meta: 'Meta',
  shift: 'Shift',
  alt: 'Alt',
  space: ' ',
};

/** Cet événement clavier est-il cette touche (enfoncée ou relâchée) ? */
export function isModifierKeyEvent(event: Pick<KeyboardEvent, 'key'>, key: FollowLinkKey): boolean {
  return key !== 'none' && event.key === MODIFIER_EVENT_KEYS[key];
}

/** Touches de modification, telles qu'affichées dans les infobulles. */
const MODIFIER_KEY_LABELS: Record<MultiSelectKey, string> = {
  ctrl: 'Ctrl',
  meta: '⌘',
  shift: 'Maj',
  alt: 'Alt',
};

/** Touches pour suivre un lien, telles qu'affichées dans les infobulles. */
export const FOLLOW_LINK_KEY_LABELS: Record<Exclude<FollowLinkKey, 'none'>, string> = {
  ...MODIFIER_KEY_LABELS,
  space: 'Espace',
};

/**
 * La touche pour suivre un lien est-elle enfoncée (toujours vrai pour 'none') ? Espace n'est pas
 * dans l'événement souris : `spaceDown` dit si elle est maintenue.
 */
export function hasFollowLinkKey(
  event: Pick<MouseEvent, 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  key: FollowLinkKey,
  spaceDown = false,
): boolean {
  if (key === 'space') return spaceDown;
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
