import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../../src/engine/core/format/parse';
import { distanceToPolyline, pickElement, shapeContains } from '../../../../src/engine/core/interaction/pick';
import { insidePolygon } from '../../../../src/engine/core/model/geometry';
import type { ShapeModel } from '../../../../src/engine/core/model/types';
import { fixture } from '../../../helpers';
import { defaultShapeRegistry } from '../../../../src/engine/plugins';

const options = (routes: Record<string, { x: number; y: number }[]> = {}) => ({
  edgeTolerance: 4,
  edgeRoute: (id: string) => routes[id],
  contains: (shape: ShapeModel, point: { x: number; y: number }) => defaultShapeRegistry.contains(shape, point),
  pickable: (shape: ShapeModel) => defaultShapeRegistry.isPickable(shape),
});

describe('pickElement', () => {
  const groups = parseDrawio(fixture('groups.drawio')).pages[0]!;

  it('l’enfant passe avant son conteneur, le conteneur reste attrapable ailleurs', () => {
    expect(pickElement(groups, { x: 150, y: 160 }, options())?.element.id).toBe('lane-a');
    expect(pickElement(groups, { x: 250, y: 250 }, options())?.element.id).toBe('lane');
  });

  it('les groupes invisibles sans lien ne sont pas attrapés', () => {
    // Dans g-outer mais hors de « deep » : rien.
    expect(pickElement(groups, { x: 200, y: 380 }, options())).toBeUndefined();
    expect(pickElement(groups, { x: 70, y: 320 }, options())?.element.id).toBe('deep');
  });

  it('ellipse : les coins de sa boîte ne comptent pas', () => {
    const simple = parseDrawio(fixture('simple.drawio')).pages[0]!;
    expect(pickElement(simple, { x: 80, y: 220 }, options())?.element.id).toBe('e1');
    expect(pickElement(simple, { x: 42, y: 182 }, options())).toBeUndefined();
  });

  it('volume (iso) : se prend sur ses côtés, du dessus à la base, pas au-delà (étape 160)', () => {
    const simple = parseDrawio(fixture('simple.drawio')).pages[0]!;
    const page = { ...simple, shapes: simple.shapes.filter((s) => s.id === 'e1'), edges: [] };
    const { x, y, width, height } = page.shapes[0]!.bounds;
    // Le point visé avance en y avec la hauteur : au dessus (h = 40), 40 plus bas qu'à la base.
    const iso = (screenY: number) => ({
      ...options(),
      heightOf: () => 40,
      baseOf: () => 0,
      pointAtHeight: (h: number) => ({ x: x + width / 2, y: screenY + h }),
    });
    const side = y + height - 10; // dessus visé hors de la forme, base dedans : le côté du volume
    expect(pickElement(page, { x: 0, y: 0 }, iso(side))?.element.id).toBe('e1');
    expect(pickElement(page, { x: 0, y: 0 }, { ...iso(side), baseOf: undefined })).toBeUndefined();
    expect(pickElement(page, { x: 0, y: 0 }, iso(y + height + 5))).toBeUndefined();
  });

  it('volumes qui se chevauchent : le plus proche de la caméra gagne, l’ordre de dessin à hauteur égale (étape 161)', () => {
    const simple = parseDrawio(fixture('simple.drawio')).pages[0]!;
    const r1 = simple.shapes.find((s) => s.id === 'r1')!;
    // « front » dessiné avant « back », mais plus haut et devant lui sur le rayon.
    const front = { ...r1, id: 'front', z: 1, bounds: { x: 0, y: 120, width: 100, height: 100 } };
    const back = { ...r1, id: 'back', z: 2, bounds: { x: 0, y: 0, width: 100, height: 100 } };
    const page = { ...simple, shapes: [front, back], edges: [] };
    const iso = (tops: Record<string, number>) => ({
      ...options(),
      heightOf: (id: string) => tops[id] ?? 0,
      baseOf: () => 0,
      pointAtHeight: (h: number) => ({ x: 50, y: 85 + h }),
    });
    // Rayon : dessus de « front » visé en y = 125, dessus de « back » en y = 95 : les deux sont touchés.
    expect(pickElement(page, { x: 0, y: 0 }, iso({ front: 40, back: 10 }))?.element.id).toBe('front');
    expect(pickElement(page, { x: 0, y: 0 }, iso({ front: 10, back: 40 }))?.element.id).toBe('back');
    // Même hauteur (à plat) : l’ordre de dessin.
    expect(
      pickElement({ ...page, shapes: [{ ...front, bounds: back.bounds }, back] }, { x: 50, y: 50 }, options())?.element
        .id,
    ).toBe('back');
  });

  it('arêtes : à distance de tolérance de leur tracé, au-dessus des formes dessinées avant', () => {
    const page = parseDrawio(fixture('drawio-desktop.drawio')).pages[0]!;
    const edgeId = 'Fs-0jHc4KjceeW8xsn6R-4';
    const routes = {
      [edgeId]: [
        { x: 180, y: 280 },
        { x: 180, y: 440 },
        { x: 280, y: 440 },
      ],
    };
    expect(pickElement(page, { x: 183, y: 350 }, options(routes))?.element.id).toBe(edgeId);
    expect(pickElement(page, { x: 190, y: 350 }, options(routes))).toBeUndefined();
  });

  it('calques cachés et éléments invisibles ignorés', () => {
    const layers = parseDrawio(fixture('layers.drawio')).pages[0]!;
    expect(pickElement(layers, { x: 110, y: 10 }, options())).toBeUndefined(); // calque caché
    expect(pickElement(layers, { x: 10, y: 110 }, options())).toBeUndefined(); // forme cachée
    expect(pickElement(layers, { x: 10, y: 10 }, options())?.element.id).toBe('base-shape');
  });
});

describe('distanceToPolyline', () => {
  it('distance au segment le plus proche, extrémités comprises', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(distanceToPolyline({ x: 5, y: 3 }, line)).toBe(3);
    expect(distanceToPolyline({ x: 13, y: 4 }, line)).toBe(5);
  });
});

describe('shapeContains : contour réel', () => {
  const diamond = {
    kind: 'rhombus',
    bounds: { x: 0, y: 0, width: 80, height: 80 },
    style: {},
  } as unknown as ShapeModel;
  const outline = [
    { x: 40, y: 0 },
    { x: 80, y: 40 },
    { x: 40, y: 80 },
    { x: 0, y: 40 },
  ];

  it('un coin vide du losange ne se clique pas', () => {
    const contains = (_shape: ShapeModel, p: { x: number; y: number }) => insidePolygon(outline, p);
    expect(shapeContains(diamond, { x: 5, y: 5 }, contains)).toBe(false);
    expect(shapeContains(diamond, { x: 40, y: 40 }, contains)).toBe(true);
    expect(shapeContains(diamond, { x: 20, y: 20 }, contains)).toBe(true); // sur le bord
  });

  it('le registre répond avec la définition de la forme (contour du losange)', () => {
    const contains = (shape: ShapeModel, p: { x: number; y: number }) => defaultShapeRegistry.contains(shape, p);
    expect(shapeContains(diamond, { x: 5, y: 5 }, contains)).toBe(false);
    expect(shapeContains(diamond, { x: 40, y: 40 }, contains)).toBe(true);
  });

  it('sans contour : les bornes', () => {
    expect(shapeContains(diamond, { x: 5, y: 5 })).toBe(true);
  });
});
