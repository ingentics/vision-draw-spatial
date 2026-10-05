import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../../src/engine/format/parse';
import { createEdge } from '../../../../src/engine/render/edges/edge';
import { approximateMeasure, layoutRichText } from '../../../../src/engine/render/richLayout';
import { layoutOnPath } from '../../../../src/engine/render/textPath';
import type { TextAlong } from '../../../../src/engine/render/textPath';
import type { RenderContext, TextSpec } from '../../../../src/engine/render/types';

// Étapes 133 et 138 : texte du milieu qui suit la flèche (spatial.labelFollow), lettre par lettre le long du tracé.

const base = { size: 10, bold: false, italic: false, underline: false, strike: false };
const glyphs = (text: string, path: TextAlong['path'], extra: Partial<TextAlong> = {}) =>
  layoutOnPath(
    layoutRichText([[{ text }]], base, approximateMeasure, { align: 'center' }),
    { path, position: 0, distance: 0, offset: { x: 0, y: 0 }, ...extra },
    { x: 'center', y: 'middle' },
    approximateMeasure,
  );

describe('lettres le long du tracé', () => {
  it('segment horizontal : lettres alignées, centrées sur le milieu, à plat', () => {
    const placed = glyphs('abcd', [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]);
    expect(placed.map((g) => g.text).join('')).toBe('abcd');
    expect(placed.every((g) => g.angle === 0)).toBe(true);
    const xs = placed.map((g) => g.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect((xs[0]! + xs[3]!) / 2).toBeCloseTo(100);
  });

  it('coude : le texte passe le coin, la fin du mot tourne avec le trait', () => {
    const placed = glyphs('abcdefgh', [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
    ]);
    expect(placed[0]!.angle).toBeCloseTo(0);
    expect(placed[7]!.angle).toBeCloseTo(Math.PI / 2);
    expect(placed[7]!.y).toBeGreaterThan(0);
  });

  it('tracé de droite à gauche : parcouru à l’envers, jamais à l’envers', () => {
    const placed = glyphs('abcd', [
      { x: 200, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(placed.every((g) => Math.abs(g.angle) < 1e-9)).toBe(true);
    expect(placed[0]!.x).toBeLessThan(placed[3]!.x);
  });

  it('écart de côté gardé du même côté quand le tracé est retourné', () => {
    const right = glyphs(
      'ab',
      [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      ],
      { distance: 10 },
    );
    const left = glyphs(
      'ab',
      [
        { x: 200, y: 0 },
        { x: 0, y: 0 },
      ],
      { distance: -10 },
    );
    expect(right[0]!.y).toBeLessThan(0);
    expect(left[0]!.y).toBeCloseTo(right[0]!.y);
  });
});

describe('texte du milieu dans le rendu', () => {
  const specs: TextSpec[] = [];
  const ctx: RenderContext = {
    text: {
      create: (spec) => {
        specs.push(spec);
        return new Object3D();
      },
    },
  };
  const render = (extra: string) => {
    specs.length = 0;
    const edge = parseDrawio(`<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="e" value="texte" style="endArrow=none;${extra}" edge="1" parent="1">
        <mxGeometry relative="1" as="geometry"><mxPoint x="0" y="0" as="sourcePoint"/><mxPoint x="100" y="100" as="targetPoint"/></mxGeometry>
      </mxCell></root></mxGraphModel></diagram></mxfile>`).pages[0]!.edges[0]!;
    createEdge(edge, {}, ctx);
    return specs[0]!;
  };

  it('coché : posé le long du trait dessiné', () => {
    const spec = render('spatial.labelFollow=1;');
    expect(spec.along?.path).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ]);
    expect(spec.along?.position).toBe(0);
  });

  it('décoché : texte horizontal', () => {
    expect(render('').along).toBeUndefined();
  });
});
