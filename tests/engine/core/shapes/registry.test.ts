import { Group, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { collectUnsupported } from '../../../../src/engine/core/diagnostics/unsupportedStyles';
import type { EngineCore } from '../../../../src/engine/core/domains/EngineCore';
import { PluginGuard } from '../../../../src/engine/core/domains/modes/pluginGuard';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { parseStyle, resolveShapeKind } from '../../../../src/engine/core/format/style';
import { pickElement } from '../../../../src/engine/core/interaction/pick';
import type { Point, ShapeModel } from '../../../../src/engine/core/model/types';
import { buildPageScene } from '../../../../src/engine/core/render/pageScene';
import type { RenderContext } from '../../../../src/engine/core/render/types';
import { groupShape } from '../../../../src/engine/core/shapes/group';
import { ShapeRegistry } from '../../../../src/engine/core/shapes/registry';
import type { ShapeDefinition } from '../../../../src/engine/core/shapes/types';
import { SHAPE_DEFINITIONS, createDefaultRegistry } from '../../../../src/engine/plugins';

const model = (kind: string, style: Record<string, string> = {}, extra: Partial<ShapeModel> = {}) =>
  ({ id: 's', kind, style, bounds: { x: 0, y: 0, width: 100, height: 60 }, ...extra }) as unknown as ShapeModel;

/**
 * Dossiers des formes : `plugins/shapes/<catégorie>/<id>/index.ts`, ou
 * `plugins/shapes/<catégorie>/<famille>/<variante>/index.ts` ; les bases de `generic/` ne sont pas des formes.
 */
const FOLDERS = Object.entries(
  import.meta.glob<ShapeDefinition>(
    [
      '../../../../src/engine/plugins/shapes/*/*/index.ts',
      '../../../../src/engine/plugins/shapes/*/*/*/index.ts',
      '!../../../../src/engine/plugins/shapes/generic/**',
    ],
    { eager: true, import: 'definition' },
  ),
).map(([path, definition]) => {
  const [category, ...rest] = path.split('/plugins/shapes/')[1]!.split('/').slice(0, -1) as [string, ...string[]];
  return { category, folder: rest.join('/'), family: rest.length > 1 ? rest[0] : undefined, definition };
});

describe('formes en plugins (étapes 65, 67) : contrat des définitions', () => {
  it('une forme par élément de la palette, nommée comme l’interface, rangée par catégorie', () => {
    // Pas de liste figée : une nouvelle forme n'a qu'à déposer son dossier. Les formes de base sont bien là.
    const folders = FOLDERS.map(({ category, folder }) => `${category}/${folder}`);
    expect(folders).toEqual(
      expect.arrayContaining([
        'geometry/rectangle',
        'geometry/rounded-rectangle',
        'geometry/ellipse',
        'geometry/circle',
        'geometry/diamond',
        'geometry/hexagon',
        'geometry/octagon',
        'geometry/pentagon',
        'geometry/triangle',
        'geometry/triangle-up',
        'geometry/parallelogram',
        'geometry/step',
        'geometry/four-point-star',
        'geometry/six-point-star',
        'general/text',
        'general/actors/human',
        'general/actors/droid',
        'architecture/database',
        'architecture/queue',
        'architecture/distributed-cache',
        'architecture/plug',
        'architecture/process',
        'architecture/event-consumer',
        'architecture/background-task',
        'architecture/recurring-task',
        'architecture/labeled-process',
      ]),
    );
    expect(SHAPE_DEFINITIONS).toHaveLength(FOLDERS.length);
    const ids = SHAPE_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Le groupe est une forme du tronc (sujet 286), enregistrée par le registre par défaut.
    expect(createDefaultRegistry().resolve(model('group')).definition).toBe(groupShape);
  });

  it('id = nom du dossier (famille : commence par son nom au singulier), catégorie de palette = dossier de catégorie (internal : hors palette), rendu à plat', () => {
    for (const { category, folder, family, definition } of FOLDERS) {
      if (family) expect(definition.id, folder).toMatch(new RegExp(`^${family.replace(/s$/, '')}(-|$)`));
      else expect(definition.id).toBe(folder);
      expect(definition.palette?.category ?? 'internal', folder).toBe(category);
      expect(typeof definition.flat.create, folder).toBe('function');
    }
  });

  it('chaque élément de palette crée une forme résolue vers sa définition', () => {
    const registry = createDefaultRegistry();
    for (const definition of SHAPE_DEFINITIONS) {
      if (!definition.palette) continue;
      const parsed = parseStyle(definition.palette.style);
      // Nom de la forme comme à la lecture : `spatial.kind`, sinon deviné du style.
      const shape = model(parsed.values['spatial.kind'] ?? resolveShapeKind(parsed), parsed.values);
      expect(registry.resolve(shape).definition.id, definition.id).toBe(definition.id);
      expect(registry.templateOf(shape)?.id, definition.id).toBe(definition.id);
      expect(definition.palette.icon.trim().startsWith('<'), definition.id).toBe(true);
    }
  });

  it('résolution : la variante la plus précise, puis le nom de la forme (spatial.kind), puis le nom draw.io', () => {
    const registry = createDefaultRegistry();
    const id = (kind: string, style: Record<string, string> = {}) => registry.resolve(model(kind, style)).definition.id;
    expect(id('rectangle')).toBe('rectangle');
    expect(id('rectangle', { rounded: '1' })).toBe('rounded-rectangle');
    expect(id('ellipse', { aspect: 'fixed' })).toBe('circle');
    expect(id('cylinder3')).toBe('database');
    expect(id('cylinder3', { direction: 'south' })).toBe('queue');
    expect(id('mxgraph.flowchart.direct_data')).toBe('queue');
    expect(id('rhombus')).toBe('diamond');
    expect(id('hexagon')).toBe('hexagon');
    expect(id('mxgraph.basic.octagon2')).toBe('octagon');
    expect(id('mxgraph.basic.pentagon')).toBe('pentagon');
    expect(id('triangle')).toBe('triangle');
    expect(id('triangle', { direction: 'north' })).toBe('triangle-up');
    expect(id('parallelogram')).toBe('parallelogram');
    expect(id('step')).toBe('step');
    expect(id('mxgraph.basic.4_point_star_2')).toBe('four-point-star');
    expect(id('mxgraph.basic.6_point_star')).toBe('six-point-star');
    expect(id('umlActor')).toBe('actor');
    expect(id('database', { direction: 'south' })).toBe('database');
    expect(id('queue')).toBe('queue');
    expect(registry.resolve(model('note')).supported).toBe(false);
  });

  it('une forme imposée garde l’orientation de sa forme : BDD debout, queue couchée', () => {
    const registry = createDefaultRegistry();
    const silhouette = (kind: string, style: Record<string, string> = {}) =>
      registry.resolve(model(kind, style)).definition.outline!(model(kind, style));
    const width = (points: { x: number }[]) =>
      Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
    expect(silhouette('database', { direction: 'south' })).toEqual(silhouette('cylinder3'));
    expect(silhouette('queue')).toEqual(silhouette('cylinder3', { direction: 'south' }));
    expect(width(silhouette('queue'))).toBeCloseTo(100);
  });

  it('la palette suit le rang des modèles', () => {
    const orders = createDefaultRegistry()
      .templates()
      .map((t) => t.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('interaction : replis génériques, et le groupe déclare ses exceptions', () => {
    const registry = createDefaultRegistry();
    const rectangle = model('rectangle');
    expect([
      registry.isResizable(rectangle),
      registry.isConnectable(rectangle),
      registry.isPickable(rectangle),
    ]).toEqual([true, true, true]);
    expect(registry.movesAsBlock(rectangle)).toBe(false);
    const group = model('group');
    expect([registry.isResizable(group), registry.isConnectable(group), registry.isPickable(group)]).toEqual([
      false,
      false,
      false,
    ]);
    expect(registry.isPickable(model('group', {}, { link: { type: 'url', href: 'https://x' } }))).toBe(true);
    expect(registry.movesAsBlock(group)).toBe(true);
  });

  it('panneau : réglages et aperçus déclarés par la forme, repli sur le rectangle', () => {
    const registry = createDefaultRegistry();
    expect(registry.properties(model('rectangle')).map((p) => p.key)).toEqual(['rounded']);
    expect(registry.properties(model('ellipse'))).toEqual([]);
    expect(registry.properties(model('datastore')).map((p) => p.key)).toEqual(['spatial.nodes', 'spatial.tag']);
    expect(registry.properties(model('cylinder3'))[0]).toMatchObject({ placeholder: 'DB' });
    expect(registry.properties(model('cylinder3', { direction: 'south' }))[0]).toMatchObject({ placeholder: 'QUEUE' });
    expect(registry.swatch(model('ellipse'))).toContain('<ellipse');
    expect(registry.swatch(model('rhombus'))).toContain('<rect');
    expect(registry.swatch(model('mxgraph.aws4.lambda'))).toContain('<rect');
  });

  it('clic : ellipse exacte, rectangle arrondi plein, contour pour les autres', () => {
    const registry = createDefaultRegistry();
    expect(registry.contains(model('ellipse'), { x: 2, y: 2 })).toBe(false);
    expect(registry.contains(model('ellipse'), { x: 50, y: 30 })).toBe(true);
    expect(registry.contains(model('rectangle', { rounded: '1' }), { x: 0.5, y: 0.5 })).toBe(true);
    expect(registry.contains(model('rhombus'), { x: 2, y: 2 })).toBe(false);
  });
});

describe('formes en plugins (étape 65) : une forme déposée se branche toute seule', () => {
  // Cas nominal : `id` = nom draw.io, pas de `kinds` à écrire.
  const note: ShapeDefinition = {
    id: 'note',
    flat: { create: () => new Group() },
    resizable: false,
    properties: [{ type: 'number', key: 'size', label: 'Pli', section: 'border' }],
    palette: {
      name: 'Note',
      category: 'general',
      order: 15,
      keywords: [],
      style: 'shape=note;',
      value: '',
      width: 80,
      height: 100,
      icon: '<path d="M10 3h20v22H10z"/>',
    },
    swatch: () => '<path d="M8 5h24v18H8z"/>',
  };
  const registry = new ShapeRegistry();
  for (const definition of [...SHAPE_DEFINITIONS, note]) registry.register(definition);

  it('palette, panneau, interaction et diagnostics la prennent en compte sans autre code', () => {
    const shape = model('note');
    expect(registry.resolve(shape).supported).toBe(true);
    expect(
      registry
        .templates()
        .map((t) => t.id)
        .slice(0, 3),
    ).toEqual(['rectangle', 'note', 'rounded-rectangle']);
    expect(registry.templateOf(shape)?.id).toBe('note');
    expect(registry.properties(shape).map((p) => p.label)).toEqual(['Pli']);
    expect(registry.swatch(shape)).toBe('<path d="M8 5h24v18H8z"/>');
    expect(registry.isResizable(shape)).toBe(false);
    expect(registry.isConnectable(shape)).toBe(true);
  });
});

describe('formes protégées (sujet 300)', () => {
  const fail = (): never => {
    throw new Error('panne');
  };
  /** Forme de test dont tous les points d'entrée lèvent une exception (nommée par `spatial.kind=broken`). */
  const BROKEN: ShapeDefinition = {
    id: 'broken',
    flat: { create: fail },
    outline: fail,
    textZone: fail,
    contains: fail,
    hitBounds: fail,
    editStyle: fail,
    swatch: fail,
    minimap: fail,
  };
  /** Forme de test dont la condition lève une exception (`shape=boom`). */
  const BOOM: ShapeDefinition = { id: 'boom', matches: fail, flat: { create: () => new Group() } };
  const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" style="spatial.kind=broken;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="b" value="B" style="shape=boom;" vertex="1" parent="1"><mxGeometry x="300" y="0" width="100" height="60" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;
  const ctx: RenderContext = { text: { create: () => new Object3D() } };

  /** Registre par défaut avec les formes en panne, ses erreurs signalées par un `PluginGuard`, comme dans le moteur. */
  function setup() {
    const state = { published: 0 };
    const core = { file: { publishWarnings: () => state.published++ } } as unknown as EngineCore;
    const guard = new PluginGuard(core);
    const registry = createDefaultRegistry()
      .register(BROKEN)
      .register(BOOM)
      .reportingTo((id, hook, error) => guard.report(`Forme ${id}`, hook, error));
    const { document } = readDrawio(XML);
    const page = document.pages[0]!;
    const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
    return { registry, guard, state, document, page, shape };
  }

  it('forme qui écrit dans la forme remise : placeholder, erreur signalée, label intact (sujet 324)', () => {
    const { registry, guard, shape } = setup();
    const writer: ShapeDefinition = {
      id: 'writer',
      flat: {
        create: (target) => {
          (target as { label: string }).label = 'x';
          return new Group();
        },
      },
      outline: (target) => {
        (target.bounds as { x: number }).x = 5;
        return [];
      },
    };
    registry.register(writer);
    const a = { ...shape('a'), kind: 'writer' };
    expect(Object.isFrozen(a)).toBe(false);
    const object = registry.sceneRenderer(a, 'flat').create(a, ctx);
    expect(object.getObjectByName('stroke')).toBeDefined();
    expect(registry.outline(a)).toBeUndefined();
    expect(a.label).not.toBe('x');
    expect(a.bounds.x).toBe(0);
    expect(guard.warnings().map((w) => w.message)).toEqual([
      expect.stringMatching(/^Forme writer : erreur dans flat\.create \(/),
      expect.stringMatching(/^Forme writer : erreur dans outline \(/),
    ]);
  });

  it('condition (matches) en panne : la définition est ignorée, la forme est dessinée en placeholder', () => {
    const { registry, document, shape } = setup();
    expect(registry.resolve(shape('b')).supported).toBe(false);
    expect(collectUnsupported(document, registry).entries.map((entry) => entry.name)).toEqual(['boom']);
  });

  it('les autres points d’entrée en panne : repli, chaque erreur signalée une fois', async () => {
    const { registry, guard, state, shape } = setup();
    const a = shape('a');
    // Le placeholder à la place du rendu : rectangle en pointillé, découpé en tirets.
    const object = registry.sceneRenderer(a, 'flat').create(a, ctx);
    expect(object.getObjectByName('stroke')).toBeDefined();
    expect(registry.outline(a)).toBeUndefined();
    expect(registry.textZone(a, 'flat')).toEqual(a.bounds);
    expect(registry.contains(a, { x: 10, y: 10 })).toBe(true);
    expect(registry.hitBounds(a)).toEqual(a.bounds);
    expect(registry.editStyle(a)).toBeUndefined();
    expect(registry.swatch(a)).toContain('<rect');
    // Mini-carte : le contexte partagé est rendu tel quel, puis les bornes sont dessinées.
    const calls: string[] = [];
    const record = (name: string) => () => calls.push(name);
    const context = new Proxy({} as CanvasRenderingContext2D, {
      get: (_target, key) => (typeof key === 'string' ? record(key) : undefined),
      set: () => true,
    });
    registry.minimapPainter(a)!(context, a, { toMinimap: (p: Point) => p, scale: 1 });
    expect(calls.slice(0, 2)).toEqual(['save', 'restore']);
    expect(calls.filter((c) => c === 'lineTo')).toHaveLength(3);
    expect(guard.warnings().map((w) => w.message)).toEqual([
      'Forme broken : erreur dans flat.create (panne)',
      'Forme broken : erreur dans outline (panne)',
      'Forme broken : erreur dans textZone (panne)',
      'Forme broken : erreur dans contains (panne)',
      'Forme broken : erreur dans hitBounds (panne)',
      'Forme broken : erreur dans editStyle (panne)',
      'Forme broken : erreur dans swatch (panne)',
      'Forme broken : erreur dans minimap (panne)',
    ]);
    // La deuxième panne d'un même point d'entrée n'est pas signalée à nouveau ; une seule republication.
    registry.sceneRenderer(a, 'flat').create(a, ctx);
    expect(guard.warnings()).toHaveLength(8);
    await Promise.resolve();
    expect(state.published).toBe(1);
  });

  it('page aux formes en panne : la scène se construit, les formes se sélectionnent au clic', () => {
    const { registry, page } = setup();
    const scene = buildPageScene(page, registry, ctx);
    expect(scene.root.children.map((child) => child.userData.elementId)).toEqual(['a', 'b']);
    const options = {
      edgeTolerance: 4,
      edgeRoute: () => undefined,
      contains: (s: ShapeModel, p: Point) => registry.contains(s, p),
      hitBounds: (s: ShapeModel) => registry.hitBounds(s),
    };
    expect(pickElement(page, { x: 50, y: 30 }, options)?.element.id).toBe('a');
    expect(pickElement(page, { x: 350, y: 30 }, options)?.element.id).toBe('b');
  });

  it('sans destinataire des erreurs : repli quand même, erreur à la console', () => {
    const registry = new ShapeRegistry().register(BROKEN);
    const shape = model('broken');
    const error = console.error;
    const logged: unknown[] = [];
    console.error = (...args: unknown[]) => logged.push(args[0]);
    try {
      expect(registry.hitBounds(shape)).toEqual(shape.bounds);
    } finally {
      console.error = error;
    }
    expect(logged).toEqual(['Forme broken : erreur dans hitBounds']);
  });
});
