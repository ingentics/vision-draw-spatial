import { describe, expect, it } from 'vitest';
import { moveBounds, movePlan, resizeBounds } from '../../../../src/engine/core/edit/movePlan';
import type { ObstaclesOf } from '../../../../src/engine/core/edit/movePlan';
import { readDrawio } from '../../../../src/engine/core/format/parse';

const FILE =
  '<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  '<mxCell id="a" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="b" vertex="1" parent="1"><mxGeometry x="300" y="0" width="100" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="g" vertex="1" parent="1" style="swimlane;"><mxGeometry x="0" y="200" width="200" height="200" as="geometry"/></mxCell>' +
  '<mxCell id="c" vertex="1" parent="g"><mxGeometry x="20" y="40" width="50" height="30" as="geometry"/></mxCell>' +
  '<mxCell id="e" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  '<mxCell id="locked" edge="1" parent="1" source="a" target="b" style="locked=1;"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  '</root></mxGraphModel></diagram></mxfile>';

function load() {
  const { document, tree } = readDrawio(FILE);
  return { page: document.pages[0]!, pageTree: tree.pages[0]! };
}

const none: ObstaclesOf = () => undefined;

describe('plan d’un déplacement (sujet 384)', () => {
  it('une flèche sélectionnée bouge avec la forme ; le bout dont la forme reste en place est détaché', () => {
    const { page, pageTree } = load();
    const plan = movePlan(page, pageTree, ['a'], ['e'], [], none);
    expect(plan.rootIds).toEqual(['a']);
    expect(plan.edges).toEqual([{ id: 'e', detach: [{ end: 'target' }] }]);
    expect(plan.set.edgeIds.has('e')).toBe(true);
    expect(plan.set.connectedEdgeIds.has('e')).toBe(false);
    expect(plan.bounded).toBeUndefined();
  });

  it('une flèche verrouillée de la sélection ne bouge pas d’elle-même', () => {
    const { page, pageTree } = load();
    expect(movePlan(page, pageTree, ['a'], ['locked'], [], none).edges).toEqual([]);
  });

  it('une forme prise avec son conteneur bouge avec lui : seul le conteneur est réécrit', () => {
    const { page, pageTree } = load();
    const plan = movePlan(page, pageTree, ['c', 'g'], [], [], none);
    expect(plan.rootIds).toEqual(['g']);
    expect([...plan.set.shapeIds].sort()).toEqual(['c', 'g']);
  });

  it('formes emportées par le mode : réécrites, et les flèches qui les relient suivent sans détachement', () => {
    const { page, pageTree } = load();
    const plan = movePlan(page, pageTree, ['a'], [], ['b'], none);
    expect(plan.rootIds).toEqual(['a', 'b']);
    // Une flèche verrouillée qui les relie compte parmi les emportées, mais ne bouge pas d'elle-même.
    expect([...plan.carried].sort()).toEqual(['b', 'e', 'locked']);
    expect(plan.edges).toEqual([{ id: 'e', detach: [] }]);
  });

  it('bornes : seulement pour les formes saisies, pas pour celles emportées', () => {
    const { page, pageTree } = load();
    const obstaclesOf: ObstaclesOf = (shape) =>
      shape.id === 'b' ? { rects: [{ id: 'x', rect: { x: 0, y: 0, width: 1, height: 1 } }], gap: 4 } : undefined;
    expect(movePlan(page, pageTree, ['a'], [], ['b'], obstaclesOf).bounded).toBeUndefined();
    expect(movePlan(page, pageTree, ['b'], [], [], obstaclesOf).bounded?.gap).toBe(4);
  });
});

describe('bornes d’un déplacement (sujet 241)', () => {
  const rect = { x: 500, y: 0, width: 10, height: 10 };
  const obstaclesOf: ObstaclesOf = () => ({
    rects: [
      { id: 'b', rect: { x: 300, y: 0, width: 100, height: 60 } },
      { id: 'x', rect },
    ],
    above: 10,
    gap: 5,
  });

  it('emprise étendue de ce que la forme dessine au-dessus ; les obstacles qui bougent aussi sont ignorés', () => {
    const { page } = load();
    expect(moveBounds(page, ['a'], new Set(['a', 'b']), obstaclesOf)).toEqual({
      moving: [{ x: 0, y: -10, width: 100, height: 70 }],
      obstacles: [rect],
      gap: 5,
    });
  });

  it('aucun obstacle restant ou aucune forme bornée : pas de bornes', () => {
    const { page } = load();
    expect(moveBounds(page, ['a'], new Set(['a', 'b', 'x']), obstaclesOf)).toBeUndefined();
    expect(moveBounds(page, ['a'], new Set(['a']), none)).toBeUndefined();
  });
});

describe('bornes d’un redimensionnement (sujet 241)', () => {
  it('obstacles du mode, hauteur au-dessus 0 par défaut ; sans obstacle : aucune borne', () => {
    const { page } = load();
    const rect = { x: 500, y: 0, width: 10, height: 10 };
    expect(resizeBounds(page, 'a', () => ({ rects: [{ id: 'x', rect }], gap: 3 }))).toEqual({
      obstacles: [rect],
      above: 0,
      gap: 3,
    });
    expect(resizeBounds(page, 'a', () => ({ rects: [], gap: 3 }))).toBeUndefined();
    expect(resizeBounds(page, 'a', none)).toBeUndefined();
  });
});
