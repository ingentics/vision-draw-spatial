import { describe, expect, expectTypeOf, it } from 'vitest';
import { canvasBrush } from '../../../../src/engine/core/interaction/minimapBrush';
import type { MinimapPainter } from '../../../../src/engine/core/shapes/types';

/** Faux contexte : enregistre les appels et les affectations dans l'ordre. */
function recorder() {
  const calls: string[] = [];
  const context = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, key) =>
      typeof key === 'string' ? (...args: unknown[]) => calls.push(`${key}(${args.join(',')})`) : undefined,
    set: (_target, key, value) => {
      calls.push(`${String(key)}=${String(value)}`);
      return true;
    },
  });
  return { calls, brush: canvasBrush(context) };
}

const square = [
  { x: 0, y: 0 },
  { x: 4, y: 0 },
  { x: 4, y: 4 },
];

describe('pinceau de la mini-carte (sujet 315)', () => {
  it('polygone rempli et bordé : chemin fermé, remplissage puis trait de 0,75', () => {
    const { calls, brush } = recorder();
    brush.polygon(square, { fill: '#ff0000', stroke: '#00ff00' });
    expect(calls).toEqual([
      'beginPath()',
      'moveTo(0,0)',
      'lineTo(4,0)',
      'lineTo(4,4)',
      'closePath()',
      'fillStyle=#ffffff',
      'fillStyle=#ff0000',
      'fill()',
      'lineWidth=0.75',
      'strokeStyle=#00ff00',
      'stroke()',
    ]);
  });

  it('polygone sans fill ni stroke : seul le chemin est tracé', () => {
    const { calls, brush } = recorder();
    brush.polygon(square, { stroke: '#000000', lineWidth: 2 });
    expect(calls).not.toContain('fill()');
    expect(calls).toContain('lineWidth=2');
    const other = recorder();
    other.brush.polygon(square, { fill: '#ffffff' });
    expect(other.calls).toContain('fill()');
    expect(other.calls).not.toContain('stroke()');
  });

  it('polyligne : chemin ouvert, trait de 0,75 par défaut', () => {
    const { calls, brush } = recorder();
    brush.polyline(square, { stroke: '#5f6368' });
    expect(calls).toEqual([
      'beginPath()',
      'moveTo(0,0)',
      'lineTo(4,0)',
      'lineTo(4,4)',
      'lineWidth=0.75',
      'strokeStyle=#5f6368',
      'stroke()',
    ]);
  });

  it('moins de deux points : rien', () => {
    const { calls, brush } = recorder();
    brush.polygon([{ x: 0, y: 0 }], { fill: '#ffffff' });
    brush.polyline([], { stroke: '#000000' });
    expect(calls).toEqual([]);
  });

  it('un peintre ne reçoit pas un contexte 2D', () => {
    expectTypeOf<Parameters<MinimapPainter>[0]>().not.toEqualTypeOf<CanvasRenderingContext2D>();
    expectTypeOf<CanvasRenderingContext2D>().not.toMatchTypeOf<Parameters<MinimapPainter>[0]>();
  });
});
