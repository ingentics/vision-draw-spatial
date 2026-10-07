import type { Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { partSelection } from '../../../src/engine/render/decorations';

describe('mise en valeur d’une partie de forme', () => {
  const bounds = { x: 0, y: 0, width: 100, height: 20 };
  const opacities = (group: ReturnType<typeof partSelection>) =>
    group.children.map((child) => ((child as Mesh).material as MeshBasicMaterial).opacity);

  it('sélectionnée (sujet 249) : fond à 15 % et trait plein', () => {
    const selected = partSelection(bounds, 1);
    expect(selected.name).toBe('part-selection');
    expect(opacities(selected)).toEqual([0.15, 1]);
  });

  it('survolée (sujet 259) : fond plus léger, à 7 %, trait fin à demi transparent', () => {
    const hover = partSelection(bounds, 1, undefined, true);
    expect(hover.name).toBe('part-hover');
    expect(opacities(hover)).toEqual([0.07, 0.5]);
  });
});
