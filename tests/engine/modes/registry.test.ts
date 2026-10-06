import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../src/engine/format/parse';
import type { PageModel } from '../../../src/engine/model/types';
import { PAGE_MODE_DEFINITIONS, PageModeRegistry } from '../../../src/engine/modes/registry';
import type { PageModeDefinition } from '../../../src/engine/modes/types';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import { Object3D } from 'three';
import { createDefaultRegistry, ShapeRegistry } from '../../../src/engine/shapes/registry';
import { MODE_SHAPE_DEFINITIONS, shapesByMode } from '../../../src/engine/modes/shapes';
import type { ShapeDefinition } from '../../../src/engine/shapes/types';
import { PALETTE_CATEGORIES } from '../../../src/engine/edit/palette';
import { SPATIAL } from '../../../src/engine/spatial';

/** Dossiers des modes : `modes/<id>/index.ts` (moteur) et `app/modes/<id>/index.tsx` (sections React, facultatives). */
const ENGINE = Object.entries(
  import.meta.glob<PageModeDefinition>('../../../src/engine/modes/*/index.ts', { eager: true, import: 'definition' }),
).map(([path, definition]) => ({ folder: path.split('/').at(-2)!, definition }));
const APP = Object.keys(import.meta.glob('../../../src/app/modes/*/index.tsx')).map((path) => path.split('/').at(-2)!);

/** Formes du mode de test, dans son dossier `shapes/` comme un vrai mode. */
const TEST_SHAPES = shapesByMode(
  import.meta.glob<ShapeDefinition>('./fixtures/*/shapes/*/index.ts', { eager: true, import: 'definition' }),
);

const page = (attributes: Record<string, string>) =>
  ({ id: 'p', name: 'P', layers: [], shapes: [], edges: [], attributes }) as unknown as PageModel;

describe('modes de page en plugins (sujet 69)', () => {
  it('un mode par dossier, id = nom du dossier, nom affiché ; la partie appli a son mode moteur', () => {
    expect(ENGINE.map(({ folder }) => folder)).toContain('sequences');
    expect(PAGE_MODE_DEFINITIONS).toHaveLength(ENGINE.length);
    for (const { folder, definition } of ENGINE) {
      expect(definition.id).toBe(folder);
      expect(definition.name.trim()).not.toBe('');
    }
    for (const folder of APP) expect(ENGINE.map((m) => m.folder)).toContain(folder);
  });

  it('un mode de test enregistré : choix, mode d’une page, réglages, collage, habillage du rendu', () => {
    const test: PageModeDefinition = {
      id: 'test',
      name: 'Test',
      edgeProperties: [{ type: 'text', key: 'spatial.test', label: 'Test' }],
      pasteKeys: ['spatial.test'],
      dressing: () => ({ edgeColor: () => '#ff0000', edgeBadge: () => ({ text: 'T', color: '#00ff00' }) }),
    };
    const registry = new PageModeRegistry().register(test);
    expect(registry.list().map((mode) => mode.id)).toEqual(['test']);
    expect(registry.modeOf(page({ [SPATIAL.mode]: 'test' }))).toBe(test);
    expect(registry.modeOf(page({}))).toBeUndefined();
    expect(registry.properties(page({ [SPATIAL.mode]: 'test' }), 'edge').map((p) => p.key)).toEqual(['spatial.test']);
    expect(registry.properties(page({}), 'edge')).toEqual([]);
    expect(registry.pasteKeys()).toEqual(['spatial.test']);

    const xml = `<mxfile><diagram id="p" name="P" spatial.mode="test"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="e" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="0" y="0" as="sourcePoint"/><mxPoint x="100" y="0" as="targetPoint"/></mxGeometry></mxCell>
    </root></mxGraphModel></diagram></mxfile>`;
    const model = readDrawio(xml).document.pages[0]!;
    const ctx = { text: { create: () => new Object3D() } };
    const root = buildPageScene(model, createDefaultRegistry(), ctx, 'flat', registry.dressing(model)).root;
    expect(root.getObjectByName('edge-badge')).toBeDefined();
  });

  it('attributs de la page lus de <diagram> (spatial.* seulement), vides sans <diagram>', () => {
    const { document } = readDrawio(
      `<mxfile><diagram id="p" name="P" spatial.mode="test" autre="x"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>`,
    );
    expect(document.pages[0]!.attributes).toEqual({ 'spatial.mode': 'test' });
    expect(
      readDrawio('<mxGraphModel><root><mxCell id="0"/></root></mxGraphModel>').document.pages[0]!.attributes,
    ).toEqual({});
  });

  it('formes des modes : une par dossier modes/<id>/shapes/<forme>/, id préfixé par celui du mode (sujet 178)', () => {
    expect(TEST_SHAPES.get('test')?.map((shape) => shape.id)).toEqual(['test-box']);
    for (const [modeId, shapes] of MODE_SHAPE_DEFINITIONS) {
      expect(ENGINE.map((m) => m.folder)).toContain(modeId);
      for (const shape of shapes) expect(shape.id.startsWith(`${modeId}-`), shape.id).toBe(true);
    }
    const shapes = new ShapeRegistry();
    for (const shape of TEST_SHAPES.get('test')!) shapes.register(shape);
    expect(shapes.templates().map((t) => t.id)).toEqual(['test-box']);
  });

  describe('palette et modes d’affichage d’un mode (sujet 178)', () => {
    const test: PageModeDefinition = {
      id: 'test',
      name: 'Test',
      shapes: ['rectangle', 'test-box'],
      paletteCategories: [{ id: 'test', name: 'Test', order: 15 }],
      viewModes: ['top'],
    };
    const loose: PageModeDefinition = { id: 'loose', name: 'Libre', paletteCategories: test.paletteCategories };
    const registry = new PageModeRegistry().register(test, TEST_SHAPES.get('test')).register(loose);
    const shapes = createDefaultRegistry();
    for (const shape of TEST_SHAPES.get('test')!) shapes.register(shape);
    const templates = shapes.templates();
    const ids = (attributes: Record<string, string>) => {
      const { categories, templates: shown } = registry.paletteFor(page(attributes), templates);
      return { categories: categories.map((c) => c.id), shapes: shown.map((t) => t.id) };
    };

    it('liste blanche : seules ces formes, dans leurs catégories non vides, rangées par rang', () => {
      expect(ids({ [SPATIAL.mode]: 'test' })).toEqual({
        categories: ['geometry', 'test'],
        shapes: ['rectangle', 'test-box'],
      });
    });

    it('page normale : palette normale, sans les formes des modes ; mode sans liste : formes générales', () => {
      const normal = ids({});
      expect(normal.categories).toEqual(PALETTE_CATEGORIES.map((c) => c.id));
      expect(normal.shapes).not.toContain('test-box');
      expect(normal.shapes).toContain('database');
      const other = ids({ [SPATIAL.mode]: 'loose' });
      expect(other).toEqual(normal);
      expect(registry.paletteFor(undefined, templates).templates.map((t) => t.id)).toEqual(normal.shapes);
    });

    it('modes d’affichage : seul le 2D sur une page du mode, tous ailleurs', () => {
      const modePage = page({ [SPATIAL.mode]: 'test' });
      expect(registry.allowsViewMode(modePage, 'top')).toBe(true);
      expect(registry.allowsViewMode(modePage, 'iso')).toBe(false);
      expect(registry.allowsViewMode(modePage, '3d')).toBe(false);
      expect(registry.viewModeFor(modePage, 'iso')).toBe('top');
      expect(registry.viewModeFor(modePage, 'top')).toBe('top');
      for (const attributes of [{}, { [SPATIAL.mode]: 'loose' }] as Record<string, string>[]) {
        expect(registry.allowsViewMode(page(attributes), 'iso')).toBe(true);
        expect(registry.viewModeFor(page(attributes), '3d')).toBe('3d');
      }
    });

    it('la forme du mode se dessine sur une page normale', () => {
      const xml = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
        <mxCell id="s" vertex="1" parent="1" style="shape=test-box;"><mxGeometry x="0" y="0" width="120" height="60" as="geometry"/></mxCell>
      </root></mxGraphModel>`;
      const shape = readDrawio(xml).document.pages[0]!.shapes[0]!;
      expect(shapes.resolve(shape)).toMatchObject({ supported: true, definition: { id: 'test-box' } });
    });
  });
});
