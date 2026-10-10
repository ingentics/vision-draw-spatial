import { describe, expect, it } from 'vitest';
import { definition as storming } from '../../../../../src/engine/plugins/modes/eventstorming';
import { setup, sticky, stormingXml } from './helpers';

describe('mode Event storming : post-it collé au-dessus d’un autre, derrière lui (sujet 484)', () => {
  const order = (page: { shapes: ReadonlyArray<{ id: string; z: number }> }) =>
    [...page.shapes].sort((a, b) => a.z - b.z).map((s) => s.id);

  it('posé au-dessus : il passe juste derrière celui du dessous', () => {
    const { run, page } = setup(
      stormingXml(sticky('low', 'event', 0, 160) + sticky('x', 'actor', 400, 0) + sticky('up', 'policy', 0, 0)),
    );
    run((edit) => storming.gestures!.placed!(edit, ['up']));
    expect(order(page())).toEqual(['up', 'low', 'x']);
  });

  it('posé dessous : celui collé au-dessus passe derrière lui', () => {
    const { run, page } = setup(stormingXml(sticky('low', 'event', 0, 160) + sticky('up', 'policy', 0, 0)));
    run((edit) => storming.gestures!.placed!(edit, ['low']));
    expect(order(page())).toEqual(['up', 'low']);
  });

  it('déjà derrière, côte à côte, ou sans post-it posé dans le contact : l’ordre ne change pas', () => {
    const { run, page } = setup(
      stormingXml(
        sticky('up', 'policy', 0, 0) +
          sticky('low', 'event', 0, 160) +
          sticky('b', 'command', 160, 0) +
          sticky('a', 'actor', 320, 0),
      ),
    );
    run((edit) => storming.gestures!.placed!(edit, ['up', 'b']));
    expect(order(page())).toEqual(['up', 'low', 'b', 'a']);
    run((edit) => storming.gestures!.placed!(edit, ['a']));
    expect(order(page())).toEqual(['up', 'low', 'b', 'a']);
  });
});
