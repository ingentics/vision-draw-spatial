import { describe, expect, it } from 'vitest';
import { definition as states } from '../../../../../../src/engine/plugins/modes/states';
import {
  COMPOSITE,
  COMPOSITE_STYLES,
  compositeContent,
  compositeOf,
} from '../../../../../../src/engine/plugins/modes/states/composites/compositeLayout';
import { setup, statesXml, vertex } from '../helpers';

describe('mode Machine à états : ensemble d’états (sujet 435)', () => {
  it('contenu : formes du mode dont le coin haut-gauche est dedans, points d’entrée et de sortie compris, à toute profondeur', () => {
    const { page, shape } = setup();
    expect(compositeContent(page(), shape('state3')).sort()).toEqual([
      'final3',
      'init2',
      'process',
      'processing',
      's4',
    ]);
    expect(compositeOf(page(), shape('process'))?.id).toBe('processing');
    expect(compositeOf(page(), shape('state1'))).toBeUndefined();
    // Le post-it n'est jamais contenu.
    expect(compositeOf(page(), shape('note'))).toBeUndefined();
    expect(states.gestures!.carries!(page(), shape('processing')).sort()).toEqual(['final3', 'process']);
  });

  it('une forme posée qui dépasse agrandit son ensemble, marge comprise ; un ensemble ajouté prend le style de son rang', () => {
    const { run, shape } = setup(
      statesXml(
        vertex('c', 'composite', 0, 0, 300, 200, 'C') +
          vertex('d', 'composite', 400, 0, 100, 100, 'D') +
          vertex('a', 'state', 250, 150, 140, 60, 'A'),
      ),
    );
    run((edit) => states.gestures!.placed!(edit, ['a', 'd']));
    expect(shape('c').bounds).toEqual({ x: 0, y: 0, width: 390 + COMPOSITE.margin, height: 210 + COMPOSITE.margin });
    // « d » est le second ensemble du premier niveau.
    expect(shape('d').style.fillColor).toBe(COMPOSITE_STYLES[1]!.fillColor);
  });

  it('« f » ajuste l’ensemble à son contenu', () => {
    const { run, page, shape } = setup(
      statesXml(vertex('c', 'composite', 0, 0, 600, 400, 'C') + vertex('a', 'state', 100, 100, 140, 60, 'A')),
    );
    const key = states.keys!.f!;
    expect(key.applies(page(), shape('a'))).toBe(true);
    run((edit) => void key.run(edit, shape('a'), undefined));
    expect(shape('c').bounds).toEqual({ x: 60, y: 60, width: 220, height: 140 });
  });

  it('un ensemble ne passe pas sur ses frères', () => {
    const { page, shape } = setup();
    expect(states.gestures!.obstacles!(page(), shape('state3'), { obstacleGap: 20 })).toMatchObject({
      rects: [],
      gap: 20,
    });
    const nested = setup(
      statesXml(vertex('c', 'composite', 0, 0, 300, 200, 'C') + vertex('d', 'composite', 400, 0, 100, 100, 'D')),
    );
    expect(nested.page().shapes.length).toBe(2);
    expect(
      states.gestures!.obstacles!(nested.page(), nested.shape('c'), { obstacleGap: 20 })!.rects.map((r) => r.id),
    ).toEqual(['d']);
  });

  it('deux ensembles au même coin : le plus grand contient l’autre, à taille égale celui de derrière', () => {
    const { page, shape } = setup(
      statesXml(
        vertex('small', 'composite', 0, 0, 100, 100, 'S') +
          vertex('big', 'composite', 0, 0, 300, 200, 'B') +
          vertex('back', 'composite', 500, 0, 200, 100, 'K') +
          vertex('front', 'composite', 500, 0, 200, 100, 'F'),
      ),
    );
    expect(compositeOf(page(), shape('small'))?.id).toBe('big');
    expect(compositeOf(page(), shape('big'))).toBeUndefined();
    expect(compositeOf(page(), shape('front'))?.id).toBe('back');
    expect(compositeOf(page(), shape('back'))).toBeUndefined();
  });

  it('forme sortie par la gauche en chevauchant son ensemble : elle y reste, il s’agrandit vers la gauche', () => {
    const { run, page, shape } = setup(
      statesXml(vertex('c', 'composite', 100, 100, 300, 200, 'C') + vertex('a', 'state', 150, 150, 140, 60, 'A')),
    );
    const before = page();
    run((edit) => edit.setShapeBounds('a', { x: 60, y: 150, width: 140, height: 60 }));
    run((edit) => states.gestures!.placed!(edit, ['a'], before));
    expect(shape('c').bounds.x).toBe(60 - COMPOSITE.margin);
    // Sans la page d'avant, son coin n'est plus dedans : l'ensemble ne bouge pas.
    const fresh = setup(
      statesXml(vertex('c', 'composite', 100, 100, 300, 200, 'C') + vertex('a', 'state', 60, 150, 140, 60, 'A')),
    );
    fresh.run((edit) => states.gestures!.placed!(edit, ['a']));
    expect(fresh.shape('c').bounds.x).toBe(100);
  });

  it('ordre de dessin : un ensemble devant celui qui le contient, tous derrière les états', () => {
    const { run, shape } = setup(
      statesXml(
        vertex('a', 'state', 150, 150, 140, 60, 'A') +
          vertex('inner', 'composite', 120, 120, 200, 120, 'I') +
          vertex('outer', 'composite', 100, 100, 300, 200, 'O'),
      ),
    );
    run((edit) => states.gestures!.placed!(edit, ['a']));
    expect(shape('outer').z).toBeLessThan(shape('inner').z);
    expect(shape('inner').z).toBeLessThan(shape('a').z);
  });
});
