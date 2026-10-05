import { describe, expect, it } from 'vitest';
import type { PickedElement } from '../../../src/engine/interaction/pick';
import {
  followLinkGesture,
  hasFollowLinkKey,
  isModifierKeyEvent,
  hasMultiSelectKey,
  independentRoots,
  toggleSelected,
} from '../../../src/engine/interaction/selection';
import type { ShapeModel } from '../../../src/engine/model/types';

const shape = (id: string): PickedElement => ({ type: 'shape', element: { id } as ShapeModel });
const ids = (items: PickedElement[]) => items.map((item) => item.element.id);

describe('sélection multiple', () => {
  it('touche + clic ajoute l’élément, ou le retire s’il est déjà sélectionné', () => {
    const one = toggleSelected([], shape('a'));
    const two = toggleSelected(one, shape('b'));
    expect(ids(two)).toEqual(['a', 'b']);
    expect(ids(toggleSelected(two, shape('a')))).toEqual(['b']);
    expect(ids(toggleSelected(toggleSelected(two, shape('a')), shape('b')))).toEqual([]);
  });

  it('touche paramétrable : Ctrl, ⌘ / Windows, Maj ou Alt', () => {
    const event = { ctrlKey: false, metaKey: true, shiftKey: false, altKey: false };
    expect(hasMultiSelectKey(event, 'meta')).toBe(true);
    expect(hasMultiSelectKey(event, 'ctrl')).toBe(false);
    expect(hasMultiSelectKey({ ...event, metaKey: false, shiftKey: true }, 'shift')).toBe(true);
  });

  it('suivre un lien : ⌘ + double-clic par défaut, ou double-clic seul avec « aucune »', () => {
    const plain = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
    expect(hasFollowLinkKey(plain, 'meta')).toBe(false);
    expect(hasFollowLinkKey({ ...plain, metaKey: true }, 'meta')).toBe(true);
    expect(hasFollowLinkKey(plain, 'none')).toBe(true);
  });

  it('suivre un lien à Espace : maintenue d’après le clavier, pas d’après l’événement souris (ticket 121)', () => {
    const plain = { ctrlKey: false, metaKey: true, shiftKey: false, altKey: false };
    expect(hasFollowLinkKey(plain, 'space')).toBe(false);
    expect(hasFollowLinkKey(plain, 'space', true)).toBe(true);
    expect(isModifierKeyEvent({ key: ' ' }, 'space')).toBe(true);
    expect(isModifierKeyEvent({ key: ' ' }, 'meta')).toBe(false);
  });

  it('suivre un lien : sans touche, toujours au double-clic (un clic seul reste une sélection)', () => {
    expect(followLinkGesture('meta', 'click')).toBe('click');
    expect(followLinkGesture('ctrl', 'doubleClick')).toBe('doubleClick');
    expect(followLinkGesture('none', 'click')).toBe('doubleClick');
  });

  it('touche maintenue reconnue à l’appui et au relâchement (zones liées, aide de la barre du bas)', () => {
    expect(isModifierKeyEvent({ key: 'Meta' }, 'meta')).toBe(true);
    expect(isModifierKeyEvent({ key: 'Control' }, 'ctrl')).toBe(true);
    expect(isModifierKeyEvent({ key: 'Control' }, 'meta')).toBe(false);
    expect(isModifierKeyEvent({ key: 'Meta' }, 'none')).toBe(false);
  });

  it('déplacement : une forme déjà emportée par un conteneur sélectionné ne bouge pas deux fois', () => {
    const contents: Record<string, Set<string>> = {
      lane: new Set(['lane', 'lane-a']),
      'lane-a': new Set(['lane-a']),
      other: new Set(['other']),
    };
    expect(independentRoots(['lane-a', 'lane', 'other', 'lane'], (id) => contents[id]!)).toEqual(['lane', 'other']);
  });
});
