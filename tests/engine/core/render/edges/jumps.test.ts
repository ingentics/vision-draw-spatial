import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../../../src/engine/core/format/parse';
import { jumpHalfLength, jumpStyleOf, withJumps } from '../../../../../src/engine/core/render/edges/jumps';
import { buildPageScene } from '../../../../../src/engine/core/render/pageScene';
import type { RenderContext } from '../../../../../src/engine/core/render/types';
import type { Point } from '../../../../../src/engine/core/model/types';
import { fixture } from '../../../../helpers';
import { createDefaultRegistry } from '../../../../../src/engine/plugins';

// Étape 129 : sauts de ligne aux croisements (jumpStyle, jumpSize).

const horizontal = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
];
const vertical = [
  { x: 50, y: -50 },
  { x: 50, y: 50 },
];

describe('withJumps', () => {
  it('demi-longueur comme draw.io : (jumpSize − 2) / 2 + épaisseur', () => {
    expect(jumpHalfLength({}, 1)).toBe(3);
    expect(jumpHalfLength({ jumpSize: '16' }, 2)).toBe(9);
  });

  it('cascade : la flèche, sinon la page ; « none » explicite l’emporte ; taille par défaut', () => {
    const page = { style: 'arc', size: 10 } as const;
    expect(jumpStyleOf({}, page)).toBe('arc');
    expect(jumpStyleOf({ jumpStyle: 'gap' }, page)).toBe('gap');
    expect(jumpStyleOf({ jumpStyle: 'none' }, page)).toBeUndefined();
    expect(jumpStyleOf({ curved: '1' }, page)).toBeUndefined();
    expect(jumpHalfLength({}, 1, page)).toBe(5);
    expect(jumpHalfLength({ jumpSize: '6' }, 1, page)).toBe(3);
  });

  it('style : aucun par défaut, ni pour une flèche courbe', () => {
    expect(jumpStyleOf({})).toBeUndefined();
    expect(jumpStyleOf({ jumpStyle: 'none' })).toBeUndefined();
    expect(jumpStyleOf({ jumpStyle: 'arc', curved: '1' })).toBeUndefined();
    expect(jumpStyleOf({ jumpStyle: 'gap' })).toBe('gap');
  });

  it('arc : bosse vers le haut au croisement, quel que soit le sens', () => {
    for (const line of [horizontal, [...horizontal].reverse()]) {
      const [piece, ...rest] = withJumps(line, [vertical], 'arc', 3);
      expect(rest).toEqual([]);
      const top = Math.min(...piece!.map((p) => p.y));
      expect(top).toBeLessThan(-2.5);
      expect(piece!.filter((p) => p.y < 0).every((p) => p.x > 47 && p.x < 53)).toBe(true);
    }
  });

  it('segment vertical : la bosse part vers la droite', () => {
    const [piece] = withJumps(vertical, [horizontal], 'sharp', 3);
    expect(piece).toContainEqual({ x: 53, y: -3 });
    expect(piece).toContainEqual({ x: 53, y: 3 });
  });

  it('en volume (146) : l’arc et la marche montent en z au-dessus du croisement, sans quitter la ligne', () => {
    const [arc, ...rest] = withJumps(horizontal, [vertical], 'arc', 3, true);
    expect(rest).toEqual([]);
    expect(arc!.every((p) => p.y === 0)).toBe(true);
    expect(Math.max(...arc!.map((p) => p.z ?? 0))).toBeGreaterThan(2.5);
    expect(arc!.filter((p) => p.z).every((p) => p.x > 47 && p.x < 53)).toBe(true);
    const [sharp] = withJumps(vertical, [horizontal], 'sharp', 3, true);
    expect(sharp).toContainEqual({ x: 50, y: -3, z: 3 });
    expect(sharp).toContainEqual({ x: 50, y: 3, z: 3 });
    // La coupure bordée reste dans le plan.
    expect(withJumps(horizontal, [vertical], 'line', 3, true)[1]).toEqual([
      { x: 47, y: 3 },
      { x: 47, y: -3 },
    ]);
  });

  it('coupure : deux morceaux ; ligne : plus deux traits en travers', () => {
    const gap = withJumps(horizontal, [vertical], 'gap', 3);
    expect(gap).toEqual([
      [
        { x: 0, y: 0 },
        { x: 47, y: 0 },
      ],
      [
        { x: 53, y: 0 },
        { x: 100, y: 0 },
      ],
    ]);
    const line = withJumps(horizontal, [vertical], 'line', 3);
    expect(line).toHaveLength(4);
    expect(line[1]).toEqual([
      { x: 47, y: 3 },
      { x: 47, y: -3 },
    ]);
  });

  it('pas de saut près d’un bout, ni pour une flèche qui ne fait que toucher', () => {
    const nearStart = [
      { x: 2, y: -50 },
      { x: 2, y: 50 },
    ];
    expect(withJumps(horizontal, [nearStart], 'arc', 3)).toEqual([horizontal]);
    const touching = [
      { x: 50, y: -50 },
      { x: 50, y: 0 },
    ];
    expect(withJumps(horizontal, [touching], 'arc', 3)).toEqual([horizontal]);
  });
});

describe('buildPageScene — sauts', () => {
  const ctx: RenderContext = { text: { create: () => new Object3D() } };
  const page = (jumpStyle: string) =>
    parseDrawio(`<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="under" style="endArrow=none;" edge="1" parent="1">
        <mxGeometry relative="1" as="geometry"><mxPoint x="50" y="-50" as="sourcePoint"/><mxPoint x="50" y="50" as="targetPoint"/></mxGeometry>
      </mxCell>
      <mxCell id="over" style="endArrow=none;jumpStyle=${jumpStyle};" edge="1" parent="1">
        <mxGeometry relative="1" as="geometry"><mxPoint x="0" y="0" as="sourcePoint"/><mxPoint x="100" y="0" as="targetPoint"/></mxGeometry>
      </mxCell></root></mxGraphModel></diagram></mxfile>`).pages[0]!;
  const strokes = (jumpStyle: string, id: string) =>
    buildPageScene(page(jumpStyle), createDefaultRegistry(), ctx)
      .root.children.find((c) => c.userData.elementId === id)!
      .children.filter((c) => c.name === 'stroke').length;

  it('en volume, la bosse est un trait à part, levé (146)', () => {
    const over = buildPageScene(page('arc'), createDefaultRegistry(), ctx, 'iso')
      .root.children.find((c) => c.userData.elementId === 'over')!
      .children.filter((c) => c.name === 'stroke');
    expect(over).toHaveLength(3);
  });

  it('seule la flèche du dessus saute', () => {
    expect(strokes('gap', 'over')).toBe(2);
    expect(strokes('none', 'over')).toBe(1);
    expect(strokes('gap', 'under')).toBe(1);
  });
});

describe('line-jumps.drawio — comme draw.io', () => {
  // Export SVG de draw.io (`make drawio-check`) : la page y est décalée de (−80, −20).
  const svg = fixture('drawio-saved/line-jumps.svg');
  const page = parseDrawio(fixture('line-jumps.drawio')).pages[0]!;
  const below = ['v1', 'v2'].map((id) => {
    const edge = page.edges.find((e) => e.id === id)!;
    return [edge.sourcePoint!, edge.targetPoint!];
  });
  /** Sommets d'un tracé SVG (bouts des segments et des courbes), en coordonnées page, sans doublon consécutif. */
  const svgPoints = (y: number): Point[] => {
    const d = [...svg.matchAll(/<path d="([^"]*)"/g)]
      .map((m) => m[1]!)
      .find((path) => path.startsWith(`M 20 ${y - 20} `))!;
    const points: Point[] = [];
    for (const [, command, args] of d.matchAll(/([MLCQ])([^MLCQ]*)/g)) {
      const n = args!.trim().split(/\s+/).map(Number);
      const at = command === 'C' ? 4 : command === 'Q' ? 2 : 0;
      points.push({ x: n[at]! + 80, y: n[at + 1]! + 20 });
    }
    return points;
  };
  const between = (points: Point[]) =>
    points
      .filter((p) => p.x > 110 && p.x < 410)
      .map((p) => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 }))
      .filter((p, i, all) => i === 0 || p.x !== all[i - 1]!.x || p.y !== all[i - 1]!.y);

  it.each(['h1', 'h2', 'h3'])('%s : mêmes sommets que draw.io', (id) => {
    const edge = page.edges.find((e) => e.id === id)!;
    const line = [edge.sourcePoint!, edge.targetPoint!];
    const pieces = withJumps(line, below, jumpStyleOf(edge.style)!, jumpHalfLength(edge.style, 1));
    expect(between(pieces.flat())).toEqual(between(svgPoints(edge.sourcePoint!.y)));
  });

  it.each(['h0', 'h4'])('%s : arcs de même emprise que draw.io', (id) => {
    const edge = page.edges.find((e) => e.id === id)!;
    const line = [edge.sourcePoint!, edge.targetPoint!];
    const width = parseFloat(edge.style.strokeWidth ?? '1');
    const [piece] = withJumps(line, below, 'arc', jumpHalfLength(edge.style, width));
    const onLine = (points: Point[]) => between(points).filter((p) => p.y === edge.sourcePoint!.y);
    expect(onLine(piece!)).toEqual(onLine(svgPoints(edge.sourcePoint!.y)));
  });
});
