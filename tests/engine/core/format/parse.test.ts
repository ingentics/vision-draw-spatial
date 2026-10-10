import { describe, expect, it } from 'vitest';
import { DrawioParseError, parseDrawio, shapeFromStyle } from '../../../../src/engine/core/format/parse';
import type { PageModel } from '../../../../src/engine/core/model/types';
import { fixture } from '../../../helpers';

const shape = (page: PageModel, id: string) => {
  const found = page.shapes.find((s) => s.id === id);
  if (!found) throw new Error(`forme ${id} absente`);
  return found;
};
const edge = (page: PageModel, id: string) => {
  const found = page.edges.find((e) => e.id === id);
  if (!found) throw new Error(`arête ${id} absente`);
  return found;
};

describe('parseDrawio — simple.drawio', () => {
  const doc = parseDrawio(fixture('simple.drawio'));
  const page = doc.pages[0]!;

  it('lit la page, son calque et ses éléments', () => {
    expect(doc.warnings).toEqual([]);
    expect(doc.pages).toHaveLength(1);
    expect(page).toMatchObject({ id: 'simple-page', name: 'Architecture' });
    expect(page.layers).toEqual([{ id: '1', name: '', visible: true }]);
    expect(page.shapes.map((s) => s.id)).toEqual(['r1', 'r2', 'e1', 't1', 'c1', 'plain']);
    expect(page.edges.map((e) => e.id)).toEqual(['a1', 'a2', 'a3']);
  });

  it('formes : kind, bounds, style, label', () => {
    expect(shape(page, 'r1')).toEqual({
      id: 'r1',
      kind: 'rectangle',
      bounds: { x: 40, y: 40, width: 120, height: 60 },
      label: 'Service A',
      style: { rounded: '0', whiteSpace: 'wrap', html: '1', fillColor: '#dae8fc', strokeColor: '#6c8ebf' },
      layerId: '1',
      visible: true,
      z: 2,
      attributes: {},
      raw: { styleString: 'rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;' },
    });
    expect(shape(page, 'r2')).toMatchObject({ kind: 'rectangle', label: 'Service\nB & co', style: { rounded: '1' } });
    expect(shape(page, 'e1').kind).toBe('ellipse');
    expect(shape(page, 't1').kind).toBe('text');
    expect(shape(page, 'c1').kind).toBe('cylinder3');
  });

  it('label non HTML conservé tel quel (sauts de ligne compris)', () => {
    expect(shape(page, 'plain').label).toBe('Ligne 1\nLigne 2');
  });

  it('arêtes : extrémités, points, placement du label', () => {
    expect(edge(page, 'a1')).toMatchObject({
      sourceId: 'r1',
      targetId: 'r2',
      label: 'appelle',
      points: [
        { x: 200, y: 70 },
        { x: 200, y: 20 },
      ],
      labelPlacement: { position: 0.2, distance: -10, offset: { x: 3, y: 4 } },
      style: { endArrow: 'classic', strokeWidth: '2' },
    });
    expect(edge(page, 'a3')).toMatchObject({
      sourcePoint: { x: 20, y: 300 },
      targetPoint: { x: 500, y: 320 },
      points: [],
    });
    expect(edge(page, 'a3')).not.toHaveProperty('sourceId');
  });

  it('les labels enfants d’arête sont rattachés à l’arête, pas aux formes', () => {
    expect(page.shapes.find((s) => s.id === 'a2-label')).toBeUndefined();
    expect(edge(page, 'a2').labels).toEqual([
      {
        id: 'a2-label',
        label: 'lit',
        placement: { position: -0.5, distance: 2, offset: { x: 1, y: -1 } },
        style: { align: 'center', html: '1' },
      },
    ]);
  });

  it('z commun aux formes et arêtes, dans l’ordre du document', () => {
    const all = [...page.shapes, ...page.edges].sort((a, b) => a.z - b.z).map((e) => e.id);
    expect(all).toEqual(['r1', 'r2', 'e1', 't1', 'c1', 'plain', 'a1', 'a2', 'a3']);
  });

  it('emprise de la page (formes + points d’arêtes)', () => {
    expect(page.bounds).toEqual({ x: 20, y: 20, width: 480, height: 300 });
  });
});

describe('parseDrawio — compressed.drawio', () => {
  it('donne exactement le même modèle que la version en clair', () => {
    expect(parseDrawio(fixture('compressed.drawio'))).toEqual(parseDrawio(fixture('simple.drawio')));
  });
});

describe('parseDrawio — multipage.drawio', () => {
  const doc = parseDrawio(fixture('multipage.drawio'));

  it('lit toutes les pages dans l’ordre, en clair, compressées ou vides', () => {
    expect(doc.warnings).toEqual([]);
    expect(doc.pages.map((p) => [p.id, p.name, p.shapes.length])).toEqual([
      ['p1', "Vue d'ensemble", 1],
      ['p2', 'Détails', 1],
      ['p3', 'Vide', 0],
    ]);
  });

  it('préserve l’unicode des pages compressées', () => {
    expect(doc.pages[1]!.shapes[0]).toMatchObject({
      label: 'Détails é€ 🚀',
      bounds: { x: 10, y: 20, width: 30, height: 40 },
    });
  });

  it('page vide : emprise nulle', () => {
    expect(doc.pages[2]!.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe('parseDrawio — groups.drawio', () => {
  const doc = parseDrawio(fixture('groups.drawio'));
  const page = doc.pages[0]!;

  it('cumule les offsets dans un conteneur', () => {
    expect(shape(page, 'lane')).toMatchObject({
      kind: 'swimlane',
      bounds: { x: 100, y: 100, width: 300, height: 200 },
    });
    expect(shape(page, 'lane-a')).toMatchObject({
      parentId: 'lane',
      bounds: { x: 120, y: 140, width: 80, height: 40 },
    });
    expect(shape(page, 'lane-b').bounds).toEqual({ x: 280, y: 140, width: 80, height: 40 });
  });

  it('cumule les offsets dans des groupes imbriqués', () => {
    expect(shape(page, 'g-outer')).toMatchObject({ kind: 'group' });
    expect(shape(page, 'g-inner')).toMatchObject({
      parentId: 'g-outer',
      bounds: { x: 60, y: 310, width: 100, height: 50 },
    });
    expect(shape(page, 'deep')).toMatchObject({
      parentId: 'g-inner',
      layerId: '1',
      bounds: { x: 65, y: 315, width: 60, height: 30 },
    });
  });

  it('géométrie relative au parent (port)', () => {
    // lane-a = 120,140 80x40 → bord droit x=200, milieu y=160, puis offset -5,-5.
    expect(shape(page, 'port').bounds).toEqual({ x: 195, y: 155, width: 10, height: 10 });
  });

  it('points d’arête relatifs au conteneur parent', () => {
    expect(edge(page, 'lane-edge')).toMatchObject({ parentId: 'lane', points: [{ x: 240, y: 160 }] });
  });

  it('parent manquant : forme gardée en coordonnées de page, avertissement émis', () => {
    expect(shape(page, 'orphan').bounds).toEqual({ x: 500, y: 500, width: 10, height: 10 });
    expect(shape(page, 'orphan')).not.toHaveProperty('parentId');
    expect(doc.warnings).toEqual([{ pageId: 'groups', cellId: 'orphan', message: 'Parent introuvable : nope' }]);
  });
});

describe('parseDrawio — links.drawio', () => {
  const doc = parseDrawio(fixture('links.drawio'));
  const [home, detail] = doc.pages as [PageModel, PageModel];

  it('liens vers une page, depuis une forme ou une arête', () => {
    expect(shape(home, 'to-detail')).toMatchObject({
      label: 'Voir le détail',
      link: { type: 'page', pageId: 'detail' },
    });
    expect(edge(home, 'edge-link')).toMatchObject({
      link: { type: 'page', pageId: 'detail' },
      sourceId: 'to-detail',
      targetId: 'ext',
    });
    expect(shape(detail, 'to-home').link).toEqual({ type: 'page', pageId: 'home' });
  });

  it('lien URL, attributs personnalisés et placeholders', () => {
    expect(shape(home, 'ext')).toMatchObject({
      kind: 'ellipse',
      label: 'Docs v2 (100%)',
      link: { type: 'url', href: 'https://example.com/docs' },
      attributes: { name: 'Docs', version: '2', tooltip: 'Documentation' },
    });
  });

  it('les actions draw.io ne sont pas des liens', () => {
    expect(shape(home, 'action')).not.toHaveProperty('link');
  });

  it('signale les liens vers une page absente sans les supprimer', () => {
    expect(shape(home, 'broken-link').link).toEqual({ type: 'page', pageId: 'missing' });
    expect(doc.warnings).toEqual([
      { pageId: 'home', cellId: 'broken-link', message: 'Lien vers une page absente : missing' },
    ]);
  });
});

describe('parseDrawio — layers.drawio', () => {
  const page = parseDrawio(fixture('layers.drawio')).pages[0]!;

  it('liste les calques avec leur visibilité', () => {
    expect(page.layers).toEqual([
      { id: '1', name: '', visible: true },
      { id: 'annotations', name: 'Annotations', visible: false },
    ]);
  });

  it('rattache chaque forme à son calque, et lit sa visibilité propre', () => {
    expect(shape(page, 'base-shape')).toMatchObject({ layerId: '1', visible: true });
    expect(shape(page, 'note')).toMatchObject({ layerId: 'annotations', visible: true });
    expect(shape(page, 'hidden')).toMatchObject({ layerId: '1', visible: false });
  });
});

describe('parseDrawio — robustesse', () => {
  it('une page corrompue devient une page vide avec avertissement', () => {
    const doc = parseDrawio(fixture('broken.drawio'));
    expect(doc.pages.map((p) => [p.id, p.shapes.length])).toEqual([
      ['bad', 0],
      ['bad2', 0],
      ['good', 1],
    ]);
    expect(doc.warnings.map((w) => w.pageId)).toEqual(['bad', 'bad2']);
    expect(doc.warnings[0]!.message).toMatch(/^Page illisible/);
  });

  it('lit l’ancien format <mxGraphModel> nu', () => {
    const doc = parseDrawio(fixture('legacy.xml'));
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0]!.shapes[0]).toMatchObject({ id: 'old', kind: 'rectangle', label: 'Ancien format' });
  });

  it('un fichier sans id de page reçoit des ids et noms par défaut', () => {
    const doc = parseDrawio('<mxfile><diagram><mxGraphModel><root/></mxGraphModel></diagram></mxfile>');
    expect(doc.pages[0]).toMatchObject({ id: 'page-1', name: 'Page-1' });
  });

  it('XML invalide ou racine inconnue → DrawioParseError', () => {
    expect(() => parseDrawio('<mxfile><diagram>')).toThrow(DrawioParseError);
    expect(() => parseDrawio('pas du xml')).toThrow(DrawioParseError);
    expect(() => parseDrawio('pas du xml')).toThrow(/^XML invalide \(missing root element\)$/);
    expect(() => parseDrawio('<html></html>')).toThrow(DrawioParseError);
  });

  it('cycle de parents : pas de boucle infinie', () => {
    const xml = `<mxfile><diagram id="p"><mxGraphModel><root>
      <mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="a" vertex="1" parent="b"><mxGeometry x="1" y="1" width="1" height="1" as="geometry"/></mxCell>
      <mxCell id="b" vertex="1" parent="a"><mxGeometry x="2" y="2" width="1" height="1" as="geometry"/></mxCell>
    </root></mxGraphModel></diagram></mxfile>`;
    const doc = parseDrawio(xml);
    expect(doc.pages[0]!.shapes).toHaveLength(2);
    expect(doc.warnings.some((w) => w.message.includes('Cycle'))).toBe(true);
  });
});

describe('parseDrawio — drawio-desktop.drawio (fichier réel, draw.io 24.7.5)', () => {
  const doc = parseDrawio(fixture('drawio-desktop.drawio'));
  const page = doc.pages[0]!;
  const [a, b, c] = ['Fs-0jHc4KjceeW8xsn6R-1', 'Fs-0jHc4KjceeW8xsn6R-2', 'Fs-0jHc4KjceeW8xsn6R-3'];

  it('lit les trois rectangles et l’arête', () => {
    expect(doc.warnings).toEqual([]);
    expect(page).toMatchObject({ id: 'nlMxE8x7PYVuFraO-RRH', name: 'Page-1' });
    expect(page.shapes.map((s) => [s.label, s.kind, s.bounds])).toEqual([
      ['A', 'rectangle', { x: 120, y: 200, width: 120, height: 80 }],
      ['B', 'rectangle', { x: 440, y: 200, width: 120, height: 80 }],
      ['C', 'rectangle', { x: 280, y: 400, width: 120, height: 80 }],
    ]);
    expect(shape(page, a).style.dashed).toBe('1');
    expect(shape(page, b).style).toMatchObject({ fillColor: '#f8cecc', strokeColor: '#b85450' });
  });

  it('arête orthogonale A → C, dessinée sous les formes', () => {
    const e = edge(page, 'Fs-0jHc4KjceeW8xsn6R-4');
    expect(e).toMatchObject({ sourceId: a, targetId: c, points: [] });
    expect(e.style).toMatchObject({
      edgeStyle: 'orthogonalEdgeStyle',
      exitX: '0.5',
      exitY: '1',
      entryX: '0',
      entryY: '0.5',
    });
    expect(e.z).toBeLessThan(Math.min(...page.shapes.map((s) => s.z)));
  });

  it('emprise de la page', () => {
    expect(page.bounds).toEqual({ x: 120, y: 200, width: 440, height: 280 });
  });
});

describe('shapeFromStyle (sujet 481)', () => {
  it('forme d’un style sans l’écrire : kind imposé par spatial.kind, sinon déduit du style', () => {
    const bounds = { x: 10, y: 20, width: 160, height: 160 };
    const sticky = shapeFromStyle('p', 'rounded=1;fillColor=#64b5f6;spatial.kind=eventstorming-command;', bounds);
    expect(sticky).toMatchObject({ id: 'p', kind: 'eventstorming-command', bounds, label: '' });
    expect(sticky.style.fillColor).toBe('#64b5f6');
    expect(shapeFromStyle('e', 'ellipse;whiteSpace=wrap;', bounds).kind).toBe('ellipse');
  });
});
