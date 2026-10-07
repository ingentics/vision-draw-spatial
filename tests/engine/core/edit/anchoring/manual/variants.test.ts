import { describe, expect, it } from 'vitest';
import {
  nextPlacementVariant,
  placementVariants,
} from '../../../../../../src/engine/core/edit/anchoring/manual/variants';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import type { PageModel } from '../../../../../../src/engine/core/model/types';

const shape = (id: string, x: number, y: number, w = 100, h = 60) =>
  `<mxCell id="${id}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`;
const edge = (id: string, source: string, target: string, style = 'edgeStyle=orthogonalEdgeStyle;') =>
  `<mxCell id="${id}" edge="1" parent="1" source="${source}" target="${target}" style="${style}"><mxGeometry relative="1" as="geometry"/></mxCell>`;

function page(cells: string[]): PageModel {
  const xml =
    '<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
    cells.join('') +
    '</root></mxGraphModel></diagram></mxfile>';
  return readDrawio(xml).document.pages[0]!;
}

/** Applique une variante au modèle, comme le moteur l'écrit dans le fichier. */
function apply(p: PageModel, id: string, v: { exit: { x: number; y: number }; entry: { x: number; y: number } }) {
  const e = p.edges.find((x) => x.id === id)!;
  Object.assign(e.style, {
    exitX: String(v.exit.x),
    exitY: String(v.exit.y),
    exitDx: '0',
    exitDy: '0',
    entryX: String(v.entry.x),
    entryY: String(v.entry.y),
    entryDx: '0',
    entryDy: '0',
  });
}

describe('placementVariants', () => {
  it('deux formes côte à côte : 16 couples, le meilleur part de la droite vers la gauche', () => {
    const p = page([shape('a', 0, 0), shape('b', 300, 0), edge('e', 'a', 'b')]);
    const variants = placementVariants(p, 'e');
    expect(variants).toHaveLength(16);
    expect(variants[0]!.sides).toEqual(['e', 'w']);
    expect(variants[0]).toMatchObject({ exit: { x: 1, y: 0.5 }, entry: { x: 0, y: 0.5 }, points: [] });
    // Rangées du meilleur au moins bon.
    for (let i = 1; i < variants.length; i++) expect(variants[i]!.score).toBeGreaterThanOrEqual(variants[i - 1]!.score);
  });

  it('une forme entre les deux : les placements qui la traversent passent en dernier', () => {
    const p = page([shape('a', 0, 0), shape('b', 400, 0), shape('w', 180, 10, 60, 40), edge('e', 'a', 'b')]);
    const variants = placementVariants(p, 'e');
    expect(variants[0]!.sides).not.toEqual(['e', 'w']);
    expect(variants[0]!.score).toBeLessThan(100000);
    expect(variants.find((v) => v.sides[0] === 'e' && v.sides[1] === 'w')!.score).toBeGreaterThanOrEqual(100000);
  });

  it('point d’ancrage libre : une autre flèche au milieu de la droite, la variante part à 0,25 ou 0,75', () => {
    const taken = 'edgeStyle=orthogonalEdgeStyle;exitX=1;exitY=0.5;exitDx=0;exitDy=0;';
    const p = page([
      shape('a', 0, 0),
      shape('b', 300, 0),
      shape('c', 300, 200),
      edge('f', 'a', 'c', taken),
      edge('e', 'a', 'b'),
    ]);
    const best = placementVariants(p, 'e').find((v) => v.sides[0] === 'e')!;
    expect(best.exit.x).toBe(1);
    expect([0.25, 0.75]).toContain(best.exit.y);
  });

  it('boucle : l’arrivée n’est pas le départ, coudes hors de la forme', () => {
    const p = page([shape('a', 0, 0), edge('e', 'a', 'a')]);
    const variants = placementVariants(p, 'e');
    expect(variants.length).toBeGreaterThan(0);
    for (const v of variants) {
      expect(v.exit).not.toEqual(v.entry);
      expect(v.points.length).toBeGreaterThan(0);
    }
  });
});

describe('nextPlacementVariant', () => {
  it('appuis successifs : la meilleure, puis les suivantes dans l’ordre, en boucle', () => {
    const p = page([shape('a', 0, 0), shape('b', 300, 0), edge('e', 'a', 'b')]);
    const ranked = placementVariants(p, 'e');
    const seen: string[] = [];
    for (let i = 0; i < ranked.length + 1; i++) {
      const v = nextPlacementVariant(p, 'e')!;
      seen.push(v.sides.join(''));
      apply(p, 'e', v);
    }
    expect(seen.slice(0, ranked.length)).toEqual(ranked.map((v) => v.sides.join('')));
    expect(seen[ranked.length]).toBe(seen[0]);
  });
});
