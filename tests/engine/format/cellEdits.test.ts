import { describe, expect, it } from 'vitest';
import {
  canMoveCell,
  formatNumber,
  gridSizeOf,
  moveCell,
  moveEdgeCell,
  setPageAttribute,
} from '../../../src/engine/format/cellEdits';
import { readDrawio } from '../../../src/engine/format/parse';
import { writeDrawio } from '../../../src/engine/format/write';
import { parseXml } from '../../../src/engine/format/xmlTree';
import { fixture } from '../../helpers';

describe('moveCell', () => {
  it('critère SPEC §14.4 : trois rectangles déplacés, seuls leurs x / y changent', () => {
    const xml = fixture('three-rectangles.drawio');
    const { tree } = readDrawio(xml);
    const page = tree.pages[0]!;
    moveCell(page, 'a', { x: 100, y: 0 });
    moveCell(page, 'b', { x: -40, y: 60 });
    moveCell(page, 'c', { x: 0, y: 200 });
    const written = writeDrawio(tree);

    // Même texte que l'original, à part les trois géométries (et l'écriture `/>` du sérialiseur).
    const expected = xml
      .trimEnd()
      .replace('<mxGeometry x="40" y="40" width="120"', '<mxGeometry x="140" y="40" width="120"')
      .replace('<mxGeometry x="240" y="40" width="120"', '<mxGeometry x="200" y="100" width="120"')
      .replace('<mxGeometry x="140" y="180" width="120"', '<mxGeometry x="140" y="380" width="120"')
      .replace(/ \/>/g, '/>');
    expect(written).toBe(expected);

    const shapes = readDrawio(written).document.pages[0]!.shapes;
    expect(shapes.map((s) => [s.id, s.bounds.x, s.bounds.y])).toEqual([
      ['a', 140, 40],
      ['b', 200, 100],
      ['c', 140, 380],
    ]);
  });

  it('page compressée : marquée modifiée, réécrite compressée', () => {
    const { tree } = readDrawio(fixture('compressed.drawio'));
    const page = tree.pages[0]!;
    moveCell(page, 'r1', { x: 5, y: 0 });
    expect(page.dirty).toBe(true);
    expect(readDrawio(writeDrawio(tree)).document.pages[0]!.shapes.find((s) => s.id === 'r1')!.bounds.x).toBe(45);
  });

  it('attribut absent = 0 ; revenir à 0 retire l’attribut', () => {
    const { tree } = readDrawio(
      '<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
        '<mxCell id="v" vertex="1" parent="1"><mxGeometry width="10" height="10" as="geometry"/></mxCell>' +
        '</root></mxGraphModel></diagram></mxfile>',
    );
    const page = tree.pages[0]!;
    moveCell(page, 'v', { x: 12.345, y: 0 });
    expect(page.cells.get('v')!.geometry!.getAttribute('x')).toBe('12.35');
    expect(page.cells.get('v')!.geometry!.hasAttribute('y')).toBe(false);
    moveCell(page, 'v', { x: -12.35, y: 0 });
    expect(page.cells.get('v')!.geometry!.hasAttribute('x')).toBe(false);
  });

  it('refuse une géométrie relative (port)', () => {
    const page = readDrawio(fixture('groups.drawio')).tree.pages[0]!;
    expect(canMoveCell(page, 'port')).toBe(false);
    expect(canMoveCell(page, 'lane')).toBe(true);
    expect(() => moveCell(page, 'port', { x: 1, y: 1 })).toThrow();
  });
});

describe('gridSizeOf', () => {
  const page = (attributes: string) =>
    readDrawio(`<mxfile><diagram id="p"><mxGraphModel ${attributes}><root/></mxGraphModel></diagram></mxfile>`).tree
      .pages[0]!;

  it('lit la grille de la page (10 par défaut), 0 si désactivée', () => {
    expect(gridSizeOf(page('grid="1" gridSize="20"'))).toBe(20);
    expect(gridSizeOf(page(''))).toBe(10);
    expect(gridSizeOf(page('grid="0" gridSize="20"'))).toBe(0);
  });
});

describe('formatNumber', () => {
  it('entiers tels quels, deux décimales au plus', () => {
    expect(formatNumber(40)).toBe('40');
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(-3.14159)).toBe('-3.14');
  });
});

describe('XML écrit', () => {
  it('reste un XML valide', () => {
    const { tree } = readDrawio(fixture('three-rectangles.drawio'));
    moveCell(tree.pages[0]!, 'a', { x: 10, y: 10 });
    expect(() => parseXml(writeDrawio(tree))).not.toThrow();
  });
});

describe('moveEdgeCell', () => {
  it('décale points intermédiaires et extrémités libres, comme mxGeometry.translate', () => {
    const { tree } = readDrawio(
      '<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
        '<mxCell id="e" edge="1" parent="1"><mxGeometry relative="1" as="geometry">' +
        '<mxPoint x="10" y="20" as="sourcePoint"/><mxPoint as="targetPoint"/>' +
        '<Array as="points"><mxPoint x="50" y="60"/></Array><mxPoint x="3" y="4" as="offset"/>' +
        '</mxGeometry></mxCell></root></mxGraphModel></diagram></mxfile>',
    );
    moveEdgeCell(tree.pages[0]!, 'e', { x: 5, y: -10 });
    const edge = readDrawio(writeDrawio(tree)).document.pages[0]!.edges[0]!;
    expect(edge.sourcePoint).toEqual({ x: 15, y: 10 });
    expect(edge.targetPoint).toEqual({ x: 5, y: -10 });
    expect(edge.points).toEqual([{ x: 55, y: 50 }]);
    expect(writeDrawio(tree)).toContain('<mxPoint x="3" y="4" as="offset"/>');
  });
});

describe('setPageAttribute (modes de page, sujet 69)', () => {
  it('écrit et retire un attribut de <diagram> sans toucher au contenu, même compressé', () => {
    const xml = fixture('compressed.drawio');
    const { tree } = readDrawio(xml);
    const page = tree.pages[0]!;
    expect(setPageAttribute(page, 'spatial.mode', 'sequences')).toBe(true);
    expect(page.dirty).toBe(false);
    const written = readDrawio(writeDrawio(tree));
    expect(written.document.pages[0]!.attributes['spatial.mode']).toBe('sequences');
    setPageAttribute(written.tree.pages[0]!, 'spatial.mode', undefined);
    expect(writeDrawio(written.tree).trimEnd()).toBe(writeDrawio(readDrawio(xml).tree).trimEnd());
  });

  it('ancien format (sans <diagram>) : rien n’est écrit', () => {
    const { tree } = readDrawio(fixture('legacy.xml'));
    expect(setPageAttribute(tree.pages[0]!, 'spatial.mode', 'sequences')).toBe(false);
  });
});
