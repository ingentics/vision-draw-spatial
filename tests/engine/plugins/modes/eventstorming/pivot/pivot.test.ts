import { describe, expect, it } from 'vitest';
import type { ModeProperty } from '../../../../../../src/engine/core/plugins';
import { PIVOT_PROPERTIES, pivotMarkOf } from '../../../../../../src/engine/plugins/modes/eventstorming/pivot/pivot';
import { setup, sticky, stormingXml } from '../helpers';

const property = (key: string): ModeProperty => PIVOT_PROPERTIES.find((p) => p.key === key)!;
const [who, needs, absent, verdict] = ['pivotWho', 'pivotNeeds', 'pivotAbsent', 'pivotVerdict'].map(property);

describe('mode Event storming : questionnaire « Pivot » d’un Domain Event (sujets 515, 516, 517)', () => {
  it('neuf : « On ne sait pas » montré sans rien écrire, pas de question 2, verdict non défini', () => {
    const { page, shape } = setup(stormingXml(sticky('a', 'event', 0, 0)));
    expect(who!.value!(page(), shape('a'))).toBe('unknown');
    expect(needs!.hidden!(page(), shape('a'))).toBe(true);
    expect(absent!.hidden!(page(), shape('a'))).toBe(true);
    expect(verdict!.type === 'note' && verdict!.note(page(), shape('a'))?.title).toBe('Non défini');
    expect(shape('a').style['spatial.es.pivot']).toBeUndefined();
  });

  it('chaque réponse est écrite et le pivot en est déduit', () => {
    const { run, page, shape } = setup(stormingXml(sticky('a', 'event', 0, 0, 'Commande annulée')));
    run((edit) => who!.write!(edit, shape('a'), 'unknown'));
    expect(shape('a').style['spatial.es.pivotWho']).toBe('unknown');
    expect(shape('a').style['spatial.es.pivot']).toBe('unknown');
    run((edit) => who!.write!(edit, shape('a'), 'other'));
    expect(needs!.hidden!(page(), shape('a'))).toBe(false);
    expect(absent!.hidden!(page(), shape('a'))).toBe(true);
    run((edit) => needs!.write!(edit, shape('a'), 'no'));
    expect(shape('a').style['spatial.es.pivotNeeds']).toBe('no');
    expect(shape('a').style['spatial.es.pivot']).toBe('1');
    run((edit) => who!.write!(edit, shape('a'), 'none'));
    expect(absent!.hidden!(page(), shape('a'))).toBe(false);
    run((edit) => absent!.write!(edit, shape('a'), 'yes'));
    expect(shape('a').style['spatial.es.pivot']).toBe('1');
    expect(verdict!.type === 'note' && verdict!.note(page(), shape('a'))?.aside?.text).toBe(
      'Quel métier absent de l’atelier réagit à «\u00a0Commande annulée\u00a0» ? À inviter ou à interroger.',
    );
    run((edit) => absent!.write!(edit, shape('a'), 'no'));
    expect(shape('a').style['spatial.es.pivot']).toBe('0');
    // La réponse de l'autre branche est gardée.
    run((edit) => who!.write!(edit, shape('a'), 'other'));
    expect(shape('a').style['spatial.es.pivot']).toBe('1');
    expect(shape('a').style['spatial.es.pivotAbsent']).toBe('no');
  });

  it('réponse inconnue (fichier modifié à la main) : montrée « On ne sait pas »', () => {
    const { page, shape } = setup(
      stormingXml(sticky('a', 'event', 0, 0, '', 160, 160, 'spatial.es.pivotWho=peut-être;')),
    );
    expect(who!.value!(page(), shape('a'))).toBe('unknown');
  });

  it('montré pour un Domain Event seulement', () => {
    const { page, shape } = setup(stormingXml(sticky('a', 'event', 0, 0) + sticky('b', 'command', 200, 0)));
    expect(who!.hidden!(page(), shape('a'))).toBe(false);
    expect(verdict!.hidden!(page(), shape('a'))).toBe(false);
    expect(PIVOT_PROPERTIES.every((p) => p.hidden!(page(), shape('b')))).toBe(true);
  });

  it('icône : cube pour Oui, point d’interrogation pour Je ne sais pas, sur un Domain Event seulement', () => {
    const { shape } = setup(
      stormingXml(
        sticky('yes', 'event', 0, 0, '', 160, 160, 'spatial.es.pivot=1;') +
          sticky('unknown', 'event', 200, 0, '', 160, 160, 'spatial.es.pivot=unknown;') +
          sticky('no', 'event', 400, 0, '', 160, 160, 'spatial.es.pivot=0;') +
          sticky('unset', 'event', 600, 0) +
          sticky('command', 'command', 800, 0, '', 160, 160, 'spatial.es.pivot=1;'),
      ),
    );
    expect(['yes', 'unknown', 'no', 'unset', 'command'].map((id) => pivotMarkOf(shape(id)))).toEqual([
      'spread',
      'question',
      undefined,
      undefined,
      undefined,
    ]);
  });
});
