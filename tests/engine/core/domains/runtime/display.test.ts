import { describe, expect, it } from 'vitest';
import { keptFramingFactor } from '../../../../../src/engine/core/domains/runtime/display';

describe('cadrage gardé au changement d’écran (sujet 238)', () => {
  it('le plus petit des rapports de taille : la zone vue avant remplit le nouvel écran', () => {
    // Portable 1440 × 800 → écran externe 2560 × 1340 : la hauteur limite.
    expect(keptFramingFactor({ width: 1440, height: 800 }, { width: 2560, height: 1340 })).toBeCloseTo(1.675, 6);
    // Retour : la largeur limite ; le produit des deux n'est pas 1 quand les écrans n'ont pas les mêmes proportions
    // (le moteur retrouve alors le zoom de départ mémorisé).
    const back = keptFramingFactor({ width: 2560, height: 1340 }, { width: 1440, height: 800 });
    expect(back).toBeCloseTo(1440 / 2560, 6);
    expect(keptFramingFactor({ width: 800, height: 600 }, { width: 800, height: 600 })).toBe(1);
  });
});
