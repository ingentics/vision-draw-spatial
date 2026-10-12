import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import type { PageTakeover, PageOverlay } from '../../../../../../src/engine/core/modes/pageTakeover';
import type { InputCapture } from '../../../../../../src/engine/core/modes/pageTakeover';
import { StoryPlayback } from '../../../../../../src/engine/plugins/modes/storytelling/simulation/storyPlayback';
import { StorySimulator } from '../../../../../../src/engine/plugins/modes/storytelling/simulation/storySimulator';
import { fixture } from '../../../../../helpers';

const page = () => readDrawio(fixture('storytelling.drawio')).document.pages[0]!;

describe('simulation des histoires : ouverte sur la page', () => {
  function takeover() {
    const state: {
      overlay?: PageOverlay;
      capture?: InputCapture;
      current?: string;
      kept: string[];
      released?: () => void;
    } = { kept: [] };
    const stage: PageTakeover = {
      lockEditing: (owner, released) => {
        state.released = released;
        return {
          owner,
          pageId: 'histoires',
          release: () => state.released?.(),
          captureInput: (capture) => {
            state.capture = capture;
          },
        };
      },
      setOverlay: (_owner, overlay) => {
        state.overlay = overlay;
      },
      clearOverlay: () => {
        state.overlay = undefined;
      },
      keepInView: (id) => {
        state.kept.push(id);
      },
      setModeCurrent: (value) => {
        state.current = value;
      },
    };
    return { stage, state };
  }

  it('tout caché sauf ce qui est montré ; touches ; histoire du pas comme courant ; Échap rend tout', () => {
    const { stage, state } = takeover();
    const simulator = StorySimulator.open(stage, new StoryPlayback(page()))!;
    expect(state.overlay?.veil).toEqual({ hide: true, kept: ['client'] });
    expect([state.current, state.kept.at(-1)]).toEqual(['commander', 'client']);
    expect(state.capture!.key!('ArrowRight')).toBe(true);
    expect(state.overlay?.veil?.kept).toEqual(['client', 'commander', 'panier']);
    expect(state.capture!.key!('PageDown')).toBe(true);
    expect(state.kept.at(-1)).toBe('paiement');
    expect(state.capture!.key!('ArrowDown')).toBe(true);
    expect(state.current).toBe('controler');
    expect(state.capture!.key!('Home')).toBe(true);
    expect(state.overlay?.veil?.kept).toEqual(['client']);
    // Touche sans rapport : rendue à la vue.
    expect(state.capture!.key!('a')).toBe(false);
    expect(state.capture!.key!('Escape')).toBe(true);
    expect([simulator.opened, state.overlay]).toEqual([false, undefined]);
  });

  it('sans histoire : pas de simulation', () => {
    const empty = { ...page(), edges: [] };
    expect(StorySimulator.open(takeover().stage, new StoryPlayback(empty))).toBeUndefined();
  });
});
