import { describe, expect, it } from 'vitest';
import type { Mesh, MeshBasicMaterial } from 'three';
import { softShadow } from '../../../../src/engine/core/render/softShadow';
import { PART_ORDER } from '../../../../src/engine/core/render/types';

describe('ombre douce d’un papier (sujets 411, 482, 504)', () => {
  it('une couche par pas du flou, étendues de plus en plus, sous le fond ; au centre, l’opacité demandée', () => {
    const spreads: number[] = [];
    const group = softShadow(
      (spread) => {
        spreads.push(spread);
        return [
          { x: -spread, y: -spread },
          { x: 10 + spread, y: -spread },
          { x: 10 + spread, y: 10 + spread },
        ];
      },
      { blur: 8, opacity: 0.25, layers: 4 },
    );
    expect(spreads).toEqual([1, 3, 5, 7]);
    const meshes = group.children as Mesh[];
    expect(meshes.map((m) => [m.name, m.renderOrder])).toEqual(Array(4).fill(['shadow', PART_ORDER.fill - 1]));
    const layer = (meshes[0]!.material as MeshBasicMaterial).opacity;
    expect(1 - Math.pow(1 - layer, 4)).toBeCloseTo(0.25);
  });
});
