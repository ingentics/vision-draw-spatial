import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../src/engine/format/parse';
import type { PageModel } from '../../../src/engine/model/types';
import { PAGE_MODE_DEFINITIONS, PageModeRegistry } from '../../../src/engine/modes/registry';
import type { PageModeDefinition } from '../../../src/engine/modes/types';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import { Object3D } from 'three';
import { createDefaultRegistry } from '../../../src/engine/shapes/registry';
import { SPATIAL } from '../../../src/engine/spatial';

/** Dossiers des modes : `modes/<id>/index.ts` (moteur) et `app/modes/<id>/index.tsx` (sections React, facultatives). */
const ENGINE = Object.entries(
  import.meta.glob<PageModeDefinition>('../../../src/engine/modes/*/index.ts', { eager: true, import: 'definition' }),
).map(([path, definition]) => ({ folder: path.split('/').at(-2)!, definition }));
const APP = Object.keys(import.meta.glob('../../../src/app/modes/*/index.tsx')).map((path) => path.split('/').at(-2)!);

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
});
