import { describe, expect, it } from 'vitest';
import { endAt, endLabelOf, endLabelPosition } from '../../../src/engine/edit/edgeLabels';
import { positionAlong } from '../../../src/engine/render/edges/polyline';
import { addEdgeLabelCell } from '../../../src/engine/format/create';
import { setCellLabel } from '../../../src/engine/format/edit';
import { readDrawio } from '../../../src/engine/format/parse';
import type { EdgeModel } from '../../../src/engine/model/types';
import { writeDrawio } from '../../../src/engine/format/write';
import { fixture } from '../../helpers';

const placement = (position: number) => ({ position, distance: 0, offset: { x: 0, y: 0 } });
const edgeWith = (...positions: number[]) =>
  ({
    labels: positions.map((position, i) => ({
      id: `l${i}`,
      label: `t${i}`,
      placement: placement(position),
      style: {},
    })),
  }) as unknown as EdgeModel;

describe('textes de début et de fin d’une flèche', () => {
  it('le label le plus proche de chaque bout, au-delà de ±0,5', () => {
    const edge = edgeWith(0, -0.3, -0.8, 1, 0.6, -1);
    expect(endLabelOf(edge, 'start')?.id).toBe('l5');
    expect(endLabelOf(edge, 'end')?.id).toBe('l3');
    expect(endLabelOf(edgeWith(0, 0.4), 'end')).toBeUndefined();
  });

  it('création au format draw.io (edgeLabel enfant de l’arête), relue comme texte de début', () => {
    const { tree } = readDrawio(fixture('three-rectangles.drawio'));
    const page = tree.pages[0]!;
    const id = addEdgeLabelCell(page, 'ab', { value: '', position: endLabelPosition('start') });
    setCellLabel(page, id, '1..*');
    const xml = writeDrawio(tree);
    expect(xml).toContain(`parent="ab"`);
    expect(xml).toMatch(/style="edgeLabel;[^"]*" vertex="1" connectable="0" parent="ab"/);
    const edge = readDrawio(xml).document.pages[0]!.edges.find((e) => e.id === 'ab')!;
    expect(endLabelOf(edge, 'start')).toMatchObject({ id, label: '1..*' });
    expect(endLabelOf(edge, 'end')).toBeUndefined();
  });
});

describe('double-clic près d’un bout de flèche', () => {
  const route = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('position le long du tracé : -1 au début, 0 au milieu, 1 à la fin', () => {
    expect(positionAlong(route, { x: -20, y: 5 })).toBeCloseTo(-1);
    expect(positionAlong(route, { x: 98, y: -10 })).toBeCloseTo(-0.02);
    expect(positionAlong(route, { x: 110, y: 100 })).toBeCloseTo(1);
  });

  it('quart du tracé de chaque côté : texte de début ou de fin ; sinon le label du milieu', () => {
    expect(endAt(positionAlong(route, { x: 20, y: 3 }))).toBe('start');
    expect(endAt(positionAlong(route, { x: 100, y: 80 }))).toBe('end');
    expect(endAt(positionAlong(route, { x: 100, y: 10 }))).toBeUndefined();
  });
});
