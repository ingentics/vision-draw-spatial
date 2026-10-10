import { describe, expect, it } from 'vitest';
import { statesPlantUml } from '../../../../../../src/engine/plugins/modes/states/export/plantuml';
import { edge, setup, statesXml, vertex } from '../helpers';

/** Texte exporté d'une page faite de ces cellules. */
const exported = (cells: string) => statesPlantUml(setup(statesXml(cells)).page());

/** Lignes entre `@startuml` et `@enduml`. */
const body = (text: string) => text.split('\n').slice(1, -2);

describe('mode Machine à états : export PlantUML (sujet 436)', () => {
  it('écrit la fixture : ensembles imbriqués, alias, contenu, [*] par niveau, transitions à leur niveau, sortie en erreur en rouge', () => {
    expect(statesPlantUml(setup().page())).toBe(
      [
        '@startuml',
        'state State3 {',
        '  state Traitement {',
        '    state ProcessData',
        '    ProcessData --> [*]',
        '  }',
        '  state "Accumulate Enough Data\\nLong State Name" as S5',
        '  S5 : Just a test',
        '  [*] --> S5',
        '  S5 --> S5 : New Data',
        '  S5 --> ProcessData : Enough Data',
        '}',
        'State2 : entry / ouvrir',
        'State2 : exit / fermer',
        '[*] --> State1',
        'State1 --> State2 : Succeeded',
        'State2 --> [*]',
        'State1 --> State3 : Démarrer',
        'State3 --> State3 : Failed',
        'State3 --> [*] : Succeeded',
        'State3 -[#d32f2f]-> [*] : Aborted',
        'State2 --> Attente : Pause',
        '@enduml',
        '',
      ].join('\n'),
    );
  });

  it('alias dans l’ordre de dessin ; un titre en double, réservé ou qui n’est pas un identifiant est déclaré', () => {
    const text = exported(
      vertex('a', 'state', 0, 0, 140, 60, 'Idle') +
        vertex('b', 'state', 0, 100, 140, 60, 'Idle') +
        vertex('c', 'state', 0, 200, 140, 60, 'S1') +
        vertex('d', 'state', 0, 300, 140, 60, 'Dit &quot;oui&quot;') +
        vertex('e', 'state', 0, 400, 140, 60, '') +
        edge('t', 'a', 'b'),
    );
    expect(body(text)).toEqual([
      'state "Idle" as S1',
      'state "Idle" as S2',
      'state "S1" as S3',
      `state "Dit 'oui'" as S4`,
      'state S5',
      'S1 --> S2',
    ]);
  });

  it('un état au nom simple sans transition ni contenu est déclaré ; dans un ensemble, toujours', () => {
    const text = exported(
      vertex('c', 'composite', 0, 0, 400, 300, 'Box') +
        vertex('a', 'state', 40, 40, 140, 60, 'Inside') +
        vertex('b', 'state', 500, 0, 140, 60, 'Alone') +
        vertex('o', 'state', 500, 200, 140, 60, 'Out') +
        edge('t', 'a', 'o'),
    );
    expect(body(text)).toEqual(['state Box {', '  state Inside', '}', 'state Alone', 'Inside --> Out']);
  });

  it('points de sortie d’un même niveau : un seul [*] ; transition vers une sortie d’un autre niveau écrite là-bas', () => {
    const text = exported(
      vertex('c', 'composite', 0, 0, 400, 300, 'Box') +
        vertex('a', 'state', 40, 40, 140, 60, 'A') +
        vertex('f', 'final', 300, 200, 24, 24) +
        vertex('g', 'final', 600, 0, 24, 24) +
        vertex('h', 'final', 600, 100, 24, 24) +
        vertex('i', 'initial', 600, 200, 20, 20) +
        edge('t1', 'a', 'f', 'done') +
        edge('t2', 'a', 'g') +
        edge('t3', 'c', 'h', 'quit') +
        edge('t4', 'i', 'c'),
    );
    expect(body(text)).toEqual([
      'state Box {',
      '  state A',
      '  A --> [*] : done',
      '}',
      '[*] --> Box',
      'A --> [*]',
      'Box --> [*] : quit',
    ]);
  });

  it('point d’entrée d’un ensemble vers un état extérieur : l’état est déclaré avant, à son niveau (sujet 446)', () => {
    const text = exported(
      vertex('c', 'composite', 0, 0, 400, 300, 'Box') +
        vertex('a', 'state', 40, 40, 140, 60, 'A') +
        vertex('i', 'initial', 300, 200, 20, 20) +
        vertex('d', 'composite', 500, 0, 400, 300, 'Other') +
        vertex('x', 'state', 540, 40, 140, 60, 'X') +
        vertex('y', 'state', 1000, 0, 140, 60, 'Y') +
        edge('t1', 'i', 'x') +
        edge('t2', 'x', 'y'),
    );
    expect(body(text)).toEqual([
      'state Other {',
      '  state X',
      '}',
      'state Box {',
      '  state A',
      '  [*] --> X',
      '}',
      'X --> Y',
    ]);
  });

  it('un point sans transition n’est pas écrit ; une transition à bout libre ou refusée non plus', () => {
    const text = exported(
      vertex('a', 'state', 0, 0, 140, 60, 'A') +
        vertex('i', 'initial', 0, 100, 20, 20) +
        vertex('f', 'final', 300, 100, 24, 24) +
        edge('free', 'a', '') +
        edge('back', 'f', 'a'),
    );
    expect(body(text)).toEqual(['state A']);
  });

  it('nom de transition sur une ligne, retours à la ligne en \\n', () => {
    const text = exported(
      vertex('a', 'state', 0, 0, 140, 60, 'A') +
        vertex('b', 'state', 300, 0, 140, 60, 'B') +
        edge('t', 'a', 'b', 'un&lt;br&gt;deux'),
    );
    expect(body(text)).toEqual(['A --> B : un\\ndeux']);
  });
});
