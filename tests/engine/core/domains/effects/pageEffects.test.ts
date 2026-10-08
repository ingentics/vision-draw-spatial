import { afterEach, describe, expect, it, vi } from 'vitest';
import { Object3D } from 'three';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { PageEffects } from '../../../../../src/engine/core/domains/effects/pageEffects';
import { PageModes } from '../../../../../src/engine/core/domains/modes/pageModes';
import { PluginGuard } from '../../../../../src/engine/core/domains/runtime/pluginGuard';
import { PageEffectRegistry } from '../../../../../src/engine/core/effects/registry';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../../src/engine/core/format/write';
import { PageModeRegistry } from '../../../../../src/engine/core/modes/registry';
import { DEFAULT_SETTINGS } from '../../../../../src/engine/core/settings';

/** Page normale `p` (deux effets écrits) et page `s` d'un mode qui refuse le décor. */
const XML = `<mxfile><diagram id="p" name="P" spatial.effects="boom,decor"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram>
<diagram id="s" name="S" spatial.mode="sobre" spatial.effects="decor"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>`;

/** Hôte des effets sur un cœur réduit : registres réels, hôte des modes, rapporteur ; `state` : étapes et relectures. */
function setup() {
  const { document, tree } = readDrawio(XML);
  const state = { edits: [] as string[], changed: [] as string[][] };
  const effects = new PageEffectRegistry()
    .register({
      id: 'boom',
      name: 'Boom',
      volume: () => {
        throw new Error('panne');
      },
    })
    .register({ id: 'decor', name: 'Décor', volume: () => new Object3D() })
    .register({ id: 'plat', name: 'Plat' });
  const modes = new PageModeRegistry().register({
    id: 'sobre',
    namespace: 'sobre',
    name: 'Sobre',
    page: { allowsEffect: (id) => id !== 'decor' },
  });
  const core = {
    modes,
    effects,
    settings: DEFAULT_SETTINGS,
    targets: {
      editablePageById: (id: string) => {
        const index = document.pages.findIndex((p) => p.id === id);
        return index < 0 ? undefined : { page: document.pages[index]!, pageTree: tree.pages[index]! };
      },
    },
    edits: { recordEdit: (label: string) => state.edits.push(label) },
    file: { publishWarnings: () => {}, documentChanged: (ids: string[]) => state.changed.push(ids) },
  } as unknown as EngineCore;
  const guard = new PluginGuard(core);
  const host = new PageEffects(core);
  Object.assign(core, { pluginGuard: guard, pageModes: new PageModes(core), pageEffects: host });
  const page = (id: string) => document.pages.find((p) => p.id === id)!;
  return { host, guard, state, tree, page };
}

describe('hôte des effets de page (sujet 378)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('effets possibles : tous sur une page normale, sans ceux que le mode refuse', () => {
    const { host, page } = setup();
    expect(host.allowed(page('p'))).toEqual(['boom', 'decor', 'plat']);
    expect(host.allowed(page('s'))).toEqual(['boom', 'plat']);
  });

  it('volume : seulement par un effet actif et permis', () => {
    const { host, page } = setup();
    expect(host.hasVolume(page('p'))).toBe(true);
    expect(host.hasVolume(page('s'))).toBe(false);
  });

  it('décor en panne : omis, signalé « Effet <id> » dans les Diagnostics ; un décor refusé par le mode n’est pas posé', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host, guard, page } = setup();
    const root = new Object3D();
    host.decorate(page('p'), root);
    expect(root.children.map((child) => child.name)).toEqual(['effect:decor']);
    expect(guard.warnings().map((w) => w.message)).toEqual(['Effet boom : erreur dans volume (panne)']);
    const refused = new Object3D();
    host.decorate(page('s'), refused);
    expect(refused.children).toEqual([]);
  });

  it('activer, retirer : écrit dans spatial.effects en une étape ; rien si déjà dans cet état', () => {
    const { host, state, tree } = setup();
    host.setPageEffect('s', 'plat', true);
    expect(writeDrawio(tree)).toContain('spatial.effects="decor,plat"');
    host.setPageEffect('p', 'decor', true);
    host.setPageEffect('inconnue', 'decor', true);
    expect(state.edits).toEqual(['Effet Plat']);
    expect(state.changed).toEqual([['s']]);
  });
});
