import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import {
  StoryPlayback,
  storyBeats,
} from '../../../../../../src/engine/plugins/modes/storytelling/simulation/storyPlayback';
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
      // Paiement déjà montré par l'histoire 1 : seule la flèche.
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
    // Éléments montrés de l'histoire 2, Paiement (montré par l'histoire 1) compris.
    expect(playback.shownInStory().sort()).toEqual(['admin', 'paiement']);
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
