import { Object3D } from 'three';
import type { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { collectUnsupported } from '../../../../../src/engine/core/diagnostics/unsupportedStyles';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import type { PageModel, ShapeModel } from '../../../../../src/engine/core/model/types';
import type { RenderContext } from '../../../../../src/engine/core/render/types';
import { ShapeRegistry } from '../../../../../src/engine/core/shapes/registry';
import { createDefaultModeRegistry, createDefaultRegistry } from '../../../../../src/engine/plugins';
import { fixture, MEASURE } from '../../../../helpers';
import { libraryJson } from './libraryJson';

const document = () => readDrawio(fixture('shape-library.drawio')).document;
const shape = (id: string) => document().pages[0]!.shapes.find((s) => s.id === id)!;
const ctx: RenderContext = { ...MEASURE, text: { create: () => new Object3D() } };

/** Bibliothèque `demo` de la fixture : `server` et `token`, ce dernier réservé aux pages Machine à états. */
const demo = (
  outline = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ],
) =>
  libraryJson(
    { id: 'server', render: { outline } },
    {
      library: { id: 'demo', name: 'Démo', meta: { source: 'test' } },
      categories: [{ id: 'dynamic', name: 'Dynamic shapes', order: 100 }],
      shapes: [
        { id: 'server', category: 'dynamic', name: 'Serveur', size: { width: 100, height: 70 }, render: { outline } },
        {
          id: 'token',
          category: 'dynamic',
          name: 'Jeton',
          size: { width: 80, height: 60 },
          modes: ['states'],
          render: {
            outline: [
              [0.5, 0],
              [1, 1],
              [0, 1],
            ],
            depth: 12,
          },
        },
      ],
    },
  );

const meshNames = (object: Object3D) => {
  const names: string[] = [];
  object.traverse((child) => names.push(child.name));
  return names;
};

describe('bibliothèques de formes dans le registre (sujets 529, 530)', () => {
  it('une forme posée sans sa bibliothèque est non chargée, puis chargée une fois enregistrée', () => {
    const registry = createDefaultRegistry();
    expect(registry.libraryStatus(shape('server'))).toEqual({ library: 'demo', kind: 'server', state: 'unloaded' });
    expect(registry.resolve(shape('server')).definition.id).toBe('library-unloaded');
    expect(registry.libraryStatus(shape('plain'))).toBeUndefined();

    expect(registry.registerLibrary(demo())).toMatchObject({ ok: true });
    expect(registry.libraryStatus(shape('server'))?.state).toBe('loaded');
    expect(registry.resolve(shape('server'))).toMatchObject({ definition: { id: 'demo:server' }, supported: true });
    // La bibliothèque chargée sans cette forme : toujours non chargée.
    expect(
      registry.libraryStatus({ ...shape('server'), style: { ...shape('server').style, 'spatial.kind': 'x' } }),
    ).toMatchObject({ state: 'unloaded' });
    expect(registry.library('demo')?.meta).toEqual({ source: 'test' });
  });

  it('remplace une bibliothèque du même id, la retire', () => {
    const registry = createDefaultRegistry();
    registry.registerLibrary(demo());
    expect(registry.outline(shape('server'))).toHaveLength(4);
    registry.registerLibrary(
      demo([
        [0, 0],
        [1, 0],
        [0, 1],
      ]),
    );
    expect(registry.outline(shape('server'))).toHaveLength(3);
    expect(registry.libraries()).toHaveLength(1);
    expect(registry.unregisterLibrary('demo')).toBe(true);
    expect(registry.unregisterLibrary('demo')).toBe(false);
    expect(registry.libraryStatus(shape('server'))?.state).toBe('unloaded');
  });

  it('un JSON refusé ne change rien', () => {
    const registry = createDefaultRegistry();
    registry.registerLibrary(demo());
    const result = registry.registerLibrary({ ...demo(), shapes: [] });
    expect(result.ok).toBe(false);
    expect(registry.libraryStatus(shape('server'))?.state).toBe('loaded');
  });

  it('introuvable : toute la bibliothèque ou une forme, levé en l’enregistrant', () => {
    const registry = createDefaultRegistry();
    expect(registry.markLibraryShapesUnavailable([{ library: 'infra-aws', kind: 'serveur' }])).toBe(true);
    expect(registry.markLibraryShapesUnavailable([{ library: 'infra-aws', kind: 'serveur' }])).toBe(false);
    expect(registry.libraryStatus(shape('aws'))?.state).toBe('unavailable');
    expect(registry.libraryStatus(shape('aws-db'))?.state).toBe('unloaded');
    registry.markLibraryShapesUnavailable([{ library: 'demo' }]);
    expect(registry.libraryStatus(shape('token'))?.state).toBe('unavailable');
    expect(registry.resolve(shape('token')).definition.id).toBe('library-unavailable');
    registry.registerLibrary(demo());
    registry.unregisterLibrary('demo');
    expect(registry.libraryStatus(shape('token'))?.state).toBe('unloaded');
  });

  it('modèles de la palette : style avec la bibliothèque et la forme, icône tirée du contour', () => {
    const registry = createDefaultRegistry();
    registry.registerLibrary(
      libraryJson({ style: 'fillColor=#fff;spatial.library=autre;spatial.kind=autre;', icon: undefined }),
    );
    const template = registry.templates().find((t) => t.library === 'infra')!;
    expect(template).toMatchObject({ id: 'infra:server', category: 'infra:compute', library: 'infra' });
    expect(template.style).toBe('fillColor=#fff;spatial.library=infra;spatial.kind=server;');
    expect(template.icon).toBe('<path d="M4 4L36 4L20 24Z"/>');
    expect(registry.libraryCategories()).toEqual([
      { id: 'infra:compute', name: 'Calcul', order: 100 },
      { id: 'other', name: 'Autres', order: 1000 },
    ]);
    // Hors Paramètres › Formes (catégories sans réglages).
    expect(registry.categories().some((c) => c.id === 'infra:compute')).toBe(false);
    const placed = readDrawio(
      `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
      <mxCell id="s" style="${template.style}" vertex="1" parent="1"><mxGeometry width="80" height="60" as="geometry"/></mxCell>
      </root></mxGraphModel></diagram></mxfile>`,
    ).document.pages[0]!.shapes[0]!;
    expect(registry.templateOf(placed)?.id).toBe('infra:server');
  });

  it('forme sans catégorie : rangée dans « Autres », cachée tant qu’elle est vide (sujet 538)', () => {
    const registry = createDefaultRegistry();
    expect(registry.libraryCategories()).toEqual([]);
    const modes = createDefaultModeRegistry();
    const palette = () =>
      modes.paletteFor(undefined, registry.templates(), [...registry.categories(), ...registry.libraryCategories()]);
    registry.registerLibrary(libraryJson());
    expect(palette().categories.some((c) => c.id === 'other')).toBe(false);
    registry.registerLibrary(libraryJson({ category: undefined }, { categories: undefined }));
    expect(registry.templates().find((t) => t.library === 'infra')?.category).toBe('other');
    expect(palette().categories.at(-1)).toEqual({ id: 'other', name: 'Autres', order: 1000 });
  });

  it('palette d’une page : les `modes` de la forme, quel que soit le mode', () => {
    const registry = createDefaultRegistry();
    registry.registerLibrary(demo());
    const modes = createDefaultModeRegistry();
    const palette = (mode?: string) =>
      modes.paletteFor(
        { id: 'p', shapes: [], edges: [], attributes: mode ? { 'spatial.mode': mode } : {} } as unknown as PageModel,
        registry.templates(),
        [...registry.categories(), ...registry.libraryCategories()],
      );
    const ids = (mode?: string) =>
      palette(mode)
        .templates.filter((t) => t.library)
        .map((t) => t.id);
    expect(ids()).toEqual(['demo:server']);
    expect(ids('states')).toEqual(['demo:token']);
    expect(ids('rdd')).toEqual([]);
    expect(palette('rdd').categories.some((c) => c.id === 'demo:dynamic')).toBe(false);
    expect(palette('states').categories.some((c) => c.id === 'demo:dynamic')).toBe(true);
  });

  it('dessin : la forme chargée suit son contour et sa hauteur, la non chargée est hachurée et badgée', () => {
    const registry = createDefaultRegistry();
    const unloaded = registry.sceneRenderer(shape('server'), 'flat').create(shape('server'), ctx);
    expect(meshNames(unloaded)).toEqual(expect.arrayContaining(['unloaded-hatch', 'unloaded-badge']));
    registry.registerLibrary(demo());
    const token = shape('token');
    expect(registry.volumeHeight(token, ctx)).toBe(12);
    const iso = registry.sceneRenderer(token, 'iso').create(token, ctx) as Group;
    expect(iso.userData.height).toBe(12);
    expect(meshNames(iso)).not.toContain('unloaded-hatch');
  });

  it('Diagnostics : les formes introuvables, pas les non chargées ni les chargées', () => {
    const registry = createDefaultRegistry();
    registry.markLibraryShapesUnavailable([{ library: 'infra-aws' }]);
    const report = collectUnsupported(document(), registry);
    expect(report.entries.map((e) => [e.category, e.name, e.count])).toEqual([
      ['library', 'infra-aws/serveur', 2],
      ['library', 'infra-aws/base', 1],
    ]);
  });

  it('sans dessin des bibliothèques, la forme se résout par son `spatial.kind`', () => {
    const registry = new ShapeRegistry();
    expect(registry.libraryStatus(shape('server'))).toBeUndefined();
    expect(registry.registerLibrary(demo())).toEqual({
      ok: false,
      errors: ['bibliothèques de formes non gérées par ce registre'],
    });
    expect(registry.resolve(shape('server') as ShapeModel).supported).toBe(false);
  });
});
