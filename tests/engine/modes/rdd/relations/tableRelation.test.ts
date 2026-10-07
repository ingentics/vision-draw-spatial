import { describe, expect, it } from 'vitest';
import { tableRelation } from '../../../../../src/engine/modes/rdd/relations/tableRelation';
import type { Field } from '../../../../../src/engine/modes/rdd/fieldModel';

describe('mode RDD : apparence d’une relation entre tables (sujets 265, 266, 278)', () => {
  const field = (nullable: boolean): Field => ({ kind: 'fk', label: 'relation1', type: '', nullable, edge: 'e' });

  it('cardinalités d’après « Optionnel » : 0,n au début, 1,1 ou 0,1 à la fin', () => {
    expect(tableRelation.look(field(false), { cardinalities: true })).toEqual({
      startArrow: 'ERzeroToMany',
      endArrow: 'ERmandOne',
      startText: '0,n',
      endText: '1,1',
    });
    expect(tableRelation.look(field(true), { cardinalities: true })).toMatchObject({
      endArrow: 'ERzeroToOne',
      endText: '0,1',
    });
  });

  it('cardinalités masquées sur la page : les pointes sans les textes', () => {
    const look = tableRelation.look(field(true), { cardinalities: false });
    expect([look.startArrow, look.endArrow, look.startText, look.endText]).toEqual([
      'ERzeroToMany',
      'ERzeroToOne',
      undefined,
      undefined,
    ]);
    expect(look.dashed).toBeFalsy();
  });
});
