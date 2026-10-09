import { describe, expect, it } from 'vitest';
import { ModeCurrents } from '../../../../../src/engine/core/domains/modes/modeCurrents';
import type { PageModeDefinition } from '../../../../../src/engine/core/modes/types';
import { setup } from './modesCore';

/** Mode de test à deux couches ; `redraws` : son habillage suit le courant ; un élément cliqué choisit « b ». */
const layers = (redraws: boolean): PageModeDefinition => ({
  id: 'boom',
  namespace: 'boom',
  name: 'Boom',
  current: { initial: () => 'a', valid: (_page, value) => value === 'a' || value === 'b', pick: () => 'b', redraws },
  dressing: (_page, _values, current) => ({ edgeColor: () => (current === 'b' ? '#ff0000' : undefined) }),
});

/**
 * Cœur réduit avec le courant des modes, et les reconstructions de scène notées ; `editing` : texte en édition (la
 * partie d'une forme, ou la forme elle-même).
 */
function currents(redraws: boolean, editing?: { pageId: string; part?: string }) {
  const set = setup(layers(redraws));
  const calls: string[] = [];
  const note = (name: string) => () => void calls.push(name);
  Object.assign(set.core, {
    labelEditor: { editing },
    pages: { ...set.core.pages, currentPageId: 'p', getCurrentPage: () => set.page },
    levels: { rebuildScenes: (pageIds: string[]) => void calls.push(`rebuild:${pageIds.join()}`) },
    events: { emit: note('event') },
    rendering: { requestRender: note('render') },
  });
  const modeCurrents = new ModeCurrents(set.core);
  Object.assign(set.core, { modeCurrents });
  return { ...set, modeCurrents, calls };
}

describe('courant d’un mode et habillage (sujet 414)', () => {
  it('l’habillage reçoit le courant de la page', () => {
    const { modes, modeCurrents, page } = currents(true);
    expect(modes.dressing(page)!.edgeColor!(page.edges[0]!)).toBeUndefined();
    modeCurrents.setModeCurrent('b', 'p');
    expect(modes.dressing(page)!.edgeColor!(page.edges[0]!)).toBe('#ff0000');
  });

  it('`redraws` : la page est redessinée quand le courant change', () => {
    const { modeCurrents, calls } = currents(true);
    modeCurrents.setModeCurrent('b', 'p');
    expect(calls).toEqual(['rebuild:p', 'event', 'render']);
  });

  it('sans `redraws` : rien n’est reconstruit', () => {
    const { modeCurrents, calls } = currents(false);
    modeCurrents.setModeCurrent('b', 'p');
    expect(calls).toEqual(['event', 'render']);
  });

  it('texte d’une partie en édition (sujet 422) : le courant de la page ne change pas', () => {
    const { modeCurrents, page, calls } = currents(true, { pageId: 'p', part: 'name' });
    modeCurrents.setModeCurrent('b', 'p');
    expect(modeCurrents.pickModeCurrent(page, page.shapes[0]!)).toBe(false);
    expect(modeCurrents.getModeCurrent('p')).toBe('a');
    expect(calls).toEqual([]);
  });

  it('texte de la forme en édition, ou partie d’une autre page : le courant change', () => {
    const shape = currents(true, { pageId: 'p' });
    expect(shape.modeCurrents.pickModeCurrent(shape.page, shape.page.shapes[0]!)).toBe(true);
    expect(shape.modeCurrents.getModeCurrent('p')).toBe('b');
    const other = currents(true, { pageId: 'q', part: 'name' });
    other.modeCurrents.setModeCurrent('b', 'p');
    expect(other.modeCurrents.getModeCurrent('p')).toBe('b');
  });
});
