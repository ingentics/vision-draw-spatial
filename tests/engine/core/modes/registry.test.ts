import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import type { PageModel } from '../../../../src/engine/core/model/types';
import { PageModeRegistry } from '../../../../src/engine/core/modes/registry';
import type { PageModeDefinition } from '../../../../src/engine/core/modes/types';
import { buildPageScene } from '../../../../src/engine/core/render/pageScene';
import { Object3D } from 'three';
import { ShapeRegistry } from '../../../../src/engine/core/shapes/registry';
import type { ShapeDefinition } from '../../../../src/engine/core/shapes/types';
import { SPATIAL } from '../../../../src/engine/core/spatial';
import {
  MODE_SHAPE_DEFINITIONS,
  PAGE_MODE_DEFINITIONS,
  createDefaultRegistry,
  shapesByMode,
} from '../../../../src/engine/plugins';
import { PALETTE_CATEGORIES } from '../../../../src/engine/plugins/shapes/categories';
import { modeHost } from '../../modeHost';
import { PageEffectRegistry } from '../../../../src/engine/core/effects/registry';
import { MEASURE } from '../../../helpers';

/**
 * Dossiers des modes : `plugins/modes/<id>/index.ts` (moteur) et `app/plugins/modes/<id>/index.tsx` (sections React,
 * facultatives).
 */
const ENGINE = Object.entries(
  import.meta.glob<PageModeDefinition>('../../../../src/engine/plugins/modes/*/index.ts', {
    eager: true,
    import: 'definition',
  }),
).map(([path, definition]) => ({ folder: path.split('/').at(-2)!, definition }));
const APP = Object.keys(import.meta.glob('../../../../src/app/plugins/modes/*/index.tsx')).map((path) =>
  path.split('/').at(-2)!,
);

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
      namespace: 'test',
      name: 'Test',
      edges: { properties: [{ type: 'text', key: 'value', label: 'Test' }] },
      pasteKeys: ['value'],
      dressing: () => ({ edgeColor: () => '#ff0000', edgeBadge: () => ({ text: 'T', color: '#00ff00' }) }),
    };
    const registry = new PageModeRegistry().register(test);
    expect(registry.list().map((mode) => mode.id)).toEqual(['test']);
    expect(registry.modeOf(page({ [SPATIAL.mode]: 'test' }))).toBe(test);
    expect(registry.modeOf(page({}))).toBeUndefined();
    expect(registry.properties(page({ [SPATIAL.mode]: 'test' }), 'edge').map((p) => p.key)).toEqual(['value']);
    expect(registry.properties(page({}), 'edge')).toEqual([]);
    // Clés complètes, dans l'espace de noms du mode (sujet 301).
    expect(registry.pasteKeys()).toEqual(['spatial.test.value']);

    const xml = `<mxfile><diagram id="p" name="P" spatial.mode="test"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="e" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="0" y="0" as="sourcePoint"/><mxPoint x="100" y="0" as="targetPoint"/></mxGeometry></mxCell>
    </root></mxGraphModel></diagram></mxfile>`;
    const model = readDrawio(xml).document.pages[0]!;
    const ctx = { ...MEASURE, text: { create: () => new Object3D() } };
    const root = buildPageScene(
      model,
      createDefaultRegistry(),
      ctx,
      'flat',
      modeHost(registry).host.dressing(model),
    ).root;
    expect(root.getObjectByName('edge-badge')).toBeDefined();
  });

  it('espace de noms (sujet 301) : invalide ou déjà pris par un autre mode, refusé ; clés de collage complètes', () => {
    const registry = new PageModeRegistry().register({ id: 'a', namespace: 'ns', name: 'A' });
    expect(() => registry.register({ id: 'b', namespace: 'ns', name: 'B' })).toThrow('déjà pris par a');
    expect(() => registry.register({ id: 'c', namespace: 'Mauvais.ns', name: 'C' })).toThrow('invalide');
    // Mode écrit sans espace de noms (hors du typage) : refusé lui aussi.
    expect(() => registry.register({ id: 'c', name: 'C' } as unknown as PageModeDefinition)).toThrow('invalide');

    registry.register({ id: 'd', namespace: 'old', name: 'D', pasteKeys: ['flow', 'step'] });
    expect(registry.pasteKeys()).toEqual(['spatial.old.flow', 'spatial.old.step']);
  });

  it('ids uniques et formes d’un mode (sujet 304) : id pris, forme non préfixée ou avec kinds / matches, refusés', () => {
    const registry = new PageModeRegistry().register({ id: 'a', namespace: 'a', name: 'A' });
    expect(() => registry.register({ id: 'a', namespace: 'autre', name: 'A2' })).toThrow('Mode a : id déjà pris');
    const shape = (definition: Partial<ShapeDefinition>) => ({
      id: 'b-box',
      flat: { create: () => new Object3D() },
      ...definition,
    });
    expect(() => registry.register({ id: 'b', namespace: 'b', name: 'B' }, [shape({ id: 'box' })])).toThrow(
      'non préfixée',
    );
    expect(() =>
      registry.register({ id: 'c', namespace: 'c', name: 'C' }, [shape({ id: 'c-box', kinds: ['rect'] })]),
    ).toThrow('kinds ou matches');
    expect(() =>
      registry.register({ id: 'd', namespace: 'd', name: 'D' }, [shape({ id: 'd-box', matches: () => true })]),
    ).toThrow('kinds ou matches');
    expect(() => registry.register({ id: 'e', namespace: 'e', name: 'E' }, [shape({ id: 'e-box' })])).not.toThrow();
    // Formes et effets : un id pris est refusé aussi.
    expect(() => createDefaultRegistry().register(shape({ id: 'rectangle' }))).toThrow(
      'Forme rectangle : id déjà pris',
    );
    expect(() => new PageEffectRegistry().register({ id: 'x', name: 'X' }).register({ id: 'x', name: 'Y' })).toThrow(
      'Effet x : id déjà pris',
    );
  });

  it('vue pour l’appli (sujet 304) : la déclaration des modes, jamais leurs points d’entrée', () => {
    const registry = new PageModeRegistry().register({
      id: 'v',
      namespace: 'v',
      name: 'V',
      page: { selectionStyle: 'outline', viewModes: ['top'] },
      gestures: { mainSection: { title: 'Logique', kinds: ['v-table'] }, carries: () => [] },
      dressing: () => ({}),
      lifecycle: { check: () => [] },
    });
    const view = registry.view();
    const info = view.modeOf(page({ [SPATIAL.mode]: 'v' }))!;
    // Section principale du panneau (sujet 413) : une donnée, lue telle quelle par l'appli.
    expect(info).toEqual({
      id: 'v',
      name: 'V',
      selectionStyle: 'outline',
      mainSection: { title: 'Logique', kinds: ['v-table'] },
    });
    expect(Object.isFrozen(info)).toBe(true);
    expect(view).not.toHaveProperty('register');
    expect(view.allowsViewMode(page({ [SPATIAL.mode]: 'v' }), 'iso')).toBe(false);
    expect(view.list().map((mode) => mode.id)).toEqual(['v']);
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
      namespace: 'test',
      name: 'Test',
      page: {
        palette: { shapes: ['rectangle', 'test-box'], categories: [{ id: 'test', name: 'Test', order: 15 }] },
        viewModes: ['top'],
      },
    };
    const loose: PageModeDefinition = {
      id: 'loose',
      namespace: 'loose',
      name: 'Libre',
      page: { palette: { categories: test.page!.palette!.categories } },
    };
    const registry = new PageModeRegistry().register(test, TEST_SHAPES.get('test')).register(loose);
    const shapes = createDefaultRegistry();
    for (const shape of TEST_SHAPES.get('test')!) shapes.register(shape);
    const templates = shapes.templates();
    const ids = (attributes: Record<string, string>) => {
      const { categories, templates: shown } = registry.paletteFor(page(attributes), templates, PALETTE_CATEGORIES);
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
      expect(registry.paletteFor(undefined, templates, PALETTE_CATEGORIES).templates.map((t) => t.id)).toEqual(
        normal.shapes,
      );
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

describe('réglages déclarés par un mode (ticket 283)', () => {
  const mode: PageModeDefinition = {
    id: 'reglages',
    namespace: 'reglages',
    name: 'Réglages',
    settings: [
      { key: 'gap', type: 'number', label: 'Écart', min: 0, max: 50, step: 1, default: 20 },
      { key: 'face', type: 'toggle', label: 'Face', default: true },
      { key: 'ink', type: 'color', label: 'Encre', default: '#000000' },
    ],
  };
  const registry = new PageModeRegistry().register(mode);

  it('valeurs : bornées, défaut pour les absentes et celles du mauvais type, clés inconnues ignorées', () => {
    expect(registry.values('reglages', undefined)).toEqual({ gap: 20, face: true, ink: '#000000' });
    expect(registry.values('reglages', { gap: 90, face: false, ink: '#FF0000', other: 1 })).toEqual({
      gap: 50,
      face: false,
      ink: '#FF0000',
    });
    expect(registry.values('reglages', { gap: 'x', face: 1, ink: 'rouge' })).toEqual({
      gap: 20,
      face: true,
      ink: '#000000',
    });
    expect(registry.valuesOf(page({ [SPATIAL.mode]: 'reglages' }), { reglages: { gap: 5 } }).gap).toBe(5);
    expect(registry.valuesOf(page({}), { reglages: { gap: 5 } })).toEqual({});
  });

  it('habillage : le mode reçoit ses valeurs', () => {
    const dressed = new PageModeRegistry().register({
      ...mode,
      dressing: (_page, values) => ({ edgeDarken: values.gap as number }),
    });
    expect(
      modeHost(dressed, { reglages: { gap: 7 } }).host.dressing(page({ [SPATIAL.mode]: 'reglages' }))?.edgeDarken,
    ).toBe(7);
  });
});

describe('registre des modes : id et modes inconnus (sujet 378)', () => {
  it('id hors de ^[a-z][a-z0-9-]*$ refusé à l’enregistrement : il est écrit dans spatial.mode', () => {
    const registry = new PageModeRegistry();
    for (const id of ['Rdd', 'a,b', 'a b', '1er', ''])
      expect(() => registry.register({ id, namespace: 'n', name: id })).toThrow('id invalide');
    expect(() => registry.register({ id: 'mode-2', namespace: 'n', name: 'Mode 2' })).not.toThrow();
  });

  it('avertissement pour une page d’un mode inconnu, rien pour une page normale ou d’un mode connu', () => {
    const registry = new PageModeRegistry().register({ id: 'connu', namespace: 'connu', name: 'Connu' });
    const diagram = (id: string, mode = '') =>
      `<diagram id="${id}" name="${id}"${mode}><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram>`;
    const { document } = readDrawio(
      `<mxfile>${diagram('a')}${diagram('b', ' spatial.mode="connu"')}${diagram('c', ' spatial.mode="plus-tard"')}</mxfile>`,
    );
    expect(registry.warnings(document)).toEqual([{ pageId: 'c', message: 'Mode de page inconnu : plus-tard' }]);
  });
});
