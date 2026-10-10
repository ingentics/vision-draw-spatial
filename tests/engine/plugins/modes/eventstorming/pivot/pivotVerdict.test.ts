import { describe, expect, it } from 'vitest';
import { verdictOf } from '../../../../../../src/engine/plugins/modes/eventstorming/pivot/pivotVerdict';
import type { Answers } from '../../../../../../src/engine/plugins/modes/eventstorming/pivot/pivotVerdict';

/** Titre, pivot écrit et présence d'un hotspot. */
const summary = (answers: Answers, stored?: string) => {
  const { note, pivot } = verdictOf(answers, 'Commande annulée', stored);
  return [note.title, pivot, !!note.aside];
};

describe('mode Event storming : verdict du questionnaire pivot (sujet 517)', () => {
  it('table des verdicts', () => {
    expect(summary({ who: 'unknown' })).toEqual(['Incertain', 'unknown', true]);
    expect(summary({ who: 'other', needs: 'no' })).toEqual(['Pivot', '1', false]);
    expect(summary({ who: 'other', needs: 'yes' })).toEqual(['Pivot à confirmer', 'unknown', true]);
    expect(summary({ who: 'other', needs: 'unknown' })).toEqual(['Incertain', 'unknown', true]);
    expect(summary({ who: 'other' })).toEqual(['Incertain', 'unknown', true]);
    for (const who of ['same', 'none'] as const) {
      expect(summary({ who, absent: 'no' })).toEqual(['Pas pivot', '0', false]);
      expect(summary({ who, absent: 'yes' })).toEqual(['Pivot à confirmer', '1', true]);
      expect(summary({ who, absent: 'unknown' })).toEqual(['Incertain', 'keep', true]);
      expect(summary({ who })).toEqual(['Incertain', 'keep', true]);
    }
  });

  it('question 1 sans réponse : non défini, ou le pivot déjà écrit gardé', () => {
    expect(summary({})).toEqual(['Non défini', undefined, false]);
    expect(summary({}, '1')).toEqual(['Pivot', 'keep', false]);
    expect(summary({}, '0')).toEqual(['Pas pivot', 'keep', false]);
    expect(summary({}, 'unknown')).toEqual(['Incertain', 'keep', false]);
  });

  it('l’événement est cité dans le hotspot, « cet événement » sans texte', () => {
    expect(verdictOf({ who: 'none', absent: 'unknown' }, 'Commande\nannulée', undefined).note.aside?.text).toBe(
      'Un autre métier a-t-il besoin de savoir que «\u00a0Commande annulée\u00a0» ?',
    );
    expect(verdictOf({ who: 'none', absent: 'unknown' }, ' ', undefined).note.aside?.text).toBe(
      'Un autre métier a-t-il besoin de savoir que cet événement ?',
    );
  });
});
