import { Mesh, Object3D } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { createEdge } from '../../../../src/engine/render/edges/edge';
import {
  DEFAULT_EDGE_SPLIT,
  splitHoverOverlay,
  splitLabelFrame,
  splitPieces,
} from '../../../../src/engine/render/edges/split';
import { pickElement } from '../../../../src/engine/interaction/pick';
import type { EdgeModel, PageModel, Point } from '../../../../src/engine/model/types';
import type { SplitHover } from '../../../../src/engine/render/edges/split';
import type { RenderContext } from '../../../../src/engine/render/types';

// Ticket 219 : flèche coupée en deux (`split=1`), fondu ou cadre de renvoi au bout de chaque tronçon.

const line: Point[] = [
  { x: 0, y: 0 },
  { x: 200, y: 0 },
];

describe('tronçons d’une flèche coupée', () => {
  it('un tronçon de chaque côté, de la longueur visible, du bout vers le milieu', () => {
    const [left, right] = splitPieces(line, { split: '1' }, DEFAULT_EDGE_SPLIT);
    expect(left!.points[0]).toEqual({ x: 0, y: 0 });
    expect(left!.points.at(-1)).toEqual({ x: 40, y: 0 });
    expect(right!.points[0]).toEqual({ x: 200, y: 0 });
    expect(right!.points.at(-1)).toEqual({ x: 160, y: 0 });
  });

  it('fondu sur les derniers pixels : opaque, puis de 1 à 0', () => {
    const [left, right] = splitPieces(line, { split: '1' }, DEFAULT_EDGE_SPLIT);
    expect(left!.alphaAt({ x: 10, y: 0 })).toBe(1);
    expect(left!.alphaAt({ x: 20, y: 0 })).toBe(1);
    expect(left!.alphaAt({ x: 30, y: 0 })).toBeCloseTo(0.5);
    expect(left!.alphaAt({ x: 40, y: 0 })).toBe(0);
    expect(right!.alphaAt({ x: 170, y: 0 })).toBeCloseTo(0.5);
    // Point de début du fondu dans le tracé : l'opacité y change de pente.
    expect(left!.points).toContainEqual({ x: 20, y: 0 });
  });

  it('le fondu suit les coudes ; une flèche courte est coupée en son milieu', () => {
    const bent = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 100 },
    ];
    const [left] = splitPieces(bent, { split: '1' }, DEFAULT_EDGE_SPLIT);
    expect(left!.points).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 10 },
    ]);
    const [short] = splitPieces(
      line.map((p) => ({ x: p.x / 5, y: 0 })),
      { split: '1' },
      DEFAULT_EDGE_SPLIT,
    );
    expect(short!.points.at(-1)).toEqual({ x: 20, y: 0 });
  });

  it('avec un texte de renvoi, pas de fondu', () => {
    const [left, right] = splitPieces(line, { split: '1', splitLabelLeft: 'vers B' }, DEFAULT_EDGE_SPLIT);
    expect(left!.label).toBe('vers B');
    expect(left!.alphaAt({ x: 40, y: 0 })).toBe(1);
    expect(right!.label).toBeUndefined();
    expect(right!.alphaAt({ x: 160, y: 0 })).toBe(0);
  });

  it('le cadre touche le bout du tronçon par son bord', () => {
    expect(splitLabelFrame({ x: 40, y: 0 }, { x: 1, y: 0 }, 30, 10)).toEqual({ x: 55, y: 0 });
    expect(splitLabelFrame({ x: 0, y: 40 }, { x: 0, y: 1 }, 30, 10)).toEqual({ x: 0, y: 45 });
  });
});

describe('rendu et clic', () => {
  const ctx: RenderContext = { text: { create: () => new Object3D() } };
  const edge = (style: Record<string, string>): EdgeModel =>
    ({
      id: 'e',
      label: '',
      labels: [],
      labelPlacement: { position: 0, distance: 0, offset: { x: 0, y: 0 } },
      style: { endArrow: 'none', ...style },
      points: [],
      sourcePoint: { x: 0, y: 0 },
      targetPoint: { x: 200, y: 0 },
      visible: true,
      layerId: '1',
      z: 1,
    }) as unknown as EdgeModel;

  it('deux tronçons à opacité par sommet, le tracé complet gardé pour la sélection', () => {
    const group = createEdge(edge({ split: '1' }), {}, ctx);
    const strokes = group.children.filter((c): c is Mesh => c instanceof Mesh && c.name === 'stroke');
    expect(strokes).toHaveLength(2);
    const alphas = (strokes[0]!.geometry as BufferGeometry).getAttribute('color');
    expect(alphas.itemSize).toBe(4);
    expect(group.userData.splitPaths).toHaveLength(2);
    expect(group.userData.path).toHaveLength(2);
  });

  it('un texte de renvoi pose un cadre', () => {
    const group = createEdge(edge({ split: '1', splitLabelRight: 'depuis A' }), {}, ctx);
    expect(group.children.filter((c) => c.name === 'split-label')).toHaveLength(1);
  });

  it('non sélectionnée, seule la partie dessinée se clique', () => {
    const model = edge({ split: '1' });
    const page = { shapes: [], edges: [model], layers: [] } as unknown as PageModel;
    const options = {
      edgeTolerance: 3,
      edgeRoute: () => line,
      edgePieces: () => splitPieces(line, model.style, DEFAULT_EDGE_SPLIT).map((piece) => piece.points),
    };
    expect(pickElement(page, { x: 100, y: 0 }, options)).toBeUndefined();
    expect(pickElement(page, { x: 10, y: 0 }, options)?.element.id).toBe('e');
    expect(pickElement(page, { x: 100, y: 0 }, { ...options, edgePieces: () => undefined })?.element.id).toBe('e');
  });

  it('survol (ticket 224) : tronçons et cadre épaissis de 1 px, ligne directe entre les coupures, au-dessus', () => {
    const group = createEdge(edge({ split: '1', splitLabelRight: 'depuis A' }), {}, ctx);
    const hover = group.userData.splitHover as SplitHover;
    // Bouts coupés (ticket 225) : fin du tronçon de départ ; côté arrivée, bord du cadre tourné vers le départ.
    const [from, to] = hover.ends;
    expect(from).toEqual({ x: 40, y: 0 });
    const frameWidth = hover.frames[0]![1]!.x - hover.frames[0]![0]!.x;
    expect(to!.x).toBeCloseTo(160 - frameWidth);
    expect(to!.y).toBeCloseTo(0);
    expect(hover.frames).toHaveLength(1);
    const overlay = splitHoverOverlay(hover, 2);
    // Deux tronçons, le bord du cadre, la ligne directe.
    expect(overlay.children).toHaveLength(4);
    overlay.traverse((o) => expect(o.renderOrder).toBe(Number.MAX_SAFE_INTEGER));
  });
});
