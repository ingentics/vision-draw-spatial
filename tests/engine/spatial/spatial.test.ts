import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { setCellObjectAttribute, setCellStyleValue } from '../../../src/engine/format/cellEdits';
import { parseDrawio, readDrawio } from '../../../src/engine/format/parse';
import { VIEW_ATTRIBUTE } from '../../../src/engine/format/viewState';
import { writeDrawio } from '../../../src/engine/format/write';
import type { PageModel } from '../../../src/engine/model/types';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import { createDefaultRegistry } from '../../../src/engine/shapes/registry';
import type { RenderContext } from '../../../src/engine/render/types';
import { SPATIAL, spatialAttributes, spatialNumber, spatialValue } from '../../../src/engine/spatial';
import { fixture } from '../../helpers';

const element = (page: PageModel, id: string) => [...page.shapes, ...page.edges].find((e) => e.id === id)!;

describe('lecture des attributs spatiaux (SPEC §14.3)', () => {
  const page = readDrawio(fixture('spatial.drawio')).document.pages[0]!;

  it('dans le style ou en attribut de l’objet', () => {
    expect(spatialNumber(element(page, 'socle'), SPATIAL.height)).toBe(40);
    expect(spatialNumber(element(page, 'objet'), SPATIAL.height)).toBe(60);
    expect(spatialNumber(element(page, 'flotte'), SPATIAL.elevation)).toBe(50);
    expect(spatialNumber(element(page, 'pose'), SPATIAL.height)).toBeUndefined();
  });

  it('le style l’emporte ; valeurs négatives ou invalides ignorées', () => {
    const both = { style: { [SPATIAL.height]: '5' }, attributes: { [SPATIAL.height]: '9' } };
    expect(spatialValue(both, SPATIAL.height)).toBe('5');
    expect(spatialNumber({ style: { [SPATIAL.height]: '-3' }, attributes: {} }, SPATIAL.height)).toBeUndefined();
    expect(spatialNumber({ style: { [SPATIAL.height]: 'abc' }, attributes: {} }, SPATIAL.height)).toBeUndefined();
  });

  it('spatial.kind impose la forme (style ou objet), sinon elle est devinée du style (étape 66)', () => {
    const xml = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="style" value="" style="shape=note;spatial.kind=cylinder3;" vertex="1" parent="1"><mxGeometry width="60" height="80" as="geometry"/></mxCell>
      <object id="objet" label="" spatial.kind="datastore"><mxCell style="ellipse;" vertex="1" parent="1"><mxGeometry width="60" height="60" as="geometry"/></mxCell></object>
      <mxCell id="vide" value="" style="ellipse;spatial.kind=;" vertex="1" parent="1"><mxGeometry width="60" height="60" as="geometry"/></mxCell>
      <mxCell id="devinee" value="" style="shape=note;" vertex="1" parent="1"><mxGeometry width="60" height="60" as="geometry"/></mxCell>
    </root></mxGraphModel></diagram></mxfile>`;
    const shapes = parseDrawio(xml).pages[0]!.shapes;
    const kind = (id: string) => shapes.find((s) => s.id === id)?.kind;
    expect([kind('style'), kind('objet'), kind('vide'), kind('devinee')]).toEqual([
      'cylinder3',
      'datastore',
      'ellipse',
      'note',
    ]);
    const registry = createDefaultRegistry();
    expect(registry.resolve(shapes.find((s) => s.id === 'style')!).supported).toBe(true);
  });

  it('liste tous les attributs préfixés, connus ou non', () => {
    expect(spatialAttributes(element(page, 'objet'))).toEqual({ 'spatial.height': '60', 'spatial.note': 'garder' });
    expect(spatialAttributes(element(page, 'lien'))).toEqual({ 'spatial.custom': '1' });
  });
});

describe('rendu iso', () => {
  const ctx: RenderContext = { text: { create: () => new Object3D() }, volume: { depth: 20 } };
  const page = readDrawio(fixture('spatial.drawio')).document.pages[0]!;
  const root = buildPageScene(page, createDefaultRegistry(), ctx, 'iso').root;
  const object = (id: string) => root.children.find((c) => c.userData.elementId === id)!;

  it('épaisseur propre (style ou objet), sinon le réglage', () => {
    expect(object('socle').userData.top).toBe(40);
    expect(object('objet').userData.top).toBe(60);
  });

  it('une forme contenue est posée sur son conteneur ; spatial.elevation la fait flotter', () => {
    expect(object('pose').position.z).toBe(40);
    expect(object('flotte').position.z).toBe(50);
    expect(object('flotte').userData.top).toBe(60);
  });
});

describe('écriture en place', () => {
  it('setCellStyleValue : modifie, ajoute ou retire une clé sans toucher au reste', () => {
    const { tree } = readDrawio(fixture('spatial.drawio'));
    const page = tree.pages[0]!;
    const style = (id: string) => page.cells.get(id)!.cell!.getAttribute('style');
    setCellStyleValue(page, 'socle', SPATIAL.height, '25');
    expect(style('socle')).toBe(
      'rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;spatial.height=25;',
    );
    setCellStyleValue(page, 'pose', SPATIAL.elevation, '8');
    expect(style('pose')).toBe('rounded=1;whiteSpace=wrap;html=1;spatial.elevation=8;');
    setCellStyleValue(page, 'flotte', SPATIAL.elevation, undefined);
    expect(style('flotte')).toBe(
      'ellipse;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;spatial.height=10;',
    );
  });

  it('setCellObjectAttribute : sur l’objet s’il existe, sinon refusé', () => {
    const { tree } = readDrawio(fixture('spatial.drawio'));
    const page = tree.pages[0]!;
    expect(setCellObjectAttribute(page, 'objet', SPATIAL.height, '70')).toBe(true);
    expect(setCellObjectAttribute(page, 'socle', SPATIAL.height, '70')).toBe(false);
    expect(readDrawio(writeDrawio(tree)).document.pages[0]!.shapes.find((s) => s.id === 'objet')!.attributes).toEqual({
      'spatial.height': '70',
      'spatial.note': 'garder',
    });
  });
});

/**
 * Fichiers réenregistrés par draw.io (`tests/fixtures/drawio-saved/`, produits par `make drawio-check`) :
 * attributs spatiaux, clés de style propres à l'appli, état de vue et géométries identiques à l'original.
 */
const SAVED = readdirSync(fileURLToPath(new URL('../../fixtures/drawio-saved/', import.meta.url)))
  .filter((name) => !name.endsWith('.svg'))
  .sort();

describe('conservation par draw.io', () => {
  it.each(SAVED)('%s', (name) => {
    const original = readDrawio(fixture(name));
    const saved = readDrawio(fixture(`drawio-saved/${name}`));
    expect(saved.document.pages.map((p) => [p.id, p.name])).toEqual(original.document.pages.map((p) => [p.id, p.name]));
    saved.tree.pages.forEach((page, index) => {
      expect(page.diagram?.getAttribute(VIEW_ATTRIBUTE)).toBe(
        original.tree.pages[index]!.diagram?.getAttribute(VIEW_ATTRIBUTE),
      );
    });
    // Attributs spatiaux des pages (`spatial.mode`, `spatial.flows`…, sujet 69).
    expect(saved.document.pages.map((p) => p.attributes)).toEqual(original.document.pages.map((p) => p.attributes));
    original.document.pages.forEach((page, index) => {
      const after = saved.document.pages[index]!;
      for (const before of [...page.shapes, ...page.edges]) {
        const kept = element(after, before.id);
        expect(spatialAttributes(kept), `${page.id}/${before.id}`).toEqual(spatialAttributes(before));
        // Clés propres à l'appli dans le style (ex. `fitText`, étape 57), inconnues de draw.io.
        expect(kept.style.fitText, `${page.id}/${before.id}`).toBe(before.style.fitText);
        // Flèche coupée (ticket 219) : draw.io garde ses clés et dessine la flèche entière.
        for (const key of ['split', 'splitLabelLeft', 'splitLabelRight']) {
          expect(kept.style[key], `${page.id}/${before.id} ${key}`).toBe(before.style[key]);
        }
        if ('bounds' in before) expect((kept as typeof before).bounds).toEqual(before.bounds);
      }
    });
  });
});
