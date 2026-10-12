import { describe, expect, it } from 'vitest';
import { edgeOf } from '../../../../../../src/engine/core/model/pageIndex';
import { statesPlantUml } from '../../../../../../src/engine/plugins/modes/states/export/plantuml';
import { proposedRules } from '../../../../../../src/engine/plugins/modes/states/simulation/simulationView';
import { StateSimulation } from '../../../../../../src/engine/plugins/modes/states/simulation/stateSimulation';
import {
  RULES_PROPERTY,
  businessRules,
  rulesNote,
} from '../../../../../../src/engine/plugins/modes/states/transitions/businessRules';
import { edge, setup, statesXml, vertex } from '../helpers';

/** Entrée, A, B, C ; deux transitions depuis A, la première nommée. */
const cells =
  vertex('i', 'initial', 0, 0, 20, 20) +
  vertex('a', 'state', 100, 0, 100, 60, 'A') +
  vertex('b', 'state', 300, 0, 100, 60, 'B') +
  vertex('c', 'state', 300, 200, 100, 60, 'C') +
  edge('ia', 'i', 'a') +
  edge('ab', 'a', 'b', 'Valider') +
  edge('ac', 'a', 'c');

/** Page où la transition `edgeId` porte ces règles, écrites par le champ du panneau. */
function withRules(edgeId: string, text: string) {
  const { run, page } = setup(statesXml(cells));
  run((edit) => RULES_PROPERTY.write!(edit, edgeOf(edit.page, edgeId)!, text));
  return page();
}

describe('mode Machine à états : règles de gestion d’une transition (sujet 528)', () => {
  it('écrites par le panneau dans spatial.sm.rules, relues une par ligne sans les lignes vides ; vides, retirées', () => {
    const page = withRules('ab', 'Montant > 0 ; payé\n\n  Client connu  ');
    const ab = edgeOf(page, 'ab')!;
    expect(ab.style['spatial.sm.rules']).toBeDefined();
    expect(businessRules(ab)).toEqual(['Montant > 0 ; payé', 'Client connu']);
    expect(RULES_PROPERTY.value!(page, ab)).toBe('Montant > 0 ; payé\n\n  Client connu  ');
    const { run, page: cleared } = setup(statesXml(cells));
    run((edit) => RULES_PROPERTY.write!(edit, edgeOf(edit.page, 'ab')!, '  '));
    expect(edgeOf(cleared(), 'ab')!.style['spatial.sm.rules']).toBeUndefined();
  });

  it('simulation : règles des transitions proposées, avec leur numéro et leur nom, sans celles qui n’en ont pas', () => {
    const page = withRules('ac', 'R1\nR2');
    const sim = new StateSimulation(page, 'i');
    expect(proposedRules(sim)).toEqual([]);
    sim.choose(1);
    expect(proposedRules(sim)).toEqual([{ badge: '2', name: '', rules: ['R1', 'R2'] }]);
  });

  it('export PlantUML : note sur le lien après la transition', () => {
    const lines = statesPlantUml(withRules('ab', 'R1\nR2')).split('\n');
    const at = lines.indexOf('A --> B : Valider');
    expect(lines.slice(at, at + 5)).toEqual(['A --> B : Valider', 'note on link', '  R1', '  R2', 'end note']);
  });

  it('encart du commentaire au survol : titre et règles en puces ; rien sans règle', () => {
    const page = withRules('ab', 'R1\n\nR2');
    expect(rulesNote(page, edgeOf(page, 'ab')!)).toEqual({ title: 'Règles de gestion', text: '• R1\n• R2' });
    expect(rulesNote(page, edgeOf(page, 'ac')!)).toBeUndefined();
  });
});
