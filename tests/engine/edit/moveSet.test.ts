import { describe, expect, it } from 'vitest';
import {
  collectMoveSet,
  isLocked,
  moveTarget,
  snapDelta,
  translateMoveSet,
  unionMoveSets,
} from '../../../src/engine/edit/moveSet';
import { parseDrawio } from '../../../src/engine/format/parse';
import type { PageModel } from '../../../src/engine/model/types';
import { defaultShapeRegistry } from '../../../src/engine/shapes/registry';
import { fixture } from '../../helpers';

const shape = (page: PageModel, id: string) => page.shapes.find((s) => s.id === id)!;

describe('moveTarget', () => {
  const page = parseDrawio(fixture('groups.drawio')).pages[0]!;

  it('une forme dans un groupe déplace le groupe le plus externe', () => {
    expect(moveTarget(page, shape(page, 'deep'), defaultShapeRegistry).id).toBe('g-outer');
  });

  it('une forme dans un conteneur (swimlane) se déplace seule', () => {
    expect(moveTarget(page, shape(page, 'lane-a'), defaultShapeRegistry).id).toBe('lane-a');
  });
});

describe('collectMoveSet', () => {
  const page = parseDrawio(fixture('groups.drawio')).pages[0]!;

  it('un conteneur entraîne ses descendants et les arêtes qu’il contient', () => {
    const set = collectMoveSet(page, 'lane');
    expect([...set.shapeIds].sort()).toEqual(['lane', 'lane-a', 'lane-b', 'port']);
    expect([...set.edgeIds]).toEqual(['lane-edge']);
    expect(set.connectedEdgeIds.size).toBe(0);
  });

  it('une arête seulement reliée est à retracer, pas à déplacer', () => {
    const set = collectMoveSet(parseDrawio(fixture('three-rectangles.drawio')).pages[0]!, 'a');
    expect([...set.edgeIds]).toEqual([]);
    expect([...set.connectedEdgeIds]).toEqual(['ab']);
  });
});

describe('translateMoveSet', () => {
  it('déplace la forme, ses descendants et l’emprise de la page', () => {
    const page = parseDrawio(fixture('groups.drawio')).pages[0]!;
    const before = { ...shape(page, 'port').bounds };
    translateMoveSet(page, collectMoveSet(page, 'lane'), { x: 10, y: -20 });
    expect(shape(page, 'lane').bounds).toMatchObject({ x: 110, y: 80 });
    expect(shape(page, 'lane-a').bounds).toMatchObject({ x: 130, y: 120 });
    expect(shape(page, 'port').bounds).toEqual({ ...before, x: before.x + 10, y: before.y - 20 });
    expect(shape(page, 'deep').bounds).toMatchObject({ x: 65, y: 315 }); // hors du conteneur : immobile
  });

  it('les points des arêtes contenues suivent', () => {
    const page = parseDrawio(fixture('roundtrip.drawio')).pages[0]!;
    const edge = page.edges.find((e) => e.id === 'e1')!;
    const points = edge.points.map((p) => ({ ...p }));
    translateMoveSet(
      page,
      { rootId: 'x', shapeIds: new Set(), edgeIds: new Set(['e1']), connectedEdgeIds: new Set() },
      { x: 5, y: 5 },
    );
    expect(edge.points).toEqual(points.map((p) => ({ x: p.x + 5, y: p.y + 5 })));
  });
});

describe('snapDelta', () => {
  it('aimante le coin haut-gauche à la grille', () => {
    expect(snapDelta({ x: 40, y: 40, width: 10, height: 10 }, { x: 13, y: -6 }, 10)).toEqual({ x: 10, y: -10 });
    expect(snapDelta({ x: 43, y: 40, width: 10, height: 10 }, { x: 0, y: 0 }, 10)).toEqual({ x: -3, y: 0 });
  });

  it('sans grille : arrondi au pixel', () => {
    expect(snapDelta({ x: 0, y: 0, width: 1, height: 1 }, { x: 12.4, y: -3.6 }, 0)).toEqual({ x: 12, y: -4 });
  });
});

describe('isLocked', () => {
  it('movable=0 et locked=1 interdisent le déplacement', () => {
    const page = parseDrawio(fixture('three-rectangles.drawio')).pages[0]!;
    const a = shape(page, 'a');
    expect(isLocked(a)).toBe(false);
    expect(isLocked({ ...a, style: { ...a.style, movable: '0' } })).toBe(true);
    expect(isLocked({ ...a, style: { ...a.style, locked: '1' } })).toBe(true);
  });
});

describe('unionMoveSets (sélection multiple)', () => {
  it('réunit les formes ; une arête reliée aux deux formes déplacées est retracée une fois', () => {
    const page = parseDrawio(fixture('three-rectangles.drawio')).pages[0]!;
    const set = unionMoveSets([collectMoveSet(page, 'a'), collectMoveSet(page, 'b')]);
    expect(set.rootId).toBe('a');
    expect([...set.shapeIds].sort()).toEqual(['a', 'b']);
    expect([...set.connectedEdgeIds]).toEqual(['ab']);
  });

  it('une arête contenue dans une forme déplacée n’est pas seulement retracée', () => {
    const page = parseDrawio(fixture('groups.drawio')).pages[0]!;
    const set = unionMoveSets([collectMoveSet(page, 'lane'), collectMoveSet(page, 'lane-a')]);
    expect(set.edgeIds.has('lane-edge')).toBe(true);
    expect(set.connectedEdgeIds.has('lane-edge')).toBe(false);
  });
});
