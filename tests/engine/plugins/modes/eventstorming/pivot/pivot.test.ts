import { describe, expect, it } from 'vitest';
import { PIVOT_PROPERTY as property } from '../../../../../../src/engine/plugins/modes/eventstorming/pivot/pivot';
import { setup, sticky, stormingXml } from '../helpers';

describe('mode Event storming : réglage « Pivot » d’un Domain Event (sujet 515)', () => {
  it('Oui par défaut ; Non écrit spatial.es.pivot=0, Oui le retire', () => {
    const { run, page, shape } = setup(stormingXml(sticky('a', 'event', 0, 0)));
    expect(property.value!(page(), shape('a'))).toBe('1');
    run((edit) => property.write!(edit, shape('a'), '0'));
    expect(shape('a').style['spatial.es.pivot']).toBe('0');
    expect(property.value!(page(), shape('a'))).toBe('0');
    run((edit) => property.write!(edit, shape('a'), '1'));
    expect(shape('a').style['spatial.es.pivot']).toBeUndefined();
  });

  it('montré pour un Domain Event seulement', () => {
    const { page, shape } = setup(stormingXml(sticky('a', 'event', 0, 0) + sticky('b', 'command', 200, 0)));
    expect(property.hidden!(page(), shape('a'))).toBe(false);
    expect(property.hidden!(page(), shape('b'))).toBe(true);
  });
});
