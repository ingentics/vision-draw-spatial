import { describe, expect, it } from 'vitest';
import { embeddedRelation } from '../../../../../src/engine/modes/rdd/relations/embeddedRelation';
import type { Field } from '../../../../../src/engine/modes/rdd/fieldModel';

describe('mode RDD : apparence d’une relation embedded (sujets 268, 278)', () => {
  it('ni pointe ni texte de bout, quels que soient « Optionnel » et l’affichage des cardinalités', () => {
    const field = (nullable: boolean): Field => ({ kind: 'embed', label: 'Address', type: '', nullable, edge: 'e' });
    for (const nullable of [false, true])
      for (const cardinalities of [false, true])
        expect(embeddedRelation.look(field(nullable), { cardinalities })).toEqual({
          startArrow: 'none',
          endArrow: 'none',
        });
  });
});
