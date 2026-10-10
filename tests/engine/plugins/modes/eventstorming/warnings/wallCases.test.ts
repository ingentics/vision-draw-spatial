import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import { readWall } from '../../../../../../src/engine/plugins/modes/eventstorming/export/wallRules';
import { isSticky } from '../../../../../../src/engine/plugins/modes/eventstorming/kinds';
import { badgeOf } from '../../../../../../src/engine/plugins/modes/eventstorming/warnings/stickyWarnings';
import { fixture } from '../../../../../helpers';

/**
 * Mur des règles (`eventstorming-regles.drawio`, sujet 519) : pour chaque règle, un cas bien placé (✓, aucune
 * pastille) et un ou plusieurs cas fautifs (✗) ; ids des post-it préfixés par le cas.
 */
const EXPECTED: Record<string, string[]> = {
  'r1-ok': [],
  'r1-ko': ['W1', 'W5'],
  'cause-ok': [],
  // Les deux Commands sont liées par ailleurs : pas de W1, la seconde n'a pas de déclencheur.
  'cause-ko': ['W6'],
  'r2-ok': [],
  'r2-ko': ['W1'],
  'r3-ok': [],
  'r3-ko': ['W2'],
  // Même Policy, visée par un Hotspot : sa suite est en suspens (sujet 519).
  'r3-hotspot-ok': [],
  'policy-ok': [],
  'policy-ko': ['W3'],
  'r4-ok': [],
  'r4-ko': ['W4'],
  'r5-ok': [],
  'r5-ko': ['W5'],
  'share-ok': [],
  'share-ko': ['W1', 'W6'],
  'trigger-ok': [],
  'w5-ko': ['W5'],
  'w6-ko': ['W6'],
  'glued-ok': [],
  'w7-ko': ['W7'],
  'w8-ko': ['W6', 'W7', 'W8'],
  'pivot-ok': [],
  'pivot-ko': [],
};

describe('mode Event storming : mur des règles, cas passants et fautifs (sujet 519)', () => {
  const page = readDrawio(fixture('eventstorming-regles.drawio')).document.pages[0]!;
  const caseOf = (id: string) => id.replace(/-\d+$/, '');
  const { warnings } = readWall(page);

  it('chaque cas donne exactement ses avertissements', () => {
    const found: Record<string, string[]> = Object.fromEntries(Object.keys(EXPECTED).map((key) => [key, []]));
    for (const warning of warnings) {
      const key = caseOf(warning.shapeIds[0]!);
      if (!found[key]!.includes(warning.code)) found[key]!.push(warning.code);
    }
    for (const codes of Object.values(found)) codes.sort();
    expect(found).toEqual(EXPECTED);
  });

  it('pastilles : aucune sur un cas passant, « ? » pour le pivot à décider', () => {
    const stickies = page.shapes.filter(isSticky);
    const passing = stickies.filter((shape) => caseOf(shape.id).endsWith('-ok'));
    expect(passing.filter((shape) => badgeOf(page, shape))).toEqual([]);
    expect(stickies.filter((shape) => caseOf(shape.id) === 'pivot-ko').map((shape) => badgeOf(page, shape))).toEqual([
      undefined,
      undefined,
      'question',
    ]);
  });
});
