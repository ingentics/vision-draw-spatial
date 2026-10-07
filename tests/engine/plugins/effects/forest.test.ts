import { describe, expect, it } from 'vitest';
import { Object3D } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import { definition as forest } from '../../../../src/engine/plugins/effects/forest';
import { PageEffectRegistry, pageEffectIds, withPageEffect } from '../../../../src/engine/core/effects/registry';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import type { PageModel } from '../../../../src/engine/core/model/types';
import { buildPageScene, effectiveLevel } from '../../../../src/engine/core/render/pageScene';
import {
  PAGE_EFFECT_DEFINITIONS,
  createDefaultEffectRegistry,
  createDefaultRegistry,
} from '../../../../src/engine/plugins';

const ctx = { text: { create: () => new Object3D() } };

function pageOf(effects: string | undefined, cells = ''): PageModel {
  const attribute = effects === undefined ? '' : ` spatial.effects="${effects}"`;
  return readDrawio(
    `<mxfile><diagram id="p" name="P"${attribute}><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells}</root></mxGraphModel></diagram></mxfile>`,
  ).document.pages[0]!;
}

const SHAPE = `<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="200" height="120" as="geometry"/></mxCell>`;
const EDGE = `<mxCell id="e" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="200" y="60" as="sourcePoint"/><mxPoint x="700" y="60" as="targetPoint"/></mxGeometry></mxCell>`;

/** Pieds des arbres de la forêt d'une scène : centres des troncs (premier anneau de chaque arbre). */
function forestOf(page: PageModel, shading?: { light: number; dark: number }): BufferGeometry | undefined {
  const root = buildPageScene(page, createDefaultRegistry(), ctx, 'iso').root;
  createDefaultEffectRegistry().decorate(page, root, { shading });
  return (root.getObjectByName('effect:forest') as Mesh | undefined)?.geometry;
}

describe('effets de page (sujet 143)', () => {
  it('liste des effets d’une page : lue, ajoutée, retirée, cumulable', () => {
    expect(pageEffectIds(pageOf(undefined))).toEqual([]);
    expect(pageEffectIds(pageOf(' forest , x ,forest'))).toEqual(['forest', 'x']);
    expect(withPageEffect(pageOf(undefined), 'forest', true)).toBe('forest');
    expect(withPageEffect(pageOf('x'), 'forest', true)).toBe('x,forest');
    expect(withPageEffect(pageOf('forest'), 'forest', false)).toBeUndefined();
  });

  it('registre : effets connus, filtrés par le mode, inconnus signalés', () => {
    expect(PAGE_EFFECT_DEFINITIONS.map((effect) => effect.id)).toContain('forest');
    const registry = new PageEffectRegistry().register(forest);
    const page = pageOf('forest,inconnu');
    expect(registry.active(page).map((effect) => effect.id)).toEqual(['forest']);
    expect(registry.active(page, () => false)).toEqual([]);
    expect(registry.hasVolume(page)).toBe(true);
    expect(registry.values('forest', undefined).spacing).toBe(28);
    expect(registry.values('forest', { spacing: 1, size: 50, autre: 3 })).toMatchObject({ spacing: 12, size: 50 });
    expect(registry.values('forest', undefined)).not.toHaveProperty('autre');
    expect(registry.hasVolume(pageOf(undefined))).toBe(false);
    const { document } = readDrawio(
      `<mxfile><diagram id="p" name="P" spatial.effects="inconnu"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>`,
    );
    expect(registry.warnings(document)).toEqual([{ pageId: 'p', message: 'Effet de page inconnu : inconnu' }]);
  });

  it('une page avec un décor en volume passe en volume en iso / 3D, même sans forme en volume', () => {
    const shapes = createDefaultRegistry();
    expect(effectiveLevel(pageOf('forest'), shapes, 'iso')).toBe('flat');
    expect(effectiveLevel(pageOf('forest'), shapes, 'iso', true)).toBe('iso');
    expect(effectiveLevel(pageOf('forest'), shapes, 'flat', true)).toBe('flat');
  });

  it('forêt : des arbres autour du schéma, jamais sur une forme ou un tracé, la même à chaque fois', () => {
    const page = pageOf('forest', SHAPE + EDGE);
    const geometry = forestOf(page)!;
    expect(geometry).toBeDefined();
    const positions = geometry.getAttribute('position');
    expect(positions.count).toBeGreaterThan(1000);
    for (let i = 0; i < positions.count; i++) {
      const [x, y] = [positions.getX(i), positions.getY(i)];
      const inShape = x > 0 && x < 200 && y > 0 && y < 120;
      const onEdge = x > 200 && x < 700 && Math.abs(y - 60) < 1;
      expect(inShape || onEdge).toBe(false);
    }
    expect(Array.from(forestOf(page)!.getAttribute('position').array)).toEqual(Array.from(positions.array));
  });

  it('forêt : déplacer une forme change les arbres autour d’elle, pas ceux du loin', () => {
    const moved = SHAPE.replace('x="0" y="0"', 'x="-300" y="0"');
    const before = forestOf(pageOf('forest', SHAPE))!.getAttribute('position').count;
    const after = forestOf(pageOf('forest', moved))!.getAttribute('position').count;
    expect(after).not.toBe(before);
  });

  it('forêt : ombrée comme les volumes, d’après les réglages d’ombrage (dette 311)', () => {
    const page = pageOf('forest', SHAPE);
    const brightness = (shading?: { light: number; dark: number }) => {
      const colors = forestOf(page, shading)!.getAttribute('color');
      let sum = 0;
      for (let i = 0; i < colors.count; i++) sum += colors.getX(i) + colors.getY(i) + colors.getZ(i);
      return sum / colors.count;
    };
    expect(brightness({ light: 0.4, dark: 0.3 })).toBeLessThan(brightness());
    expect(brightness({ light: 1.2, dark: 1.1 })).toBeGreaterThan(brightness());
  });
});
