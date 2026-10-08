import { describe, expect, it } from 'vitest';
import { DocumentFile } from '../../../../../src/engine/core/domains/document/file';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { PageEffects } from '../../../../../src/engine/core/domains/effects/pageEffects';
import { PageModes } from '../../../../../src/engine/core/domains/modes/pageModes';
import { PluginGuard } from '../../../../../src/engine/core/domains/runtime/pluginGuard';
import { PageEffectRegistry } from '../../../../../src/engine/core/effects/registry';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import { PageModeRegistry } from '../../../../../src/engine/core/modes/registry';
import { DEFAULT_SETTINGS } from '../../../../../src/engine/core/settings';
import type { PageModel } from '../../../../../src/engine/core/model/types';
import { createDefaultRegistry } from '../../../../../src/engine/plugins';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
</root></mxGraphModel></diagram>
<diagram id="q" name="Q"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;

/** Document chargé sur un cœur réduit ; `rebound` : pages sur lesquelles la sélection a été reprise. */
function setup() {
  const rebound: PageModel[] = [];
  const core = {
    registry: createDefaultRegistry(),
    pageModes: { withModeWarnings: (document: unknown) => document },
    pageEffects: { warnings: () => [] },
    pluginGuard: { warnings: () => [] },
    selection: { rebind: (page: PageModel) => rebound.push(page) },
  } as unknown as EngineCore;
  const file = new DocumentFile(core);
  const { document, tree } = readDrawio(XML);
  file.replaceDocument(document, tree);
  const page = (id = 'p') => file.document!.pages.find((p) => p.id === id)!;
  return { file, page, rebound };
}

describe('copie de travail d’un geste (sujet 312)', () => {
  it('pages du document gelées en dev et en test : on ne les modifie pas en place', () => {
    const { page } = setup();
    expect(Object.isFrozen(page())).toBe(true);
    expect(() => {
      (page().shapes[0]!.bounds as { x: number }).x = 10;
    }).toThrow(TypeError);
  });

  it('pendant un geste, la page est une copie modifiable ; à la fin, elle devient la page du document, gelée', () => {
    const { file, page, rebound } = setup();
    const original = page();
    const owner = {};
    const live = file.livePage('p', owner)!;
    expect(live).not.toBe(original);
    expect(page()).toBe(live);
    expect(rebound).toEqual([live]);
    live.shapes[0]!.bounds = { ...live.shapes[0]!.bounds, x: 30 };
    // Même copie tant que le geste dure ; l'original n'a pas bougé.
    expect(file.livePage('p', owner)).toBe(live);
    expect(original.shapes[0]!.bounds.x).toBe(0);
    file.settleLivePage(owner);
    expect(page()).toBe(live);
    expect(Object.isFrozen(live)).toBe(true);
    expect(page().shapes[0]!.bounds.x).toBe(30);
  });

  it('copie partagée par deux détenteurs : close quand le dernier la rend', () => {
    const { file, page } = setup();
    const [drag, text] = [{}, {}];
    const live = file.livePage('p', text)!;
    expect(file.livePage('p', drag)).toBe(live);
    file.settleLivePage(drag);
    expect(Object.isFrozen(page())).toBe(false);
    file.settleLivePage(text);
    expect(Object.isFrozen(page())).toBe(true);
  });

  it('copie d’une autre page : la première est d’abord close ; une relecture abandonne la copie', () => {
    const { file, page } = setup();
    const owner = {};
    const first = file.livePage('p', owner)!;
    file.livePage('q', owner);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(page('q'))).toBe(false);
    const { document, tree } = readDrawio(XML);
    file.replaceDocument(document, tree);
    expect(Object.isFrozen(page('q'))).toBe(true);
    expect(file.livePage('inconnue', owner)).toBeUndefined();
  });
});

describe('avertissements des plugins (sujet 378)', () => {
  const WARNED = `<mxfile><diagram id="p" name="P" spatial.mode="boom"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram>
<diagram id="q" name="Q" spatial.mode="inconnu" spatial.effects="mystere"><mxGraphModel><root><mxCell id="0"/></root></mxGraphModel></diagram></mxfile>`;

  it('modes et effets inconnus, puis erreurs des formes, modes et effets : assemblés à la lecture', () => {
    const fail = (): never => {
      throw new Error('panne');
    };
    const core = {
      registry: createDefaultRegistry(),
      modes: new PageModeRegistry().register({
        id: 'boom',
        namespace: 'boom',
        name: 'Boom',
        lifecycle: { check: fail },
      }),
      effects: new PageEffectRegistry(),
      settings: DEFAULT_SETTINGS,
      file: { publishWarnings: () => {} },
    } as unknown as EngineCore;
    const guard = new PluginGuard(core);
    Object.assign(core, { pluginGuard: guard, pageModes: new PageModes(core), pageEffects: new PageEffects(core) });
    // Erreurs signalées avant la lecture (rendu d'une forme, décor d'un effet).
    guard.reporter('Forme', 'cassee', 'flat.create', new Error('dessin'));
    guard.reporter('Effet', 'brume', 'volume', new Error('décor'));
    const file = new DocumentFile(core);
    const { document, tree } = readDrawio(WARNED);
    file.replaceDocument(document, tree);
    expect(file.document!.warnings.map((w) => [w.pageId, w.message])).toEqual([
      ['q', 'Mode de page inconnu : inconnu'],
      ['q', 'Effet de page inconnu : mystere'],
      [undefined, 'Forme cassee : erreur dans flat.create (dessin)'],
      [undefined, 'Effet brume : erreur dans volume (décor)'],
      // Erreur signalée pendant la lecture même : dans les avertissements du document lu.
      [undefined, 'Mode boom : erreur dans lifecycle.check (panne)'],
    ]);
  });
});
