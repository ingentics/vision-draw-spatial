import { Mesh, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { blockArrowOutline, isBlockArrow } from '../../../../../src/engine/core/render/edges/blockArrow';
import { createEdge } from '../../../../../src/engine/core/render/edges/edge';
import { routeEdge, routingKind } from '../../../../../src/engine/core/render/edges/route';
import { pointHandles, pointsEditor } from '../../../../../src/engine/core/edit/edgePointEdits';
import { pickElement } from '../../../../../src/engine/core/interaction/pick';
import type { EdgeModel, PageModel, Point } from '../../../../../src/engine/core/model/types';
import type { RenderContext } from '../../../../../src/engine/core/render/types';
import { MEASURE } from '../../../../helpers';

// Sujet 410 : flèche pleine (« block arrow »), `shape=flexArrow`, toujours droite, un polygone plein effilé.

const STYLE = { shape: 'flexArrow' };

describe('contour de la flèche pleine', () => {
  it('100 px : queue de 2, corps de 12 à la base de la tête, tête de 28 × 24, barbes reculées de 4', () => {
    expect(blockArrowOutline({ x: 0, y: 0 }, { x: 100, y: 0 })).toEqual([
      { x: 0, y: -1 },
      { x: 76, y: -6 },
      { x: 72, y: -14 },
      { x: 100, y: 0 },
      { x: 72, y: 14 },
      { x: 76, y: 6 },
      { x: 0, y: 1 },
    ]);
  });

  it('étirée, elle garde ses proportions ; orientée selon ses bouts', () => {
    const outline = blockArrowOutline({ x: 0, y: 0 }, { x: 0, y: 200 });
    // Vers le bas : la largeur se lit en x, doublée.
    expect(outline[2]!.x).toBeCloseTo(28);
    expect(outline[2]!.y).toBeCloseTo(144);
    expect(outline[3]).toEqual({ x: 0, y: 200 });
  });

  it('avec une marge (trou du voile) : même silhouette, agrandie d’autant de chaque côté', () => {
    const [tail, , barb, tip, , neck] = blockArrowOutline({ x: 0, y: 0 }, { x: 100, y: 0 }, 10);
    expect(tail).toEqual({ x: -10, y: -11 });
    expect(neck).toEqual({ x: 76, y: 16 });
    expect(barb).toEqual({ x: 62, y: -24 });
    // La pointe avance de 10 / sin(demi-angle de la tête) : ses côtés restent à 10 de ceux de la flèche.
    expect(tip!.x).toBeCloseTo(100 + (10 * Math.hypot(28, 14)) / 14);
    expect(tip!.y).toBeCloseTo(0);
  });

  it('bouts confondus : rien', () => {
    expect(blockArrowOutline({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual([]);
  });

  it('reconnue par shape=flexArrow seulement', () => {
    expect(isBlockArrow(STYLE)).toBe(true);
    expect(isBlockArrow({ shape: 'link' })).toBe(false);
    expect(isBlockArrow({})).toBe(false);
  });
});

describe('toujours droite', () => {
  const A = { bounds: { x: 0, y: 0, width: 40, height: 40 }, perimeter: 'rectangle' as const };
  const B = { bounds: { x: 200, y: 100, width: 40, height: 40 }, perimeter: 'rectangle' as const };

  it('routeur et points intermédiaires ignorés : ligne droite entre les formes', () => {
    const style = { ...STYLE, edgeStyle: 'orthogonalEdgeStyle' };
    expect(routingKind(style).kind).toBe('straight');
    const route = routeEdge({ source: A, target: B, waypoints: [{ x: 300, y: 0 }], style });
    expect(route).toHaveLength(2);
    // Droite du centre de A au centre de B, coupée à leurs bords.
    const [from, to] = route as [Point, Point];
    expect((to.y - from.y) / (to.x - from.x)).toBeCloseTo(0.5);
  });

  it('même reliée à sa propre forme : pas de boucle', () => {
    const route = routeEdge({ source: A, target: A, waypoints: [], style: STYLE });
    expect(route.length).toBeLessThanOrEqual(2);
  });

  it('aucune poignée entre ses bouts', () => {
    expect(pointsEditor(STYLE)).toBe('none');
    const route = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(pointHandles({ editor: 'none', route, waypoints: [] })).toEqual([]);
  });
});

describe('rendu et clic', () => {
  const ctx: RenderContext = { ...MEASURE, text: { create: () => new Object3D() } };
  const edge = (style: Record<string, string>): EdgeModel =>
    ({
      id: 'e',
      label: '',
      labels: [],
      labelPlacement: { position: 0, distance: 0, offset: { x: 0, y: 0 } },
      style,
      points: [],
      sourcePoint: { x: 0, y: 0 },
      targetPoint: { x: 400, y: 0 },
      visible: true,
      layerId: '1',
      z: 1,
    }) as unknown as EdgeModel;

  it('un seul polygone plein, ni trait ni pointe', () => {
    const group = createEdge(edge({ ...STYLE, strokeColor: '#333333', endArrow: 'classic' }), {}, ctx);
    const meshes = group.children.filter((c): c is Mesh => c instanceof Mesh);
    expect(meshes.map((m) => m.name)).toEqual(['fill']);
  });

  it('son contour fermé est le tracé dessiné : elle se prend à l’intérieur de la tête', () => {
    const model = edge(STYLE);
    const group = createEdge(model, {}, ctx);
    const path = group.userData.path as Point[];
    expect(path[0]).toEqual(path[path.length - 1]);
    const page = { shapes: [], edges: [model], layers: [] } as unknown as PageModel;
    // Tête de 400 px : 112 de large ; son milieu est loin du bord comme de l'axe en tolérance près.
    const options = { edgeTolerance: 3, edgeRoute: () => path };
    expect(pickElement(page, { x: 330, y: 20 }, options)?.element.id).toBe('e');
    expect(pickElement(page, { x: 330, y: 70 }, options)).toBeUndefined();
  });
});
