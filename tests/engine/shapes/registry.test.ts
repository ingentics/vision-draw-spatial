import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { parseStyle, resolveShapeKind } from '../../../src/engine/format/style';
import type { ShapeModel } from '../../../src/engine/model/types';
import { ShapeRegistry, SHAPE_DEFINITIONS, createDefaultRegistry } from '../../../src/engine/shapes/registry';
import type { ShapeDefinition } from '../../../src/engine/shapes/types';

const model = (kind: string, style: Record<string, string> = {}, extra: Partial<ShapeModel> = {}) =>
  ({ id: 's', kind, style, bounds: { x: 0, y: 0, width: 100, height: 60 }, ...extra }) as unknown as ShapeModel;

/** Dossiers des formes : `impl/<catégorie>/<id>/index.ts`. */
const FOLDERS = Object.entries(
  import.meta.glob<ShapeDefinition>('../../../src/engine/shapes/impl/*/*/index.ts', {
    eager: true,
    import: 'definition',
  }),
).map(([path, definition]) => {
  const [category, folder] = path.split('/').slice(-3, -1) as [string, string];
  return { category, folder, definition };
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
        'general/actor',
        'architecture/database',
        'architecture/queue',
        'architecture/distributed-cache',
        'architecture/plug',
        'architecture/process',
        'architecture/event-consumer',
        'architecture/background-task',
        'architecture/recurring-task',
        'internal/group',
      ]),
    );
    expect(SHAPE_DEFINITIONS).toHaveLength(FOLDERS.length);
    const ids = SHAPE_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('id = nom du dossier, catégorie de palette = dossier de catégorie (internal : hors palette), rendu à plat', () => {
    for (const { category, folder, definition } of FOLDERS) {
      expect(definition.id).toBe(folder);
      expect(definition.palette?.category ?? 'internal', folder).toBe(category);
      expect(typeof definition.flat.create, folder).toBe('function');
    }
  });

  it('chaque élément de palette crée une forme résolue vers sa définition', () => {
    const registry = createDefaultRegistry();
    for (const definition of SHAPE_DEFINITIONS) {
      if (!definition.palette) continue;
      const parsed = parseStyle(definition.palette.style);
      const shape = model(resolveShapeKind(parsed), parsed.values);
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
