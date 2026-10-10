import { describe, expect, it } from 'vitest';
import { COMPOSITE } from '../../../../../../src/engine/plugins/modes/states/composites/compositeLayout';
import { definition } from '../../../../../../src/engine/plugins/modes/states/shapes/composite';
import { MEASURE } from '../../../../../helpers';
import { setup, statesXml, vertex } from '../helpers';

/** Ensemble nommé en (100, 100), 300 × 200, et le même sans nom. */
function composites() {
  const { shape } = setup(statesXml(vertex('c', 'composite', 100, 100, 300, 200, 'Box')));
  const named = shape('c');
  return { named, unnamed: { ...named, label: '' } };
}

describe('mode Machine à états : forme de l’ensemble (sujet 435)', () => {
  it('prise : l’ensemble et son onglet, pas la bande vide à droite de l’onglet', () => {
    const { named } = composites();
    const contains = (x: number, y: number) => definition.contains!(named, { x, y }, MEASURE);
    expect(contains(200, 200)).toBe(true);
    // Dans l'onglet, au-dessus du coin haut-gauche.
    expect(contains(105, 100 - COMPOSITE.tab.height / 2)).toBe(true);
    // Au-dessus du bord haut, loin à droite de l'onglet.
    expect(contains(390, 100 - COMPOSITE.tab.height / 2)).toBe(false);
  });

  it('emprise au clic : l’onglet compris ; sans nom, le rectangle', () => {
    const { named, unnamed } = composites();
    const hit = definition.hitBounds!(named, MEASURE);
    expect(hit.y).toBe(100 - COMPOSITE.tab.height);
    expect(hit.y + hit.height).toBe(300);
    expect(definition.hitBounds!(unnamed, MEASURE)).toEqual(unnamed.bounds);
  });

  it('poignée haut-gauche au coin de l’onglet ; éditeur sur le nom, à sa place sans nom', () => {
    const { named, unnamed } = composites();
    expect(definition.movedHandles!(named, MEASURE)).toEqual({ nw: { x: 100, y: 100 - COMPOSITE.tab.height } });
    expect(definition.movedHandles!(unnamed, MEASURE)).toEqual({});
    expect(definition.textZone!(unnamed, 'flat', MEASURE)).toEqual({
      x: 100 + COMPOSITE.tab.padding,
      y: 100 - COMPOSITE.tab.height,
      width: COMPOSITE.tab.padding,
      height: COMPOSITE.tab.height,
    });
    expect(definition.textZone!(named, 'flat', MEASURE).y).toBe(100 - COMPOSITE.tab.height);
  });
});
