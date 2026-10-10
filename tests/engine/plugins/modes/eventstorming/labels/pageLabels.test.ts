import { describe, expect, it } from 'vitest';
import { definition as storming } from '../../../../../../src/engine/plugins/modes/eventstorming';
import { setup, sticky, stormingXml, textCell } from '../helpers';

describe('mode Event storming : réglage « Labels » de la page (sujet 475)', () => {
  const property = storming.page!.properties![0]!;
  const text = textCell(0, 300);

  it('coché par défaut ; décoché : page et post-it marqués, en une opération ; recoché : retiré', () => {
    const { run, page, shape } = setup(stormingXml(sticky('a', 'event', 0, 0) + sticky('b', 'actor', 200, 0) + text));
    expect(property.value!(page(), page())).toBe('1');
    expect(run((edit) => property.write!(edit, edit.page, undefined))).toBe(true);
    expect(page().attributes['spatial.es.labels']).toBe('0');
    expect(property.value!(page(), page())).toBeUndefined();
    expect(shape('a').style['spatial.es.labels']).toBe('0');
    expect(shape('b').style['spatial.es.labels']).toBe('0');
    expect(shape('t').style['spatial.es.labels']).toBeUndefined();
    run((edit) => property.write!(edit, edit.page, '1'));
    expect(page().attributes['spatial.es.labels']).toBeUndefined();
    expect(shape('a').style['spatial.es.labels']).toBeUndefined();
  });

  it('post-it posé ou collé : il prend le réglage de la page', () => {
    const { run, shape } = setup(
      stormingXml(
        sticky('a', 'event', 0, 0) + sticky('b', 'actor', 200, 0, '', 160, 160, 'spatial.es.labels=0;'),
        ' spatial.es.labels="0"',
      ),
    );
    run((edit) => storming.gestures!.placed!(edit, ['a']));
    expect(shape('a').style['spatial.es.labels']).toBe('0');
    const shown = setup(stormingXml(sticky('b', 'actor', 200, 0, '', 160, 160, 'spatial.es.labels=0;')));
    shown.run((edit) => storming.gestures!.placed!(edit, ['b']));
    expect(shown.shape('b').style['spatial.es.labels']).toBeUndefined();
  });

  it('à l’ouverture, chaque post-it reprend le réglage de sa page', () => {
    const { run, shape } = setup(stormingXml(sticky('a', 'event', 0, 0), ' spatial.es.labels="0"'));
    run((edit) => storming.lifecycle!.opened!(edit));
    expect(shape('a').style['spatial.es.labels']).toBe('0');
  });
});
