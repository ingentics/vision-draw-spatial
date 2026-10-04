import { describe, expect, it } from 'vitest';
import { LABEL_PLACES, labelPlaceName, labelPlaceOf, labelPlacePatch } from '../../../src/engine/edit/labelPosition';

describe('position du texte d’une forme (menu « Position » de draw.io)', () => {
  it('neuf places, ligne par ligne', () => {
    expect(LABEL_PLACES.map(labelPlaceName)).toEqual([
      'En haut à gauche',
      'Dessus',
      'En haut à droite',
      'À gauche',
      'Au milieu',
      'À droite',
      'En bas à gauche',
      'Dessous',
      'En bas à droite',
    ]);
  });

  it('clés de draw.io : texte collé à la forme, valeurs par défaut retirées', () => {
    expect(labelPlacePatch({ horizontal: 'center', vertical: 'bottom' })).toEqual({
      labelPosition: undefined,
      align: undefined,
      verticalLabelPosition: 'bottom',
      verticalAlign: 'top',
    });
    expect(labelPlacePatch({ horizontal: 'left', vertical: 'top' })).toEqual({
      labelPosition: 'left',
      align: 'right',
      verticalLabelPosition: 'top',
      verticalAlign: 'bottom',
    });
    expect(labelPlacePatch({ horizontal: 'center', vertical: 'middle' })).toEqual({
      labelPosition: undefined,
      align: undefined,
      verticalLabelPosition: undefined,
      verticalAlign: undefined,
    });
  });

  it('place lue dans le style (aller-retour), au milieu par défaut', () => {
    for (const place of LABEL_PLACES) {
      const style = Object.fromEntries(
        Object.entries(labelPlacePatch(place)).filter((entry): entry is [string, string] => entry[1] !== undefined),
      );
      expect(labelPlaceOf(style)).toEqual(place);
    }
    expect(labelPlaceOf({ labelPosition: 'center', verticalLabelPosition: 'nowhere' })).toEqual({
      horizontal: 'center',
      vertical: 'middle',
    });
  });
});
