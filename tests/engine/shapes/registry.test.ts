import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { parseStyle, resolveShapeKind } from '../../../src/engine/format/style';
import type { ShapeModel } from '../../../src/engine/model/types';
import { ShapeRegistry, SHAPE_DEFINITIONS, createDefaultRegistry } from '../../../src/engine/shapes/registry';
import type { ShapeDefinition } from '../../../src/engine/shapes/types';

const model = (kind: string, style: Record<string, string> = {}, extra: Partial<ShapeModel> = {}) =>
  ({ id: 's', kind, style, bounds: { x: 0, y: 0, width: 100, height: 60 }, ...extra }) as unknown as ShapeModel;

describe('formes en plugins (étape 65) : contrat des définitions', () => {
  it('chaque dossier de forme est collecté, avec un nom unique et un rendu à plat', () => {
    const kinds = SHAPE_DEFINITIONS.map((definition) => definition.kind);
    expect(kinds).toEqual(
      expect.arrayContaining([
        'rectangle',
        'ellipse',
        'text',
        'group',
        'rhombus',
        'cylinder3',
        'datastore',
        'mxgraph.flowchart.direct_data',
        'stencil:plug',
      ]),
    );
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const definition of SHAPE_DEFINITIONS) expect(typeof definition.flat.create).toBe('function');
  });

  it('chaque modèle de palette crée sa forme, qui le reconnaît comme sa variante', () => {
    const registry = createDefaultRegistry();
    const templates = registry.templates();
    expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length);
    for (const definition of SHAPE_DEFINITIONS) {
      for (const template of definition.templates ?? []) {
        const parsed = parseStyle(template.style);
        const shape = model(resolveShapeKind(parsed), parsed.values);
        expect(registry.resolve(shape).definition, template.id).toBe(definition);
        expect(registry.templateOf(shape)?.id, template.id).toBe(template.id);
        expect(template.icon.trim().startsWith('<'), template.id).toBe(true);
      }
    }
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
  const note: ShapeDefinition = {
    kind: 'note',
    flat: { create: () => new Group() },
    resizable: false,
    properties: [{ type: 'number', key: 'size', label: 'Pli', section: 'border' }],
    templates: [
      {
        id: 'note',
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
    ],
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
    ).toEqual(['rectangle', 'note', 'rounded']);
    expect(registry.templateOf(shape)?.id).toBe('note');
    expect(registry.properties(shape).map((p) => p.label)).toEqual(['Pli']);
    expect(registry.swatch(shape)).toBe('<path d="M8 5h24v18H8z"/>');
    expect(registry.isResizable(shape)).toBe(false);
    expect(registry.isConnectable(shape)).toBe(true);
  });
});
