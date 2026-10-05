import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../../src/engine/format/parse';
import { createEdge } from '../../../../src/engine/render/edges/edge';
import { labelAngle } from '../../../../src/engine/render/edges/polyline';
import type { RenderContext } from '../../../../src/engine/render/types';

// Étape 133 : texte du milieu qui suit la flèche (spatial.labelFollow).

describe('angle du texte qui suit la flèche', () => {
  const elbow = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('celui du segment où tombe la position', () => {
    expect(labelAngle(elbow, -0.5)).toBeCloseTo(0);
    expect(labelAngle(elbow, 0.5)).toBeCloseTo(Math.PI / 2);
  });

  it('jamais à l’envers : un segment vers la gauche ou vers le haut est retourné', () => {
    const segment = (x1: number, y1: number, x2: number, y2: number) =>
      labelAngle(
        [
          { x: x1, y: y1 },
          { x: x2, y: y2 },
        ],
        0,
      );
    expect(segment(100, 100, 0, 0)).toBeCloseTo(Math.PI / 4);
    expect(segment(0, 100, 0, 0)).toBeCloseTo(Math.PI / 2);
    expect(segment(100, 0, 0, 100)).toBeCloseTo(-Math.PI / 4);
  });
});

describe('texte du milieu tourné dans le rendu', () => {
  const ctx: RenderContext = { text: { create: (spec) => Object.assign(new Object3D(), { spec }) } };
  const edge = (extra: string) =>
    parseDrawio(`<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="e" value="texte" style="endArrow=none;${extra}" edge="1" parent="1">
        <mxGeometry relative="1" as="geometry"><mxPoint x="0" y="0" as="sourcePoint"/><mxPoint x="100" y="100" as="targetPoint"/></mxGeometry>
      </mxCell></root></mxGraphModel></diagram></mxfile>`).pages[0]!.edges[0]!;
  const label = (extra: string) => {
    let found: Object3D | undefined;
    createEdge(edge(extra), {}, ctx).traverse((child) => {
      if (child.userData.labelCellId === 'e') found ??= child;
    });
    return found!;
  };

  it('coché : posé au milieu du trait et tourné comme lui', () => {
    const object = label('spatial.labelFollow=1;');
    expect(object.position.x).toBeCloseTo(50);
    expect(object.position.y).toBeCloseTo(50);
    expect(object.rotation.z).toBeCloseTo(Math.PI / 4);
    expect(object.userData.labelAnchor).toEqual({ x: 50, y: 50 });
  });

  it('décoché : horizontal', () => {
    expect(label('').rotation.z).toBe(0);
  });
});
