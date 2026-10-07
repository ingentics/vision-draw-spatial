import { describe, expect, it } from 'vitest';
import {
  affectedShapes,
  distributeAnchors,
  endKey,
  facingSide,
  resitedEnds,
} from '../../../../../../src/engine/core/edit/anchoring/auto/distribute';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import { pageGeometry } from '../../../../../../src/engine/core/model/pageGeometry';

const shape = (id: string, x: number, y: number, w = 100, h = 60) =>
  `<mxCell id="${id}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
const edge = (id: string, source: string, target: string, style = '') =>
  `<mxCell id="${id}" edge="1" parent="1" source="${source}" target="${target}" style="${style}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
const TOP = 'entryX=0.5;entryY=0;entryDx=0;entryDy=0;';
const BOTTOM = 'exitX=0.5;exitY=1;exitDx=0;exitDy=0;';

function page(cells: string[]) {
  const xml =
    '<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
    cells.join('') +
    '</root></mxGraphModel></diagram></mxfile>';
  return readDrawio(xml).document.pages[0]!;
}

describe('distributeAnchors', () => {
  it('trois flèches sur le haut d’une forme : 0,25 / 0,5 / 0,75, dans l’ordre de leur départ', () => {
    // Cible en (200, 300) ; sources au-dessus, de droite à gauche dans le fichier.
    const p = page([
      shape('t', 200, 300),
      shape('a', 400, 0),
      shape('b', 0, 0),
      shape('c', 200, 0),
      edge('ea', 'a', 't', TOP),
      edge('eb', 'b', 't', TOP),
      edge('ec', 'c', 't', TOP),
    ]);
    const changes = distributeAnchors(p, new Set(['t']));
    expect(changes).toEqual([
      { edgeId: 'eb', end: 'target', constraint: { x: 0.25, y: 0 } },
      { edgeId: 'ea', end: 'target', constraint: { x: 0.75, y: 0 } },
    ]);
  });

  it('deux flèches : 1/3 et 2/3 ; attache auto rangée sur le côté qui fait face', () => {
    const p = page([
      shape('s', 0, 0),
      shape('l', -100, 200),
      shape('r', 100, 200),
      edge('e1', 's', 'l', BOTTOM),
      edge('e2', 's', 'r'),
    ]);
    expect(distributeAnchors(p, new Set(['s']))).toEqual([
      { edgeId: 'e1', end: 'source', constraint: { x: 0.3333, y: 1 } },
      { edgeId: 'e2', end: 'source', constraint: { x: 0.6667, y: 1 } },
    ]);
  });

  it('deux flèches de la droite d’une forme vers la gauche d’une autre, croisées : remises parallèles', () => {
    const ex = (y: number) => `exitX=1;exitY=${y};exitDx=0;exitDy=0;`;
    const en = (y: number) => `entryX=0;entryY=${y};entryDx=0;entryDy=0;`;
    const p = page([
      shape('a', 0, 0, 100, 120),
      shape('b', 400, 60, 100, 120),
      edge('e1', 'a', 'b', ex(0.3333) + en(0.6667)),
      edge('e2', 'a', 'b', ex(0.6667) + en(0.3333)),
    ]);
    const changes = distributeAnchors(p, new Set(['a', 'b']));
    const at = (id: string, end: 'source' | 'target', initial: number) =>
      changes.find((c) => c.edgeId === id && c.end === end)?.constraint.y ?? initial;
    // Même ordre aux deux bouts : e1 en haut à gauche comme à droite.
    expect(Math.sign(at('e1', 'source', 0.3333) - at('e2', 'source', 0.6667))).toBe(
      Math.sign(at('e1', 'target', 0.6667) - at('e2', 'target', 0.3333)),
    );
    // Stable : une seconde passe ne change rien.
    for (const c of changes) {
      const e = p.edges.find((x) => x.id === c.edgeId)!;
      const prefix = c.end === 'source' ? 'exit' : 'entry';
      e.style[`${prefix}X`] = String(c.constraint.x);
      e.style[`${prefix}Y`] = String(c.constraint.y);
    }
    expect(distributeAnchors(p, new Set(['a', 'b']))).toEqual([]);
  });

  it('faisceau en L (bas → gauche) : emboîté, le départ le plus à droite arrive le plus haut', () => {
    const BOTTOM_TO_LEFT = 'exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;';
    const p = page([
      shape('a', 0, 0, 120, 60),
      shape('b', 300, 200, 100, 120),
      edge('e1', 'a', 'b', BOTTOM_TO_LEFT),
      edge('e2', 'a', 'b', BOTTOM_TO_LEFT),
    ]);
    const changes = distributeAnchors(p, new Set(['a', 'b']));
    const get = (id: string, end: 'source' | 'target') =>
      changes.find((c) => c.edgeId === id && c.end === end)!.constraint;
    const rightmost = get('e1', 'source').x > get('e2', 'source').x ? 'e1' : 'e2';
    const other = rightmost === 'e1' ? 'e2' : 'e1';
    expect(get(rightmost, 'target').y).toBeLessThan(get(other, 'target').y);
  });

  it('facingSide : côté rapporté aux dimensions', () => {
    const b = { x: 0, y: 0, width: 200, height: 40 };
    expect(facingSide(b, { x: 180, y: 100 })).toBe('s');
    expect(facingSide(b, { x: 400, y: 30 })).toBe('e');
    expect(facingSide(b, { x: 100, y: -50 })).toBe('n');
  });
});

describe('affectedShapes', () => {
  it('forme déplacée et ses voisines ; flèche retirée : ses bouts et leurs voisines', () => {
    const before = page([
      shape('a', 0, 0),
      shape('b', 300, 0),
      shape('c', 600, 0),
      edge('e', 'a', 'b'),
      edge('f', 'b', 'c'),
    ]);
    const moved = page([
      shape('a', 0, 50),
      shape('b', 300, 0),
      shape('c', 600, 0),
      edge('e', 'a', 'b'),
      edge('f', 'b', 'c'),
    ]);
    expect([...affectedShapes(pageGeometry(before), moved)].sort()).toEqual(['a', 'b']);
    const removed = page([shape('a', 0, 0), shape('b', 300, 0), shape('c', 600, 0), edge('e', 'a', 'b')]);
    expect([...affectedShapes(pageGeometry(before), removed)].sort()).toEqual(['a', 'b', 'c']);
    expect(affectedShapes(pageGeometry(before), before).size).toBe(0);
  });
});

describe('resitedEnds (ticket 177)', () => {
  // a à gauche de b, flèche de la droite de a vers la gauche de b.
  const RIGHT_TO_LEFT = 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;';
  const before = page([shape('a', 0, 0), shape('b', 300, 0), edge('e', 'a', 'b', RIGHT_TO_LEFT)]);

  it('forme passée de l’autre côté de sa voisine : ses bouts changent de côté', () => {
    const moved = page([shape('a', 600, 0), shape('b', 300, 0), edge('e', 'a', 'b', RIGHT_TO_LEFT)]);
    const resite = resitedEnds(pageGeometry(before), moved);
    expect(resite).toEqual(new Set([endKey('e', 'source'), endKey('e', 'target')]));
    expect(distributeAnchors(moved, new Set(['a', 'b']), 0, resite)).toEqual([
      { edgeId: 'e', end: 'source', constraint: { x: 0, y: 0.5 } },
      { edgeId: 'e', end: 'target', constraint: { x: 1, y: 0.5 } },
    ]);
  });

  it('petit déplacement : le côté choisi est gardé, même s’il ne fait pas face', () => {
    const TOP_TO_TOP = 'exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;';
    const chosen = page([shape('a', 0, 0), shape('b', 300, 0), edge('e', 'a', 'b', TOP_TO_TOP)]);
    const nudged = page([shape('a', 0, 20), shape('b', 300, 0), edge('e', 'a', 'b', TOP_TO_TOP)]);
    expect(resitedEnds(pageGeometry(chosen), nudged).size).toBe(0);
    expect(resitedEnds(undefined, nudged).size).toBe(0);
  });
});
