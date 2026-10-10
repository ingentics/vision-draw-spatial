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

  // Colonne de haut en bas V, W, U, L (sujet 502) ; ordre de départ : L, V, W, U.
  const column = () =>
    setup(
      stormingXml(
        sticky('L', 'event', 0, 480) +
          sticky('V', 'policy', 0, 0) +
          sticky('W', 'command', 0, 160) +
          sticky('U', 'actor', 0, 320),
      ),
    );

  it.each(['U', 'L', 'V', 'W'])('colonne de quatre, %s posé : chaque post-it derrière celui du dessous', (placed) => {
    const { run, page } = column();
    run((edit) => storming.gestures!.placed!(edit, [placed]));
    expect(order(page())).toEqual(['V', 'W', 'U', 'L']);
  });

  it('colonne de trois posée au milieu, deux colonnes voisines : seule la colonne touchée change', () => {
    const { run, page } = setup(
      stormingXml(
        sticky('c', 'event', 0, 320) +
          sticky('b', 'command', 0, 160) +
          sticky('a', 'policy', 0, 0) +
          sticky('y', 'event', 400, 160) +
          sticky('x', 'policy', 400, 0),
      ),
    );
    run((edit) => storming.gestures!.placed!(edit, ['b']));
    expect(order(page())).toEqual(['a', 'b', 'c', 'y', 'x']);
  });

  it('post-it à cheval sur deux post-it du dessous : derrière les deux', () => {
    const { run, page } = setup(
      stormingXml(sticky('r', 'event', 160, 160) + sticky('l', 'command', 0, 160) + sticky('top', 'constraint', 80, 0)),
    );
    run((edit) => storming.gestures!.placed!(edit, ['top']));
    expect(order(page())).toEqual(['top', 'r', 'l']);
  });
});
