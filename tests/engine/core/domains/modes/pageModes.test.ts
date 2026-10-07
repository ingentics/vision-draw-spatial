import { describe, expect, it } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { PageModes } from '../../../../../src/engine/core/domains/modes/pageModes';
import { PluginGuard } from '../../../../../src/engine/core/domains/modes/pluginGuard';
import { PageEffectRegistry } from '../../../../../src/engine/core/effects/registry';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../../src/engine/core/format/write';
import { applyModeEdit } from '../../../../../src/engine/core/modes/modeEdits';
import { PageModeRegistry } from '../../../../../src/engine/core/modes/registry';
import type { PageModeDefinition } from '../../../../../src/engine/core/modes/types';
import { DEFAULT_SETTINGS } from '../../../../../src/engine/core/settings';

const XML = `<mxfile><diagram id="p" name="P" spatial.mode="boom"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="b" value="B" vertex="1" parent="1"><mxGeometry x="300" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="e" edge="1" source="a" target="b" parent="1" style="spatial.broken=x;"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

const fail = (): never => {
  throw new Error('panne');
};

/** Mode de test dont les points d'entrée lèvent une exception. */
const BOOM: PageModeDefinition = {
  id: 'boom',
  name: 'Boom',
  lifecycle: { check: fail },
  dressing: () => ({ edgeColor: fail, edgeBadge: () => ({ text: '1', color: '#ff0000' }) }),
  gestures: {
    placed: (edit) => {
      edit.setPageAttribute('spatial.before', '1');
      fail();
    },
    carries: (_page, shape) => (shape.id === 'a' ? ['b'] : fail()),
    obstacles: fail,
  },
  page: { allowsEffect: (id) => (id === 'refused' ? false : fail()) },
  edges: {
    connects: fail,
    properties: [
      { type: 'text', key: 'spatial.ok', label: 'Correct', value: () => 'calculé', readOnly: () => true },
      { type: 'select', key: 'spatial.broken', label: 'En panne', value: fail, readOnly: fail, options: fail },
      { type: 'toggle', key: 'spatial.hidden', label: 'Masqué', hidden: () => true },
      { type: 'toggle', key: 'spatial.hiddenBroken', label: 'Masquage en panne', hidden: fail },
    ],
  },
};

/** Cœur réduit à ce que le domaine des modes utilise ; `published` compte les republications des Diagnostics. */
function setup() {
  const { document, tree } = readDrawio(XML);
  const state = { published: 0 };
  const core = {
    modes: new PageModeRegistry().register(BOOM),
    effects: new PageEffectRegistry(),
    settings: DEFAULT_SETTINGS,
    pages: { pageById: (id: string) => document.pages.find((p) => p.id === id) },
    file: {
      xmlTree: tree,
      pageTreeOf: () => tree.pages[0],
      publishWarnings: () => state.published++,
    },
  } as unknown as EngineCore;
  const guard = new PluginGuard(core);
  Object.assign(core, { pluginGuard: guard });
  const modes = new PageModes(core);
  Object.assign(core, { pageModes: modes });
  return { document, tree, modes, guard, state, page: document.pages[0]! };
}

describe('hôte des appels aux modes (sujet 288)', () => {
  it('une opération qui lève une exception n’écrit rien', () => {
    const { tree, page } = setup();
    const before = writeDrawio(tree);
    expect(() =>
      applyModeEdit(page, tree.pages[0]!, (edit) => {
        edit.setPageAttribute('spatial.x', '1');
        edit.setElementAttribute('a', 'spatial.y', '2');
        fail();
      }),
    ).toThrow('panne');
    expect(writeDrawio(tree)).toBe(before);
  });

  it('check, dressing, placed, carries, obstacles, connects en panne : repli, rien d’écrit, signalés une fois', async () => {
    const { document, tree, modes, guard, state, page } = setup();
    const before = writeDrawio(tree);
    // Lecture : le document garde ses avertissements, plus l'erreur du mode.
    modes.withModeWarnings(document);
    // Rendu : l'habillage en panne ne colore rien, la pastille reste.
    const dressing = modes.dressing(page)!;
    expect(dressing.edgeColor?.(page.edges[0]!)).toBeUndefined();
    expect(dressing.edgeBadge?.(page.edges[0]!)).toEqual({ text: '1', color: '#ff0000' });
    // Geste : remise en ordre annulée, bornes et accroches comme sans mode.
    expect(modes.shapesPlaced('p', ['a'])).toBe(false);
    expect(writeDrawio(tree)).toBe(before);
    expect(modes.obstacles(page, page.shapes[0]!)).toBeUndefined();
    expect(modes.endAccepts(page, 'target', 'a')?.(page.shapes[1]!)).toBe(true);
    // Formes emportées : celles trouvées avant la panne.
    expect(modes.carried(page, ['a'])).toEqual(['b']);
    expect(guard.warnings().map((w) => w.message)).toEqual([
      'Mode boom : erreur dans lifecycle.check (panne)',
      'Mode boom : erreur dans dressing.edgeColor (panne)',
      'Mode boom : erreur dans gestures.placed (panne)',
      'Mode boom : erreur dans gestures.obstacles (panne)',
      'Mode boom : erreur dans edges.connects (panne)',
      'Mode boom : erreur dans gestures.carries (panne)',
    ]);
    // La deuxième panne d'un même point d'entrée n'est pas signalée à nouveau.
    modes.obstacles(page, page.shapes[0]!);
    expect(guard.warnings()).toHaveLength(6);
    // Les Diagnostics sont republiés une fois, après l'appel en cours.
    await Promise.resolve();
    expect(state.published).toBe(1);
  });

  it('les avertissements du document incluent les erreurs signalées à la lecture', () => {
    const { document, modes } = setup();
    modes.withModeWarnings(document);
    expect(document.warnings).toContainEqual({
      message: 'Mode boom : erreur dans lifecycle.check (panne)',
      level: 'error',
    });
  });

  it('réglages déclarés évalués pour le panneau (sujet 294) : un point d’entrée en panne est traité comme absent', () => {
    const { modes, guard, page } = setup();
    const edge = page.edges[0]!;
    const views = modes.propertyViews(page, 'edge', edge);
    expect(views.map((view) => [view.property.key, view.value, view.readOnly, view.options])).toEqual([
      ['spatial.ok', 'calculé', true, []],
      // Valeur de l'attribut, modifiable, sans choix.
      ['spatial.broken', 'x', false, []],
      ['spatial.hiddenBroken', undefined, false, []],
    ]);
    expect(guard.warnings().map((w) => w.message)).toEqual([
      'Mode boom : erreur dans réglage « spatial.broken » : value (panne)',
      'Mode boom : erreur dans réglage « spatial.broken » : readOnly (panne)',
      'Mode boom : erreur dans réglage « spatial.broken » : options (panne)',
      'Mode boom : erreur dans réglage « spatial.hiddenBroken » : hidden (panne)',
    ]);
  });

  it('allowsEffect en panne : effet permis, modes d’affichage de l’effet toujours vérifiés (dette 296)', () => {
    const { modes, guard, page } = setup();
    expect(modes.allowsEffect(page, { id: 'refused' })).toBe(false);
    expect(modes.allowsEffect(page, { id: 'forest' })).toBe(true);
    expect(guard.warnings().map((w) => w.message)).toEqual(['Mode boom : erreur dans page.allowsEffect (panne)']);
  });
});
