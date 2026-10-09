import { describe, expect, it } from 'vitest';
import { ModeCurrents } from '../../../../../src/engine/core/domains/modes/modeCurrents';
import type { PageModeDefinition } from '../../../../../src/engine/core/modes/types';
import { setup } from './modesCore';

/** Mode de test à deux couches ; `redraws` : son habillage suit le courant. */
const layers = (redraws: boolean): PageModeDefinition => ({
  id: 'boom',
  namespace: 'boom',
  name: 'Boom',
  current: { initial: () => 'a', valid: (_page, value) => value === 'a' || value === 'b', redraws },
  dressing: (_page, _values, current) => ({ edgeColor: () => (current === 'b' ? '#ff0000' : undefined) }),
});

/** Cœur réduit avec le courant des modes, et les reconstructions de scène notées. */
function currents(redraws: boolean) {
  const set = setup(layers(redraws));
  const calls: string[] = [];
  const note = (name: string) => () => void calls.push(name);
  Object.assign(set.core, {
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
});
