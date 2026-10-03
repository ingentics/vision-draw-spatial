import { describe, expect, it } from 'vitest';
import type { PickedElement } from '../../../src/engine/interaction/pick';
import { hasMultiSelectKey, independentRoots, toggleSelected } from '../../../src/engine/interaction/selection';
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

  it('déplacement : une forme déjà emportée par un conteneur sélectionné ne bouge pas deux fois', () => {
    const contents: Record<string, Set<string>> = {
      lane: new Set(['lane', 'lane-a']),
      'lane-a': new Set(['lane-a']),
      other: new Set(['other']),
    };
    expect(independentRoots(['lane-a', 'lane', 'other', 'lane'], (id) => contents[id]!)).toEqual(['lane', 'other']);
  });
});
