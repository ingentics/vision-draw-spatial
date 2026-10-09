import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../../src/engine/core/format/parse';
import { buildPageScene } from '../../../../src/engine/core/render/pageScene';
import type { RenderContext, TextSpec } from '../../../../src/engine/core/render/types';
import { createDefaultRegistry, SHAPE_TEMPLATES } from '../../../../src/engine/plugins';
import { MEASURE } from '../../../helpers';

// Sujet 411 : post-it, carré jaune à ombre, texte noir qui remplit la forme (`fitText=fill`).

const texts: TextSpec[] = [];
const ctx: RenderContext = {
  ...MEASURE,
  text: { create: (spec) => (texts.push(spec), new Object3D()) },
  volume: { depth: 20 },
};
const registry = createDefaultRegistry();
const template = SHAPE_TEMPLATES.find((t) => t.id === 'post-it')!;

function postIt(value = 'Idée') {
  const document = parseDrawio(
    `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>` +
      `<mxCell id="s" value="${value}" style="${template.style}" vertex="1" parent="1">` +
      `<mxGeometry x="0" y="0" width="160" height="160" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>`,
  );
  return document.pages[0]!;
}

describe('post-it', () => {
  it('modèle de la palette : 160 × 160, jaune #fff2cc, sans contour, texte noir', () => {
    expect(template).toMatchObject({ category: 'general', width: 160, height: 160 });
    expect(template.style).toContain('fillColor=#fff2cc');
    expect(template.style).toContain('strokeColor=none');
    expect(template.style).toContain('fontColor=#000000');
  });

  it('reconnu par spatial.kind, supporté', () => {
    const page = postIt();
    expect(page.shapes[0]!.kind).toBe('post-it');
    expect(registry.resolve(page.shapes[0]!).supported).toBe(true);
  });

  it('fond, ombre sous le papier, sans trait ; à plat en iso', () => {
    for (const level of ['flat', 'iso'] as const) {
      const scene = buildPageScene(postIt(), registry, ctx, level);
      const object = scene.root.children.find((c) => c.userData.elementId === 's')!;
      expect(object.getObjectByName('fill')).toBeDefined();
      expect(object.getObjectByName('stroke')).toBeUndefined();
      // Ombre dessinée avant le fond, même en iso.
      const shadow = object.getObjectByName('shadow')!.children[0]!;
      expect(shadow.renderOrder).toBeLessThan(object.getObjectByName('fill')!.renderOrder);
      expect(object.getObjectByName('sides')).toBeUndefined();
    }
  });

  it('texte noir qui remplit la zone, marges de 8 déduites', () => {
    texts.length = 0;
    buildPageScene(postIt(), registry, ctx, 'flat');
    expect(texts[0]!.fit).toEqual({ width: 144, height: 144, fill: true });
    expect(texts[0]!.color.getHexString()).toBe('000000');
  });
});
