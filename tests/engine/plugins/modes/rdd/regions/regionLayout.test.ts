import { describe, expect, it } from 'vitest';
import { documentFromTree, readDrawio } from '../../../../../../src/engine/core/format/parse';
import { applyModeEdit } from '../../../../../../src/engine/core/modes/modeEdits';
import { definition as rdd } from '../../../../../../src/engine/plugins/modes/rdd';
import {
  REGION,
  REGION_COLORS,
  regionContent,
  regionOf,
} from '../../../../../../src/engine/plugins/modes/rdd/regions/regionLayout';
import { addShapeCell } from '../../../../../../src/engine/core/format/create';
import type { ModeEdit } from '../../../../../../src/engine/core/modes/types';
import { setup } from '../helpers';

describe('mode RDD : région (sujet 182)', () => {
  it('contenu : les formes du mode dont le coin haut-gauche est dans la région', () => {
    const { page, shape } = setup();
    expect(regionContent(page(), shape('accounts')).sort()).toEqual(['role', 'user']);
    expect(regionOf(page(), shape('orphan'))).toBeUndefined();
    // Une table n'emporte rien ; le mode déclare le contenu de la région comme emporté.
    expect(regionContent(page(), shape('user'))).toEqual([]);
    expect(rdd.gestures!.carries!(page(), shape('accounts')).sort()).toEqual(['role', 'user']);
  });

  it('régions imbriquées : une forme appartient à la plus petite, la grande emporte tout', () => {
    const { document } = readDrawio(`<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
      <mxCell id="0" /><mxCell id="1" parent="0" />
      <mxCell id="big" value="" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="500" as="geometry" /></mxCell>
      <mxCell id="small" value="" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="200" as="geometry" /></mxCell>
      <mxCell id="twin" value="" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="200" as="geometry" /></mxCell>
      <mxCell id="inner" value="" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="150" y="150" width="160" height="46" as="geometry" /></mxCell>
      <mxCell id="outer" value="" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="350" y="350" width="160" height="46" as="geometry" /></mxCell>
      <mxCell id="note" value="" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="20" y="20" width="40" height="40" as="geometry" /></mxCell>
    </root></mxGraphModel></diagram></mxfile>`);
    const page = document.pages[0]!;
    const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
    // Deux régions au même coin et de même taille (sujet 231) : celle de devant (twin) est dans celle de derrière ; la
    // table va à la plus imbriquée.
    expect(regionOf(page, shape('inner'))?.id).toBe('twin');
    expect(regionOf(page, shape('small'))?.id).toBe('big');
    expect(regionOf(page, shape('twin'))?.id).toBe('small');
    // Une forme hors du mode n'est jamais contenue.
    expect(regionOf(page, shape('note'))).toBeUndefined();
    expect(regionContent(page, shape('small')).sort()).toEqual(['inner', 'twin']);
    expect(regionContent(page, shape('big')).sort()).toEqual(['inner', 'outer', 'small', 'twin']);
  });
});

describe('mode RDD : la région s’étend quand on y pose une forme qui dépasse (sujet 183)', () => {
  const xml = `<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
    <mxCell id="0" /><mxCell id="1" parent="0" />
    <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="300" as="geometry" /></mxCell>
    <mxCell id="small" value="Small" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="150" as="geometry" /></mxCell>
    <mxCell id="t" value="T" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="150" y="120" width="160" height="46" as="geometry" /></mxCell>
    <mxCell id="note" value="" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="450" y="250" width="100" height="100" as="geometry" /></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;
  const setupPage = () => {
    const { document, tree } = readDrawio(xml);
    let page = document.pages[0]!;
    const run = (operation: (edit: ModeEdit) => void) => {
      const changed = applyModeEdit(page, tree.pages[0]!, operation);
      page = documentFromTree(tree).pages[0]!;
      return changed;
    };
    const bounds = (id: string) => page.shapes.find((s) => s.id === id)!.bounds;
    const place = (id: string, x: number, y: number) => {
      run((edit) => edit.setShapeBounds(id, { ...bounds(id), x, y }));
      return run((edit) => rdd.gestures!.placed!(edit, [id]));
    };
    /** Déplacement : le mode reçoit aussi la page d'avant (sujet 234). */
    const move = (id: string, x: number, y: number) => {
      const before = page;
      run((edit) => edit.setShapeBounds(id, { ...bounds(id), x, y }));
      return run((edit) => rdd.gestures!.placed!(edit, [id], before));
    };
    const resize = (id: string, width: number, height: number) =>
      run((edit) => edit.setShapeBounds(id, { ...bounds(id), width, height }));
    return { bounds, place, move, resize };
  };

  it('la région s’agrandit vers la droite et le bas, 20 px de marge ; sa région englobante suit', () => {
    const { bounds, place } = setupPage();
    expect(REGION.margin).toBe(20);
    // T dépasse à droite de Small (310 > 300) : Small va jusqu'à 330.
    expect(place('t', 150, 120)).toBe(true);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 230, height: 150 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 500, height: 300 });
    // Coin toujours dans Small, plus bas et à droite : Small passe à 400 × 206 et dépasse Big par le bas, qui
    // s'agrandit à son tour (marge autour de Small).
    place('t', 320, 240);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 400, height: 206 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 520, height: 326 });
    // Coin hors de Small mais dans Big : seule Big s'agrandit.
    place('t', 510, 320);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 400, height: 206 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 690, height: 386 });
  });

  it('une région aussi grande que sa parente y est dès que son coin y est, et l’agrandit (sujet 231)', () => {
    const { bounds, place, resize } = setupPage();
    resize('small', 500, 300);
    // Small, de la taille de Big, posée en mordant sur son bord : son coin est dans Big, qui s'agrandit.
    expect(place('small', 300, 200)).toBe(true);
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 820, height: 520 });
  });

  it('une région posée qui dépasse de sa région parente l’agrandit, comme une table (sujet 231)', () => {
    const { bounds, place } = setupPage();
    // Small (200 × 150) posée à (400, 200) : son coin est dans Big, elle en dépasse à droite et en bas.
    expect(place('small', 400, 200)).toBe(true);
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 620, height: 370 });
    expect(bounds('small')).toEqual({ x: 400, y: 200, width: 200, height: 150 });
  });

  it('sortie par la gauche ou le haut en chevauchant sa région : la région s’agrandit de ce côté (sujet 234)', () => {
    const { bounds, move } = setupPage();
    // T (160 × 46) dans Small (100, 100, 200 × 150) tirée à (80, 90) : coin hors de Small mais dans Big, qui englobe
    // Small ; elle chevauche encore Small, qui s'agrandit à gauche et en haut (marge comprise), pas à droite.
    expect(move('t', 80, 90)).toBe(true);
    expect(bounds('small')).toEqual({ x: 60, y: 70, width: 240, height: 180 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 500, height: 300 });
    // Small sortie à son tour par le haut de Big : Big s'agrandit vers le haut, au-dessus de l'onglet de Small
    // (sujet 237), marge comprise.
    expect(move('small', 60, -10)).toBe(true);
    expect(bounds('big')).toEqual({ x: 0, y: -46, width: 500, height: 346 });
  });

  it('tirée complètement hors de sa région, la forme en sort : rien ne s’agrandit (sujet 234)', () => {
    const { bounds, move } = setupPage();
    expect(move('t', 600, 400)).toBe(false);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 200, height: 150 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 500, height: 300 });
  });

  it('ni rétrécie ni changée si la forme tient ; une forme hors du mode ou hors région ne change rien', () => {
    const { bounds, place } = setupPage();
    expect(place('t', 110, 110)).toBe(false);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 200, height: 150 });
    expect(place('note', 450, 250)).toBe(false);
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 500, height: 300 });
    expect(place('t', 700, 700)).toBe(false);
  });
});

describe('mode RDD : le contenu d’une région est devant elle (sujet 230)', () => {
  it('à la pose, les régions passent au fond, les plus englobantes derrière ; draw.io garde l’ordre', () => {
    // Ordre du fichier à l'envers : la table, puis la petite région, puis la grande.
    const xml = `<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
      <mxCell id="0" /><mxCell id="1" parent="0" />
      <mxCell id="t" value="T" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="150" y="120" width="100" height="46" as="geometry" /></mxCell>
      <mxCell id="small" value="Small" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="150" as="geometry" /></mxCell>
      <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="300" as="geometry" /></mxCell>
      <mxCell id="other" value="Other" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="600" y="0" width="100" height="100" as="geometry" /></mxCell>
    </root></mxGraphModel></diagram></mxfile>`;
    const { document, tree } = readDrawio(xml);
    const page = document.pages[0]!;
    expect(applyModeEdit(page, tree.pages[0]!, (edit) => rdd.gestures!.placed!(edit, ['t']))).toBe(true);
    const order = () => documentFromTree(tree).pages[0]!.shapes.map((s) => s.id);
    expect(order()).toEqual(['big', 'other', 'small', 't']);
    // Déjà en ordre : rien ne change.
    const again = documentFromTree(tree).pages[0]!;
    expect(applyModeEdit(again, tree.pages[0]!, (edit) => rdd.gestures!.placed!(edit, ['t']))).toBe(false);
    expect(order()).toEqual(['big', 'other', 'small', 't']);
  });
});

describe('mode RDD : ajuster une région à son contenu, touche « f » (sujet 184)', () => {
  it('trop grande puis trop petite : ramenée autour de ses tables avec 20 px de marge ; vide : inchangée', () => {
    const { run, page, shape } = setup();
    const key = rdd.keys!.f!;
    expect(key.label).toBe('Ajuster la région');
    expect(key.applies(page(), shape('accounts'))).toBe(true);
    expect(key.applies(page(), shape('user'))).toBe(false);
    // Comptes contient User (40, 160, 160 × 86) et Role (240, 160, 160 × 86).
    const fitted = { x: 20, y: 140, width: 400, height: 126 };
    run((edit) => edit.setShapeBounds('accounts', { x: 10, y: 120, width: 425, height: 170 }));
    run((edit) => key.run(edit, shape('accounts'), undefined));
    expect(shape('accounts').bounds).toEqual(fitted);
    run((edit) => edit.setShapeBounds('accounts', { x: 20, y: 140, width: 250, height: 110 }));
    run((edit) => key.run(edit, shape('accounts'), undefined));
    expect(shape('accounts').bounds).toEqual(fitted);
    // Région vide : rien ne change.
    run((edit) => edit.setShapeBounds('accounts', { x: 900, y: 900, width: 100, height: 100 }));
    expect(run((edit) => key.run(edit, shape('accounts'), undefined))).toBe(false);
    expect(shape('accounts').bounds).toEqual({ x: 900, y: 900, width: 100, height: 100 });
  });
});

describe('mode RDD : l’onglet d’une région enfant compte dans sa parente (sujet 237)', () => {
  const xml = `<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
    <mxCell id="0" /><mxCell id="1" parent="0" />
    <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="300" as="geometry" /></mxCell>
    <mxCell id="small" value="Small" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="80" as="geometry" /></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;

  it('« f » sur une région qui ne contient qu’une région : 20 px au-dessus de l’onglet de l’enfant', () => {
    const { document, tree } = readDrawio(xml);
    const page = document.pages[0]!;
    const big = page.shapes.find((s) => s.id === 'big')!;
    applyModeEdit(page, tree.pages[0]!, (edit) => rdd.keys!.f!.run(edit, big, undefined));
    const bounds = documentFromTree(tree).pages[0]!.shapes.find((s) => s.id === 'big')!.bounds;
    expect(bounds).toEqual({ x: 80, y: 100 - REGION.tab.height - 20, width: 240, height: 80 + REGION.tab.height + 40 });
  });

  it('une région posée en sortant par le haut agrandit sa parente au-dessus de son onglet', () => {
    const { document, tree } = readDrawio(xml);
    let page = document.pages[0]!;
    const before = page;
    applyModeEdit(page, tree.pages[0]!, (edit) =>
      edit.setShapeBounds('small', { x: 100, y: 5, width: 200, height: 80 }),
    );
    page = documentFromTree(tree).pages[0]!;
    applyModeEdit(page, tree.pages[0]!, (edit) => rdd.gestures!.placed!(edit, ['small'], before));
    const bounds = documentFromTree(tree).pages[0]!.shapes.find((s) => s.id === 'big')!.bounds;
    expect(bounds.y).toBe(5 - REGION.tab.height - 20);
  });
});

describe('mode RDD : couleur d’une région neuve selon ses sœurs (sujet 236)', () => {
  it('rose, lavande, bleu… modulo la palette ; dans une région, comptée parmi ses propres sœurs', () => {
    const { tree } = readDrawio(`<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
      <mxCell id="0" /><mxCell id="1" parent="0" /></root></mxGraphModel></diagram></mxfile>`);
    const pageTree = tree.pages[0]!;
    /** Ajout depuis la palette : la cellule, puis le mode (sans page d'avant). */
    const add = (x: number, y: number, width = 200, height = 80) => {
      const id = addShapeCell(pageTree, { style: 'spatial.kind=rdd-region;', value: 'R', x, y, width, height });
      applyModeEdit(documentFromTree(tree).pages[0]!, pageTree, (edit) => rdd.gestures!.placed!(edit, [id]));
      return id;
    };
    const colorOf = (id: string) => documentFromTree(tree).pages[0]!.shapes.find((s) => s.id === id)!.style.fillColor;
    const top = [0, 1, 2, 3, 4, 5, 6].map((i) => add(i * 1000, 0, 800, 600));
    expect(top.map(colorOf)).toEqual([...REGION_COLORS, REGION_COLORS[0]]);
    // Dans la première région : premier de son niveau, rose ; la suivante, lavande.
    const inner = [add(20, 20), add(20, 200)];
    expect(inner.map(colorOf)).toEqual([REGION_COLORS[0], REGION_COLORS[1]]);
    // Un déplacement ne change pas la couleur.
    const page = documentFromTree(tree).pages[0]!;
    applyModeEdit(page, pageTree, (edit) => rdd.gestures!.placed!(edit, [inner[1]!], page));
    expect(colorOf(inner[1]!)).toBe(REGION_COLORS[1]);
  });
});

describe('mode RDD : règles des régions au redimensionnement, à l’ajustement et au collage (sujet 239)', () => {
  const xml = `<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
    <mxCell id="0" /><mxCell id="1" parent="0" />
    <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="300" as="geometry" /></mxCell>
    <mxCell id="small" value="Small" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="80" as="geometry" /></mxCell>
    <mxCell id="t" value="T" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="120" y="120" width="160" height="46" as="geometry" /></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;
  const setupPage = () => {
    const { document, tree } = readDrawio(xml);
    let page = document.pages[0]!;
    const run = (operation: (edit: ModeEdit) => void) => {
      const changed = applyModeEdit(page, tree.pages[0]!, operation);
      page = documentFromTree(tree).pages[0]!;
      return changed;
    };
    const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
    return { run, shape, tree, page: () => page };
  };

  it('redimensionnement : un enfant agrandi au-delà de sa parente l’agrandit, contenu en place', () => {
    const { run, shape, page } = setupPage();
    const before = page();
    run((edit) => edit.setShapeBounds('small', { x: 100, y: 100, width: 500, height: 250 }));
    expect(run((edit) => rdd.gestures!.placed!(edit, ['small'], before))).toBe(true);
    expect(shape('big').bounds).toEqual({ x: 0, y: 0, width: 620, height: 370 });
    expect(shape('t').bounds).toEqual({ x: 120, y: 120, width: 160, height: 46 });
  });

  it('« f » sur une sous-région : elle, puis sa parente, ajustées à leur contenu (grandir ou rétrécir)', () => {
    const { run, shape } = setupPage();
    // T déborde de Small vers la droite et le bas ; Big est juste assez grande pour Small.
    run((edit) => edit.setShapeBounds('t', { x: 120, y: 120, width: 400, height: 200 }));
    run((edit) => edit.setShapeBounds('big', { x: 0, y: 0, width: 320, height: 200 }));
    run((edit) => rdd.keys!.f!.run(edit, shape('small'), undefined));
    const small = { x: 100, y: 100, width: 440, height: 240 };
    expect(shape('small').bounds).toEqual(small);
    // Big autour de Small et de son onglet, 20 px de marge.
    const tab = REGION.tab.height;
    expect(shape('big').bounds).toEqual({ x: 80, y: 100 - tab - 20, width: 480, height: 240 + tab + 40 });
    // Big trop grande : « f » sur Small la ramène aussi autour de Small.
    run((edit) => edit.setShapeBounds('big', { x: -200, y: -200, width: 1200, height: 900 }));
    run((edit) => rdd.keys!.f!.run(edit, shape('small'), undefined));
    expect(shape('big').bounds).toEqual({ x: 80, y: 100 - tab - 20, width: 480, height: 240 + tab + 40 });
  });

  it('collage de deux régions : chacune la couleur suivante de son niveau', () => {
    const { tree } = setupPage();
    const pageTree = tree.pages[0]!;
    const a = addShapeCell(pageTree, {
      style: 'spatial.kind=rdd-region;',
      value: 'A',
      x: 1000,
      y: 0,
      width: 200,
      height: 80,
    });
    const b = addShapeCell(pageTree, {
      style: 'spatial.kind=rdd-region;',
      value: 'B',
      x: 1300,
      y: 0,
      width: 200,
      height: 80,
    });
    applyModeEdit(documentFromTree(tree).pages[0]!, pageTree, (edit) => rdd.gestures!.placed!(edit, [a, b]));
    const colorOf = (id: string) => documentFromTree(tree).pages[0]!.shapes.find((s) => s.id === id)!.style.fillColor;
    // Big est la seule région de premier niveau déjà là.
    expect([colorOf(a), colorOf(b)]).toEqual([REGION_COLORS[1], REGION_COLORS[2]]);
  });
});

describe('mode RDD : une région ne passe pas sur ses sœurs (sujet 241)', () => {
  it('obstacles d’une région : ses sœurs, onglet compris ; ni sa parente ni son contenu', () => {
    const { document } = readDrawio(`<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
      <mxCell id="0" /><mxCell id="1" parent="0" />
      <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="800" height="400" as="geometry" /></mxCell>
      <mxCell id="a" value="A" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="20" y="40" width="200" height="80" as="geometry" /></mxCell>
      <mxCell id="b" value="B" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="300" y="40" width="200" height="80" as="geometry" /></mxCell>
      <mxCell id="inner" value="" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="30" y="60" width="50" height="40" as="geometry" /></mxCell>
      <mxCell id="other" value="O" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="1000" y="0" width="200" height="80" as="geometry" /></mxCell>
      <mxCell id="t" value="T" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="300" y="200" width="160" height="46" as="geometry" /></mxCell>
    </root></mxGraphModel></diagram></mxfile>`);
    const page = document.pages[0]!;
    const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
    const found = rdd.gestures!.obstacles!(page, shape('a'), { obstacleGap: 12 })!;
    // B, sa sœur dans Big, onglet compris ; ni Big (parente), ni Inner (son contenu), ni Other (autre niveau).
    expect(found.rects).toEqual([
      { id: 'b', rect: { x: 300, y: 40 - REGION.tab.height, width: 200, height: 80 + REGION.tab.height } },
    ]);
    expect(found.above).toBe(REGION.tab.height);
    // Écart : le réglage du mode (ticket 283).
    expect(found.gap).toBe(12);
    // Premier niveau : Big et Other sont sœurs.
    expect(rdd.gestures!.obstacles!(page, shape('big'), { obstacleGap: 12 })!.rects.map((r) => r.id)).toEqual([
      'other',
    ]);
    // Une table n'est pas bornée.
    expect(rdd.gestures!.obstacles!(page, shape('t'), { obstacleGap: 12 })).toBeUndefined();
  });
});
