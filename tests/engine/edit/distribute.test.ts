import { describe, expect, it } from 'vitest';
import { affectedShapes, distributeAnchors, facingSide, pageGeometry } from '../../../src/engine/edit/distribute';
import { readDrawio } from '../../../src/engine/format/parse';

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
