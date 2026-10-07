import { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { parseDrawio } from '../../../../src/engine/core/format/parse';
import type { ShapeModel } from '../../../../src/engine/core/model/types';
import { buildPageScene, effectiveLevel } from '../../../../src/engine/core/render/pageScene';
import { ShapeRegistry } from '../../../../src/engine/core/shapes/registry';
import type { MinimapMapping, ShapeDefinition } from '../../../../src/engine/core/shapes/types';
import type { RenderContext } from '../../../../src/engine/core/render/types';
import { fixture } from '../../../helpers';
import { createDefaultRegistry } from '../../../../src/engine/plugins';

const ctx: RenderContext = { text: { create: () => new Object3D() } };
const named = (name: string) => ({ create: () => Object.assign(new Object3D(), { name }) });

/** Rectangle avec un rendu iso propre (ex. labels dressés), sans volume ni mini-carte dédiés. */
const isoRectangle: ShapeDefinition = { id: 'rectangle', flat: named('flat'), iso: named('iso') };

const page = parseDrawio(fixture('drawio-desktop.drawio')).pages[0]!;
const shape = page.shapes[0]!;

describe('niveaux de rendu : repli à plat', () => {
  it('un niveau absent se rabat sur flat', () => {
    const registry = new ShapeRegistry().register({ id: 'rectangle', flat: named('flat') });
    expect(registry.sceneRenderer(shape, 'iso').create(shape, ctx).name).toBe('flat');
    expect(registry.sceneRenderer(shape, 'volume').create(shape, ctx).name).toBe('flat');
    expect(registry.hasLevel(shape, 'iso')).toBe(false);
    expect(registry.hasLevel(shape, 'flat')).toBe(true);
  });

  it('un niveau présent est utilisé', () => {
    const registry = new ShapeRegistry().register(isoRectangle);
    expect(registry.sceneRenderer(shape, 'iso').create(shape, ctx).name).toBe('iso');
    expect(registry.sceneRenderer(shape, 'flat').create(shape, ctx).name).toBe('flat');
  });

  it('formes inconnues : placeholder à tous les niveaux (son volume en iso, repli à plat en 3D)', () => {
    const unknown = { ...shape, kind: 'cube' };
    const registry = createDefaultRegistry();
    const placeholder = registry.resolve(unknown).definition;
    expect(placeholder.id).toBe('placeholder');
    expect(registry.sceneRenderer(unknown, 'iso')).toBe(placeholder.iso);
    expect(registry.sceneRenderer(unknown, 'volume')).toBe(placeholder.flat);
  });
});

describe('effectiveLevel : une scène par niveau seulement si utile', () => {
  it('flat partagé par tous les modes quand aucune forme n’a de rendu propre', () => {
    const flatOnly = new ShapeRegistry().register({ id: 'rectangle', flat: named('flat') });
    expect(effectiveLevel(page, flatOnly, 'iso')).toBe('flat');
    expect(effectiveLevel(page, createDefaultRegistry(), 'flat')).toBe('flat');
    // Les rectangles ont un volume par défaut : scène iso dédiée.
    expect(effectiveLevel(page, createDefaultRegistry(), 'iso')).toBe('iso');
  });

  it('iso dès qu’une forme visible a un rendu iso', () => {
    // Le rectangle seul, avec un rendu iso (une forme ne remplace plus une autre : sujet 304).
    const registry = new ShapeRegistry().register(isoRectangle);
    expect(effectiveLevel(page, registry, 'iso')).toBe('iso');
    expect(effectiveLevel(page, registry, 'volume')).toBe('flat');
  });

  it('la scène construite au niveau iso utilise les rendus iso, repli à plat pour les autres', () => {
    const registry = new ShapeRegistry().register(isoRectangle);
    const scene = buildPageScene(page, registry, ctx, 'iso');
    expect(scene.level).toBe('iso');
    const names = scene.root.children
      .filter((c) => c.userData.elementId !== 'Fs-0jHc4KjceeW8xsn6R-4')
      .map((c) => c.name);
    expect(names).toEqual(['iso', 'iso', 'iso']);
  });
});

describe('mini-carte : rendu propre, repli sur le contour, ou rien', () => {
  const map: MinimapMapping = { toMinimap: (p) => ({ x: p.x / 10, y: p.y / 10 }), scale: 0.1 };
  const fakeContext = () =>
    ({
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    }) as unknown as CanvasRenderingContext2D & Record<string, ReturnType<typeof vi.fn>>;

  it('repli : le contour de la forme (ici un rectangle : 4 sommets), rempli de sa couleur', () => {
    const context = fakeContext();
    createDefaultRegistry().minimapPainter(shape)!(context, shape, map);
    expect(context.moveTo).toHaveBeenCalledTimes(1);
    expect(context.lineTo).toHaveBeenCalledTimes(3);
    expect(context.moveTo).toHaveBeenCalledWith(12, 20);
    expect(context.fill).toHaveBeenCalled();
  });

  it('ellipse : le repli suit son contour (pas sa boîte)', () => {
    const ellipse = parseDrawio(fixture('simple.drawio')).pages[0]!.shapes.find((s) => s.kind === 'ellipse')!;
    const context = fakeContext();
    createDefaultRegistry().minimapPainter(ellipse)!(context, ellipse, map);
    expect((context.lineTo as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(10);
  });

  it('texte et groupes : rien en mini-carte ; rendu propre prioritaire', () => {
    const registry = createDefaultRegistry();
    const text = { ...shape, kind: 'text' } as ShapeModel;
    const group = { ...shape, kind: 'group' } as ShapeModel;
    expect(registry.minimapPainter(text)).toBeUndefined();
    expect(registry.minimapPainter(group)).toBeUndefined();
    const own = vi.fn();
    const custom = new ShapeRegistry().register({ id: 'rectangle', flat: named('flat'), minimap: own });
    custom.minimapPainter(shape)!(fakeContext(), shape, map);
    expect(own).toHaveBeenCalled();
  });
});
