import { describe, expect, it } from 'vitest';
import { shapeOf } from '../../../../../../src/engine/core/model/pageIndex';
import {
  entryName,
  simulationTrace,
  stepLook,
} from '../../../../../../src/engine/plugins/modes/states/simulation/simulationView';
import { StateSimulation } from '../../../../../../src/engine/plugins/modes/states/simulation/stateSimulation';
import { edge, setup, statesXml, vertex } from '../helpers';

/** Sur la fixture : entrée, State1, puis State3 (traversé jusqu'à son état intérieur), et la boucle « New Data ». */
function walked(): StateSimulation {
  const sim = new StateSimulation(setup().page(), 'init1');
  sim.choose(1);
  sim.choose(2);
  sim.cross('t6');
  return sim;
}

describe('mode Machine à états : ce que l’appli montre d’une simulation (sujets 462, 463, 465)', () => {
  it('trace : une ligne par pas et par transition franchie, compteur, pas courant, lignes qui mènent à un pas', () => {
    const lines = simulationTrace(walked());
    expect(lines.map(({ kind, text }) => [kind, text.startsWith('→ Accumulate') ? '→ s4' : text])).toEqual([
      ['step', '● Entrée'],
      ['transition', '—→'],
      ['step', '→ State1'],
      ['transition', '—[Démarrer]→'],
      ['step', '→ State3'],
      ['step', '● Entrée'],
      ['transition', '—→'],
      ['step', '→ s4'],
      ['transition', '—[New Data]→'],
      ['step', '→ s4'],
    ]);
    // Pas où mène un clic : les pas traversés (State3, son entrée) et le pas courant ne mènent nulle part ; la
    // transition vers State3 mène au pas où l'on choisit ensuite (5, le premier passage par s4).
    expect(lines.map((line) => line.target)).toEqual([1, 2, 2, 5, undefined, undefined, 5, 5, undefined, undefined]);
    const last = lines.at(-1)!;
    expect(last.kind === 'step' && [last.count, last.current]).toEqual([2, true]);
    expect(lines.filter((line) => line.kind === 'step' && line.current)).toHaveLength(1);
  });

  it('pas courant vu par la couche : états visités (sans les ensembles traversés), ensembles parents, numéros', () => {
    const look = stepLook(walked());
    expect(look.current).toBe('s4');
    expect(look.visits).toEqual([
      { id: 'state1', count: 1 },
      { id: 's4', count: 2 },
    ]);
    expect(look.frames).toEqual(['state3']);
    expect(look.proposed).toEqual([
      { id: 't6', badge: '1' },
      { id: 't7', badge: '2' },
      { id: 't9', badge: '3' },
      { id: 't10', badge: '4' },
      { id: 't11', badge: '5' },
    ]);
    expect(look.taken).toEqual(['t1', 't4', 't5', 't6']);
  });

  it('un ensemble sans entrée intérieure où l’on s’arrête est teinté et compté comme un état', () => {
    const cells =
      vertex('i', 'initial', 0, 0, 20, 20) +
      vertex('box', 'composite', 100, 0, 300, 200, 'Box') +
      vertex('end', 'final', 500, 50, 24, 24) +
      edge('a', 'i', 'box') +
      edge('b', 'box', 'end');
    const sim = new StateSimulation(setup(statesXml(cells)).page(), 'i');
    sim.choose(1);
    expect(stepLook(sim).visits).toEqual([{ id: 'box', count: 1 }]);
  });

  it('point d’entrée à choisir : nommé par l’état où mène sa première transition valide', () => {
    const page = setup().page();
    expect(entryName(page, shapeOf(page, 'init1')!)).toBe('Entrée vers « State1 »');
    const cells =
      vertex('i', 'initial', 0, 0, 20, 20) +
      vertex('j', 'initial', 0, 100, 20, 20) +
      vertex('s', 'state', 100, 0, 100, 60, 'S') +
      // Dessinée en premier, mais refusée (vers un point d'entrée) : pas proposée, pas nommée.
      edge('bad', 'i', 'j') +
      edge('ok', 'i', 's');
    const other = setup(statesXml(cells)).page();
    expect(entryName(other, shapeOf(other, 'i')!)).toBe('Entrée vers « S »');
    expect(entryName(other, shapeOf(other, 'j')!)).toBe('Entrée j');
  });
});
