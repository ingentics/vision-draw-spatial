import { describe, expect, it } from 'vitest';
import { Object3D } from 'three';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import { distance } from '../../../../../src/engine/core/model/geometry';
import type { PageModel, Point } from '../../../../../src/engine/core/model/types';
import { createEdge } from '../../../../../src/engine/core/render/edges/edge';
import type { RenderContext } from '../../../../../src/engine/core/render/types';
import { fixture, MEASURE } from '../../../../helpers';

const ctx: RenderContext = { ...MEASURE, text: { create: () => new Object3D() } };
const pages = readDrawio(fixture('storytelling.drawio')).document.pages;

/** Tracé de la flèche `id` dessinée avec l'écart `inset`. */
function route(page: PageModel, id: string, inset: number): Point[] {
  const edge = page.edges.find((e) => e.id === id)!;
  const shape = (shapeId?: string) => page.shapes.find((s) => s.id === shapeId);
  const object = createEdge(edge, { source: shape(edge.sourceId), target: shape(edge.targetId) }, ctx, [], inset);
  return object.userData.route as Point[];
}

describe('écart des flèches aux formes imposé par le mode (sujet 536)', () => {
  it('chaque bout accroché recule de l’écart', () => {
    const [start, end] = [route(pages[0]!, 'payer', 0), route(pages[0]!, 'payer', 12)];
    expect(distance(start[0]!, end[0]!)).toBeCloseTo(12);
    expect(distance(start.at(-1)!, end.at(-1)!)).toBeCloseTo(12);
  });

  it('au plus un tiers du segment ; un bout libre reste en place', () => {
    const near = route(pages[0]!, 'payer', 0);
    const far = route(pages[0]!, 'payer', 1000);
    expect(distance(far[0]!, far.at(-1)!)).toBeCloseTo(distance(near[0]!, near.at(-1)!) / 3);
    const free = [route(pages[1]!, 'libre', 0), route(pages[1]!, 'libre', 12)];
    expect(free[1]!.at(-1)).toEqual(free[0]!.at(-1));
    expect(distance(free[0]![0]!, free[1]![0]!)).toBeCloseTo(12);
  });
});
