import { describe, expect, it } from 'vitest';
import { addEdgeCell, removeCellsDeep, setCellLink, setCellWrapperAttribute } from '../../../src/engine/format/create';
import { commentOf } from '../../../src/engine/edit/comment';
import { resizeCell, setCellLabel, textToHtml } from '../../../src/engine/format/cellEdits';
import { readDrawio } from '../../../src/engine/format/parse';
import { writeDrawio } from '../../../src/engine/format/write';
import { fixture } from '../../helpers';

const load = (name: string) => readDrawio(fixture(name)).tree;
const reread = (tree: ReturnType<typeof load>) => readDrawio(writeDrawio(tree)).document.pages[0]!;

describe('resizeCell', () => {
  it('seuls les attributs qui changent sont réécrits', () => {
    const tree = load('three-rectangles.drawio');
    resizeCell(tree.pages[0]!, 'c', { x: -20, y: 0, width: 40, height: 0 });
    expect(writeDrawio(tree)).toContain('<mxGeometry x="120" y="180" width="160" height="60" as="geometry"/>');
    expect(reread(tree).shapes.find((s) => s.id === 'c')!.bounds).toEqual({ x: 120, y: 180, width: 160, height: 60 });
  });
});

describe('setCellLabel', () => {
  it('html=1 : texte échappé, retours à la ligne en <br>', () => {
    expect(textToHtml('a < b & c\nd')).toBe('a &lt; b &amp; c<br>d');
    const tree = load('three-rectangles.drawio');
    setCellLabel(tree.pages[0]!, 'a', 'Service\n<A> & co');
    expect(reread(tree).shapes.find((s) => s.id === 'a')!.label).toBe('Service\n<A> & co');
  });

  it('sans html : texte brut ; enveloppe : attribut label', () => {
    const tree = load('roundtrip.drawio');
    const page = tree.pages[0]!;
    setCellLabel(page, 'o1', 'Nouveau');
    expect(page.cells.get('o1')!.wrapper!.getAttribute('label')).toBe('Nouveau');
    const plain = readDrawio(
      '<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
        '<mxCell id="v" value="x" style="rounded=1;" vertex="1" parent="1"><mxGeometry width="10" height="10" as="geometry"/></mxCell>' +
        '</root></mxGraphModel></diagram></mxfile>',
    ).tree;
    setCellLabel(plain.pages[0]!, 'v', 'a < b');
    expect(plain.pages[0]!.cells.get('v')!.cell!.getAttribute('value')).toBe('a < b');
  });
});

describe('setCellLink', () => {
  it('enveloppe une cellule dans un <UserObject> (id et label repris), comme draw.io', () => {
    const tree = load('three-rectangles.drawio');
    setCellLink(tree.pages[0]!, 'b', 'data:page/id,autre');
    const xml = writeDrawio(tree);
    expect(xml).toContain('<UserObject label="B" id="b" link="data:page/id,autre"><mxCell style=');
    const shape = reread(tree).shapes.find((s) => s.id === 'b')!;
    expect(shape).toMatchObject({ label: 'B', link: { type: 'page', pageId: 'autre' }, layerId: '1' });
    // Les arêtes vers « b » restent reliées.
    expect(reread(tree).edges.find((e) => e.id === 'ab')!.targetId).toBe('b');
  });

  it('retirer le lien garde l’enveloppe ; sans enveloppe ni lien, rien ne change', () => {
    const tree = load('three-rectangles.drawio');
    const page = tree.pages[0]!;
    setCellLink(page, 'a', undefined);
    expect(page.dirty).toBe(false);
    setCellLink(page, 'a', 'https://example.com');
    setCellLink(page, 'a', undefined);
    expect(page.cells.get('a')!.wrapper!.hasAttribute('link')).toBe(false);
  });
});

describe('commentaire (étape 188)', () => {
  it('attribut tooltip de l’enveloppe, sur plusieurs lignes ; vide = retiré', () => {
    const tree = load('three-rectangles.drawio');
    const page = tree.pages[0]!;
    setCellWrapperAttribute(page, 'ab', 'tooltip', 'Appel HTTP\nsynchrone');
    expect(writeDrawio(tree)).toMatch(/<UserObject label="[^"]*" id="ab" tooltip="Appel HTTP&#10;synchrone">/);
    const edge = reread(tree).edges.find((e) => e.id === 'ab')!;
    expect(commentOf(edge)).toEqual({ text: 'Appel HTTP\nsynchrone' });
    expect(edge).toMatchObject({ sourceId: 'a', targetId: 'b' });
    setCellWrapperAttribute(page, 'ab', 'tooltip', undefined);
    expect(commentOf(reread(tree).edges.find((e) => e.id === 'ab')!)).toBeUndefined();
  });
});

describe('commentaire mis en forme (étape 191)', () => {
  it('HTML marqué par spatial.commentHtml ; sans la marque, un « < » reste du texte', () => {
    const tree = load('three-rectangles.drawio');
    const page = tree.pages[0]!;
    setCellWrapperAttribute(page, 'a', 'tooltip', 'Délai <b>2 s</b>');
    setCellWrapperAttribute(page, 'a', 'spatial.commentHtml', '1');
    setCellWrapperAttribute(page, 'b', 'tooltip', 'a <b> c');
    const shapes = reread(tree).shapes;
    expect(commentOf(shapes.find((s) => s.id === 'a')!)).toEqual({ text: 'Délai 2 s', html: 'Délai <b>2 s</b>' });
    expect(commentOf(shapes.find((s) => s.id === 'b')!)).toEqual({ text: 'a <b> c' });
  });
});

describe('addEdgeCell', () => {
  it('connecteur entre deux formes, sur le calque', () => {
    const tree = load('three-rectangles.drawio');
    const id = addEdgeCell(tree.pages[0]!, { source: 'c', target: 'a', style: 'edgeStyle=orthogonalEdgeStyle;' });
    expect(reread(tree).edges.find((e) => e.id === id)).toMatchObject({ sourceId: 'c', targetId: 'a', layerId: '1' });
    expect(() => addEdgeCell(tree.pages[0]!, { source: 'c', target: 'nope', style: '' })).toThrow();
  });
});

describe('removeCellsDeep', () => {
  it('une forme part avec les arêtes qui y sont reliées', () => {
    const tree = load('three-rectangles.drawio');
    removeCellsDeep(tree.pages[0]!, ['a']);
    const page = reread(tree);
    expect(page.shapes.map((s) => s.id)).toEqual(['b', 'c']);
    expect(page.edges).toEqual([]);
  });

  it('un conteneur part avec son contenu ; une arête avec ses labels', () => {
    const tree = load('groups.drawio');
    removeCellsDeep(tree.pages[0]!, ['lane']);
    const ids = reread(tree).shapes.map((s) => s.id);
    for (const id of ['lane', 'lane-a', 'lane-b', 'port']) expect(ids).not.toContain(id);

    const rt = load('roundtrip.drawio');
    removeCellsDeep(rt.pages[0]!, ['e1']);
    expect(rt.pages[0]!.cells.has('e1-label')).toBe(false);
    expect(rt.pages[0]!.cells.has('u1')).toBe(true);
  });
});
