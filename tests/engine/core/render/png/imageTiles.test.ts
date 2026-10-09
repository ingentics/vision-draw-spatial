import { describe, expect, it } from 'vitest';
import { imageSize, imageTiles } from '../../../../../src/engine/core/render/png/imageTiles';

describe('export d’image : taille et morceaux (sujet 431)', () => {
  it('arrondit la taille au pixel supérieur selon la densité', () => {
    expect(imageSize({ x: -10, y: 5, width: 100.2, height: 50 }, 1.5)).toEqual({ width: 151, height: 75 });
  });

  it('donne au moins un pixel à un cadre vide', () => {
    expect(imageSize({ x: 0, y: 0, width: 0, height: 0 }, 2)).toEqual({ width: 1, height: 1 });
  });

  it('couvre l’image sans chevauchement, les derniers morceaux raccourcis', () => {
    expect(imageTiles(5000, 3000, 4096)).toEqual([
      { x: 0, y: 0, width: 4096, height: 3000 },
      { x: 4096, y: 0, width: 904, height: 3000 },
    ]);
    expect(imageTiles(100, 100, 4096)).toEqual([{ x: 0, y: 0, width: 100, height: 100 }]);
  });
});
