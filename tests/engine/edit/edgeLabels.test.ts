import { describe, expect, it } from 'vitest';
import {
  anchorOf,
  edgeTextLayout,
  edgeTexts,
  endAt,
  endLabelOf,
  endLabelPosition,
} from '../../../src/engine/edit/edgeLabels';
import { labelPoint, placementAt, positionAlong } from '../../../src/engine/render/edges/polyline';
import { addEdgeLabelCell } from '../../../src/engine/format/create';
import { setCellLabel, setLabelPlacement } from '../../../src/engine/format/edit';
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

describe('position des textes d’une flèche', () => {
  const route = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('placement d’un point : inverse du dessin du label (position le long du tracé, écart de côté)', () => {
    for (const point of [
      { x: 30, y: -12 },
      { x: 70, y: 8 },
      { x: 112, y: 60 },
      { x: 90, y: 40 },
    ]) {
      const offset = { x: 3, y: -2 };
      const placement = placementAt(route, point, offset);
      expect(placement.offset).toEqual(offset);
      const drawn = labelPoint(route, placement);
      expect(drawn.x).toBeCloseTo(point.x, 6);
      expect(drawn.y).toBeCloseTo(point.y, 6);
    }
    expect(placementAt(route, { x: 0, y: 0 }).position).toBe(-1);
    expect(placementAt(route, { x: 100, y: 100 }).position).toBe(1);
  });

  it('écrit comme draw.io (x, y, offset de la géométrie relative) et relu à l’identique', () => {
    const { tree } = readDrawio(fixture('three-rectangles.drawio'));
    const page = tree.pages[0]!;
    const id = addEdgeLabelCell(page, 'ab', { value: 'fin', position: 0.8 });
    setLabelPlacement(page, id, { position: -0.25, distance: 12.5, offset: { x: 4, y: 0 } });
    setLabelPlacement(page, 'ab', { position: 0.5, distance: 0, offset: { x: 0, y: 0 } });
    const xml = writeDrawio(tree);
    const edge = readDrawio(xml).document.pages[0]!.edges.find((e) => e.id === 'ab')!;
    expect(edge.labelPlacement).toEqual({ position: 0.5, distance: 0, offset: { x: 0, y: 0 } });
    expect(edge.labels[0]!.placement).toEqual({ position: -0.25, distance: 12.5, offset: { x: 4, y: 0 } });
  });

  it('textes non vides d’une flèche et leur ancre (début, milieu, fin)', () => {
    const edge = {
      id: 'e',
      label: 'appelle',
      labelPlacement: placement(0.1),
      labels: [
        { id: 'a', label: '1', placement: placement(-0.8), style: {} },
        { id: 'b', label: ' ', placement: placement(0.8), style: {} },
      ],
    } as unknown as EdgeModel;
    expect(edgeTexts(edge).map((t) => [t.cellId, anchorOf(t.placement)])).toEqual([
      ['e', 'middle'],
      ['a', 'start'],
    ]);
  });
});

describe('configuration par défaut des textes de début et de fin', () => {
  const at = (route: Array<[number, number]>, end: 'start' | 'end' | 'middle') => {
    const layout = edgeTextLayout(
      route.map(([x, y]) => ({ x, y })),
      end,
    );
    return {
      ...layout,
      point: labelPoint(
        route.map(([x, y]) => ({ x, y })),
        layout.placement,
      ),
    };
  };

  it('flèche qui part vers la droite et arrive par la gauche (comme l’exemple) : début au-dessus aligné à gauche, fin en dessous alignée à droite', () => {
    const route: Array<[number, number]> = [
      [0, 0],
      [50, 0],
      [50, 100],
      [100, 100],
    ];
    expect(at(route, 'start')).toMatchObject({ align: 'left', verticalAlign: 'bottom', point: { x: 6, y: -4 } });
    expect(at(route, 'end')).toMatchObject({ align: 'right', verticalAlign: 'top', point: { x: 94, y: 104 } });
    expect(at(route, 'middle')).toMatchObject({ align: 'center', verticalAlign: 'middle' });
  });

  it('sens inverse : les alignements s’inversent (le texte s’éloigne toujours de la forme)', () => {
    const route: Array<[number, number]> = [
      [100, 0],
      [0, 0],
    ];
    expect(at(route, 'start')).toMatchObject({ align: 'right', verticalAlign: 'bottom', point: { x: 94, y: -4 } });
    expect(at(route, 'end')).toMatchObject({ align: 'left', verticalAlign: 'top', point: { x: 6, y: 4 } });
  });

  it('segments verticaux : début à droite du trait, fin à gauche, le texte part le long du trait', () => {
    const down: Array<[number, number]> = [
      [0, 0],
      [0, 100],
    ];
    expect(at(down, 'start')).toMatchObject({ align: 'left', verticalAlign: 'top', point: { x: 4, y: 6 } });
    expect(at(down, 'end')).toMatchObject({ align: 'right', verticalAlign: 'bottom', point: { x: -4, y: 94 } });
  });

  it('placement au bout (x = ±1) : reconnu comme texte de début ou de fin', () => {
    const route: Array<[number, number]> = [
      [0, 0],
      [100, 0],
    ];
    expect(anchorOf(at(route, 'start').placement)).toBe('start');
    expect(anchorOf(at(route, 'end').placement)).toBe('end');
  });
});
