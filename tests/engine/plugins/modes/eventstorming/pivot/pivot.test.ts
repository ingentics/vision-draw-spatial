import { describe, expect, it } from 'vitest';
import {
  pivotMarkOf,
  PIVOT_PROPERTY as property,
} from '../../../../../../src/engine/plugins/modes/eventstorming/pivot/pivot';
import { setup, sticky, stormingXml } from '../helpers';

describe('mode Event storming : réglage « Pivot » d’un Domain Event (sujets 515, 516)', () => {
  it('non défini par défaut ; Oui, Non, Je ne sais pas écrits, Non défini retire l’attribut', () => {
    const { run, page, shape } = setup(stormingXml(sticky('a', 'event', 0, 0)));
    expect(property.value!(page(), shape('a'))).toBe('');
    for (const answer of ['1', '0', 'unknown']) {
      run((edit) => property.write!(edit, shape('a'), answer));
      expect(shape('a').style['spatial.es.pivot']).toBe(answer);
      expect(property.value!(page(), shape('a'))).toBe(answer);
    }
    run((edit) => property.write!(edit, shape('a'), undefined));
    expect(shape('a').style['spatial.es.pivot']).toBeUndefined();
  });

  it('valeur inconnue : montrée non définie', () => {
    const { page, shape } = setup(stormingXml(sticky('a', 'event', 0, 0, '', 160, 160, 'spatial.es.pivot=peut-être;')));
    expect(property.value!(page(), shape('a'))).toBe('');
  });

  it('montré pour un Domain Event seulement', () => {
    const { page, shape } = setup(stormingXml(sticky('a', 'event', 0, 0) + sticky('b', 'command', 200, 0)));
    expect(property.hidden!(page(), shape('a'))).toBe(false);
    expect(property.hidden!(page(), shape('b'))).toBe(true);
  });

  it('icône : cube pour Oui, alerte pour Je ne sais pas, sur un Domain Event seulement', () => {
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
      'warning',
      undefined,
      undefined,
      undefined,
    ]);
  });
});
