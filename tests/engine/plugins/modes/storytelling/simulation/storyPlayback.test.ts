import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import type { PageTakeover, PageOverlay } from '../../../../../../src/engine/core/modes/pageTakeover';
import type { InputCapture } from '../../../../../../src/engine/core/modes/pageTakeover';
import {
  StoryPlayback,
  storyBeats,
} from '../../../../../../src/engine/plugins/modes/storytelling/simulation/storyPlayback';
import { StorySimulator } from '../../../../../../src/engine/plugins/modes/storytelling/simulation/storySimulator';
import { fixture } from '../../../../../helpers';

const page = () => readDrawio(fixture('storytelling.drawio')).document.pages[0]!;

/** Pas écrits `histoire:éléments`. */
const beats = () => storyBeats(page()).map((beat) => `${beat.story.number}:${beat.ids.join(' ')}`);

describe('simulation des histoires (sujet 534) : pas', () => {
  it('forme de départ, puis chaque flèche avec sa forme d’arrivée ; pas sans nouveauté sautés', () => {
    expect(beats()).toEqual([
      '1:client',
      '1:commander panier',
      '1:payer paiement',
      '1:expedier livraison',
      '2:admin',
      '2:controler stock',
      // « Expédier » et Livraison déjà montrés par l'histoire 1 : pas sauté.
      '2:valider',
      // Admin déjà montré : l'histoire 3 commence par sa flèche numérotée.
      '3:relire rapport',
      '3:verifier verif',
      '3:corriger',
    ]);
  });

  it('accumulation, histoire suivante / précédente, tout début, bornes', () => {
    const playback = new StoryPlayback(page());
    expect(playback.shown()).toEqual(['client']);
    expect([playback.canBack(), playback.back(), playback.previousStory()]).toEqual([false, false, false]);
    playback.next();
    playback.next();
    expect(playback.shown()).toEqual(['client', 'commander', 'panier', 'payer', 'paiement']);
    // Histoire suivante : la fin de l'histoire 1 apparaît avec Admin.
    playback.nextStory();
    expect(playback.shown().slice(-3)).toEqual(['expedier', 'livraison', 'admin']);
    expect([playback.beat.story.number, playback.beat.index, playback.storyLength]).toEqual([2, 0, 3]);
    // Éléments montrés de l'histoire 2, croisement compris.
    expect(playback.shownInStory().sort()).toEqual(['admin', 'expedier', 'livraison', 'paiement']);
    playback.next();
    expect(playback.previousStory()).toBe(true);
    expect([playback.beat.story.number, playback.beat.index]).toEqual([2, 0]);
    expect(playback.previousStory()).toBe(true);
    expect([playback.beat.story.number, playback.beat.index]).toEqual([1, 0]);
    playback.nextStory();
    playback.nextStory();
    expect(playback.canNextStory()).toBe(false);
    expect(playback.nextStory()).toBe(false);
    playback.next();
    playback.next();
    expect(playback.canNext()).toBe(false);
    expect(playback.restart()).toBe(true);
    expect(playback.shown()).toEqual(['client']);
  });
});

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
