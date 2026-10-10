import { describe, expect, it } from 'vitest';
import {
  StateSimulation,
  startSimulation,
} from '../../../../../../src/engine/plugins/modes/states/simulation/stateSimulation';
import type { SimulationStart } from '../../../../../../src/engine/plugins/modes/states/simulation/stateSimulation';
import { edge, setup, statesXml, vertex } from '../helpers';

/** Simulation d'un départ qui doit en donner une. */
function simulation(start: SimulationStart): StateSimulation {
  if (!('simulation' in start)) throw new Error('pas de simulation');
  return start.simulation;
}

/** Élément de chaque pas. */
const path = (sim: StateSimulation) => sim.steps.map((step) => step.elementId);
/** Transitions proposées. */
const proposed = (sim: StateSimulation) => sim.proposals().map(({ edge }) => edge.id);

describe('mode Machine à états : simulation pas à pas (sujet 460)', () => {
  const page = () => setup().page();

  it('part sans sélection du point d’entrée de premier niveau, qui propose sa transition', () => {
    const sim = simulation(startSimulation(page(), []));
    expect(path(sim)).toEqual(['init1']);
    expect(proposed(sim)).toEqual(['t1']);
    expect(sim.end()).toBeUndefined();
  });

  it('plusieurs éléments ou un autre élément sélectionné : comme rien de sélectionné', () => {
    expect(path(simulation(startSimulation(page(), ['state1', 'state2'])))).toEqual(['init1']);
    expect(path(simulation(startSimulation(page(), ['note'])))).toEqual(['init1']);
    expect(path(simulation(startSimulation(page(), ['final1'])))).toEqual(['init1']);
  });

  it('part d’un état, d’un point d’entrée ou de l’état de départ d’une transition sélectionnés', () => {
    expect(path(simulation(startSimulation(page(), ['state2'])))).toEqual(['state2']);
    expect(path(simulation(startSimulation(page(), ['init2'])))).toEqual(['init2']);
    expect(path(simulation(startSimulation(page(), ['t7'])))).toEqual(['s4']);
  });

  it('part d’un ensemble par son entrée intérieure, jusqu’à la cible de sa transition unique', () => {
    const sim = simulation(startSimulation(page(), ['state3']));
    expect(path(sim)).toEqual(['state3', 'init2', 's4']);
    expect(sim.steps.map((step) => step.passed ?? false)).toEqual([true, true, false]);
    expect(sim.current.id).toBe('s4');
  });

  it('plusieurs points d’entrée de premier niveau : la liste est rendue ; aucun : erreur', () => {
    const two = setup(statesXml(vertex('a', 'initial', 0, 0, 20, 20) + vertex('b', 'initial', 0, 50, 20, 20))).page();
    const start = startSimulation(two, []);
    expect('entries' in start && start.entries.map((s) => s.id)).toEqual(['a', 'b']);
    const none = setup(statesXml(vertex('s', 'state', 0, 0, 100, 60, 'S'))).page();
    expect(startSimulation(none, [])).toEqual({ error: 'Aucun point d’entrée sur la page' });
  });

  it('propose les transitions dans l’ordre de dessin et franchit celle choisie', () => {
    const sim = simulation(startSimulation(page(), []));
    expect(sim.choose(1)).toBe(true);
    expect(proposed(sim)).toEqual(['t2', 't4']);
    expect(sim.choose(3)).toBe(false);
    expect(sim.choose(2)).toBe(true);
    expect(path(sim)).toEqual(['init1', 'state1', 'state3', 'init2', 's4']);
    expect(sim.steps[2]).toEqual({ elementId: 'state3', via: 't4', passed: true });
    expect(sim.cross('t3')).toBe(false);
  });

  it('depuis un état intérieur, propose aussi les transitions des ensembles parents, du plus proche au plus lointain', () => {
    const sim = new StateSimulation(page(), 'process');
    expect(sim.enclosing().map((s) => s.id)).toEqual(['processing', 'state3']);
    expect(proposed(sim)).toEqual(['t8', 't9', 't10', 't11']);
  });

  it('sortie dans un ensemble : on le quitte, ses transitions (et celles de ses parents) sont proposées', () => {
    const sim = new StateSimulation(page(), 'process');
    sim.cross('t8');
    expect(sim.current.id).toBe('final3');
    expect(sim.end()).toBeUndefined();
    expect(proposed(sim)).toEqual(['t9', 't10', 't11']);
    sim.cross('t9');
    // Boucle de l'ensemble sur lui-même : on y rentre par son entrée.
    expect(path(sim).slice(-3)).toEqual(['state3', 'init2', 's4']);
  });

  it('sortie dans un ensemble sans transition sortante : bloqué ; sortie en erreur dans un ensemble : erreur', () => {
    const cells =
      vertex('box', 'composite', 0, 0, 400, 200, 'Box') +
      vertex('s', 'state', 20, 40, 100, 60, 'S') +
      vertex('out', 'final', 200, 50, 24, 24) +
      vertex('bad', 'final', 300, 50, 24, 24, '', 'spatial.sm.error=1;') +
      edge('a', 's', 'out') +
      edge('b', 's', 'bad');
    const blocked = new StateSimulation(setup(statesXml(cells)).page(), 's');
    blocked.cross('a');
    expect(blocked.proposals()).toEqual([]);
    expect(blocked.end()).toBe('blocked');
    const failed = new StateSimulation(setup(statesXml(cells)).page(), 's');
    failed.cross('b');
    expect(failed.end()).toBe('error');
  });

  it('entrée dans un ensemble sans point d’entrée intérieur : l’ensemble est l’état courant', () => {
    const cells =
      vertex('i', 'initial', 0, 0, 20, 20) +
      vertex('box', 'composite', 100, 0, 300, 200, 'Box') +
      vertex('s', 'state', 120, 40, 100, 60, 'S') +
      vertex('end', 'final', 500, 50, 24, 24) +
      edge('a', 'i', 'box') +
      edge('b', 'box', 'end');
    const sim = simulation(startSimulation(setup(statesXml(cells)).page(), []));
    sim.choose(1);
    expect(path(sim)).toEqual(['i', 'box']);
    expect(proposed(sim)).toEqual(['b']);
  });

  it('entrée intérieure à plusieurs transitions : on s’y arrête pour choisir', () => {
    const cells =
      vertex('box', 'composite', 0, 0, 400, 200, 'Box') +
      vertex('i', 'initial', 20, 30, 20, 20) +
      vertex('s', 'state', 80, 40, 100, 60, 'S') +
      vertex('t', 'state', 220, 40, 100, 60, 'T') +
      edge('a', 'i', 's') +
      edge('b', 'i', 't');
    const sim = simulation(startSimulation(setup(statesXml(cells)).page(), ['box']));
    expect(path(sim)).toEqual(['box', 'i']);
    expect(proposed(sim)).toEqual(['a', 'b']);
  });

  it('fin attendue sur une sortie de premier niveau, en erreur sur une sortie en erreur, bloquée sur un état sans issue', () => {
    const expected = new StateSimulation(page(), 'state2');
    expected.cross('t3');
    expect(expected.end()).toBe('expected');
    expect(expected.proposals()).toEqual([]);
    const failed = new StateSimulation(page(), 's4');
    failed.cross('t11');
    expect(failed.end()).toBe('error');
    const blocked = new StateSimulation(page(), 'state2');
    blocked.cross('t12');
    expect(blocked.current.id).toBe('waiting');
    expect(blocked.end()).toBe('blocked');
  });

  it('revient d’un pas (en sautant les pas sans choix) ou au pas n ; compte passages et transitions empruntées', () => {
    const sim = simulation(startSimulation(page(), []));
    sim.choose(1);
    sim.choose(2);
    sim.cross('t6');
    sim.cross('t6');
    expect(sim.visits().get('s4')).toBe(3);
    expect(sim.visits().get('state3')).toBe(1);
    expect([...sim.taken()]).toEqual(['t1', 't4', 't5', 't6']);
    expect(sim.back()).toBe(true);
    expect(sim.visits().get('s4')).toBe(2);
    sim.back();
    // Entrée de l'ensemble traversée sans choix : retour à State1.
    expect(sim.back()).toBe(true);
    expect(sim.current.id).toBe('state1');
    sim.choose(1);
    expect(sim.goTo(2)).toBe(true);
    expect(path(sim)).toEqual(['init1', 'state1']);
    expect(sim.goTo(2)).toBe(false);
    sim.back();
    expect(sim.back()).toBe(false);
    expect(path(sim)).toEqual(['init1']);
  });

  it('recommence au premier pas où l’on choisit', () => {
    const sim = simulation(startSimulation(page(), ['state3']));
    sim.cross('t6');
    expect(sim.restart()).toBe(true);
    expect(path(sim)).toEqual(['state3', 'init2', 's4']);
    expect(sim.restart()).toBe(false);
  });
});
