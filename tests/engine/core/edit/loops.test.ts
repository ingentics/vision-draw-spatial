import { describe, expect, it } from 'vitest';
import { loopWaypoints } from '../../../../src/engine/core/edit/loops';

// Forme de 100 × 60 en (100, 100) : bas à y = 160, droite à x = 200 ; boucle à 20 px du cadre.
const BOUNDS = { x: 100, y: 100, width: 100, height: 60 };

describe('loopWaypoints', () => {
  it('même côté : U sous la forme', () => {
    expect(
      loopWaypoints(BOUNDS, { point: { x: 150, y: 160 }, side: 's' }, { point: { x: 125, y: 160 }, side: 's' }),
    ).toEqual([
      { x: 150, y: 180 },
      { x: 125, y: 180 },
    ]);
  });

  it('côtés voisins : par le coin', () => {
    expect(
      loopWaypoints(BOUNDS, { point: { x: 150, y: 160 }, side: 's' }, { point: { x: 200, y: 130 }, side: 'e' }),
    ).toEqual([
      { x: 150, y: 180 },
      { x: 220, y: 180 },
      { x: 220, y: 130 },
    ]);
  });

  it('côtés opposés : autour de la forme, par le côté le plus proche des deux points', () => {
    const bottom = { point: { x: 175, y: 160 }, side: 's' as const };
    expect(loopWaypoints(BOUNDS, bottom, { point: { x: 150, y: 100 }, side: 'n' })).toEqual([
      { x: 175, y: 180 },
      { x: 220, y: 180 },
      { x: 220, y: 80 },
      { x: 150, y: 80 },
    ]);
    const left = { point: { x: 100, y: 145 }, side: 'w' as const };
    expect(loopWaypoints(BOUNDS, left, { point: { x: 200, y: 145 }, side: 'e' })).toEqual([
      { x: 80, y: 145 },
      { x: 80, y: 180 },
      { x: 220, y: 180 },
      { x: 220, y: 145 },
    ]);
  });
});
