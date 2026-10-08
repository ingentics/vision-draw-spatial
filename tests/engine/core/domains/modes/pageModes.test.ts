import { describe, expect, it } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { PageModes } from '../../../../../src/engine/core/domains/modes/pageModes';
import { ShapeParts } from '../../../../../src/engine/core/domains/modes/shapeParts';
import { PluginGuard } from '../../../../../src/engine/core/domains/modes/pluginGuard';
import { PageEffectRegistry } from '../../../../../src/engine/core/effects/registry';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../../src/engine/core/format/write';
import { removeCells } from '../../../../../src/engine/core/format/create';
import { applyModeEdit } from '../../../../../src/engine/core/modes/modeEdits';
import { PageModeRegistry } from '../../../../../src/engine/core/modes/registry';
import type { PageModeDefinition } from '../../../../../src/engine/core/modes/types';
import { DEFAULT_SETTINGS } from '../../../../../src/engine/core/settings';

const XML = `<mxfile><diagram id="p" name="P" spatial.mode="boom"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="b" value="B" vertex="1" parent="1"><mxGeometry x="300" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="e" edge="1" source="a" target="b" parent="1" style="spatial.boom.broken=x;"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

const fail = (): never => {
  throw new Error('panne');
};

/** Mode de test dont les points d'entrée lèvent une exception. */
const BOOM: PageModeDefinition = {
  id: 'boom',
  namespace: 'boom',
  name: 'Boom',
  lifecycle: { check: fail },
  dressing: () => ({ edgeColor: fail, edgeBadge: () => ({ text: '1', color: '#ff0000' }) }),
  gestures: {
    placed: (edit) => {
      edit.setPageAttribute('before', '1');
      fail();
    },
    carries: (_page, shape) => (shape.id === 'a' ? ['b'] : fail()),
    obstacles: fail,
  },
  page: { allowsEffect: (id) => (id === 'refused' ? false : fail()) },
  edges: {
    connects: fail,
    properties: [
      { type: 'text', key: 'ok', label: 'Correct', value: () => 'calculé', readOnly: () => true },
      { type: 'select', key: 'broken', label: 'En panne', value: fail, readOnly: fail, options: fail },
      { type: 'toggle', key: 'hidden', label: 'Masqué', hidden: () => true },
      { type: 'toggle', key: 'hiddenBroken', label: 'Masquage en panne', hidden: fail },
    ],
  },
};

/** Cœur réduit à ce que le domaine des modes utilise ; `published` compte les republications des Diagnostics. */
function setup(mode: PageModeDefinition = BOOM) {
  const { document, tree } = readDrawio(XML);
  const state = { published: 0, snapshots: [] as string[], changed: 0 };
  const editable = () => ({ page: document.pages[0]!, pageTree: tree.pages[0]!, xmlTree: tree });
  const core = {
    modes: new PageModeRegistry().register(mode),
    effects: new PageEffectRegistry(),
    settings: DEFAULT_SETTINGS,
    pages: { pageById: (id: string) => document.pages.find((p) => p.id === id) },
    targets: { editablePage: editable, editablePageById: (id: string) => (id === 'p' ? editable() : undefined) },
    edits: { recordSnapshot: (label: string) => state.snapshots.push(label) },
    modeCurrents: { getModeCurrent: () => undefined },
    file: {
      xmlTree: tree,
      pageTreeOf: () => tree.pages[0],
      publishWarnings: () => state.published++,
      documentChanged: () => state.changed++,
    },
  } as unknown as EngineCore;
  const guard = new PluginGuard(core);
  Object.assign(core, { pluginGuard: guard });
  const modes = new PageModes(core);
  Object.assign(core, { pageModes: modes, shapeParts: new ShapeParts(core) });
  return { core, document, tree, modes, guard, state, page: document.pages[0]! };
}

describe('hôte des appels aux modes (sujet 288)', () => {
  it('une opération qui lève une exception n’écrit rien', () => {
    const { tree, page } = setup();
    const before = writeDrawio(tree);
    expect(() =>
      applyModeEdit(page, tree.pages[0]!, BOOM, (edit) => {
        edit.setPageAttribute('x', '1');
        edit.setElementAttribute('a', 'y', '2');
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
    expect(modes.endAccepts(page, 'target', 'a')?.(page.shapes[1]!, { x: 0, y: 0 })).toBe(true);
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
      ['ok', 'calculé', true, []],
      // Valeur de l'attribut, modifiable, sans choix.
      ['broken', 'x', false, []],
      ['hiddenBroken', undefined, false, []],
    ]);
    expect(guard.warnings().map((w) => w.message)).toEqual([
      'Mode boom : erreur dans réglage « broken » : value (panne)',
      'Mode boom : erreur dans réglage « broken » : readOnly (panne)',
      'Mode boom : erreur dans réglage « broken » : options (panne)',
      'Mode boom : erreur dans réglage « hiddenBroken » : hidden (panne)',
    ]);
  });

  it('allowsEffect en panne : effet permis, modes d’affichage de l’effet toujours vérifiés (dette 296)', () => {
    const { modes, guard, page } = setup();
    expect(modes.allowsEffect(page, { id: 'refused' })).toBe(false);
    expect(modes.allowsEffect(page, { id: 'forest' })).toBe(true);
    expect(guard.warnings().map((w) => w.message)).toEqual(['Mode boom : erreur dans page.allowsEffect (panne)']);
  });
});

describe('écritures d’une opération de mode qui échouent en route (sujet 302)', () => {
  it('une écriture vers une cellule disparue : arbre inchangé, pas d’étape d’annulation, erreur signalée', () => {
    const { tree, modes, guard, state } = setup();
    // Le modèle de la page a encore `b`, l'arbre ne l'a plus : l'écriture vers `b` échoue une fois appliquée.
    removeCells(tree.pages[0]!, ['b']);
    const before = writeDrawio(tree);
    const changed = modes.editPageMode('Essai', (edit) => {
      edit.setPageAttribute('x', '1');
      edit.setElementAttribute('a', 'y', '2');
      edit.setElementAttribute('b', 'z', '3');
    });
    expect(changed).toBe(false);
    expect(writeDrawio(tree)).toBe(before);
    expect(state.snapshots).toEqual([]);
    expect(state.changed).toBe(0);
    expect(guard.warnings().map((w) => w.message)).toEqual([
      'Mode boom : erreur dans opération « Essai » (Cellule b introuvable)',
    ]);
  });
});

/** Mode de test dont les points d'entrée écrivent dans la page qu'on leur remet. */
const WRITER: PageModeDefinition = {
  id: 'boom',
  namespace: 'boom',
  name: 'Boom',
  dressing: (page) => {
    (page.shapes[0]!.bounds as { x: number }).x = 999;
    return {};
  },
  edges: {
    connects: (page) => {
      (page.shapes as unknown[]).length = 0;
      return true;
    },
  },
  parts: {
    dropAt: (page) => {
      (page.edges[0]!.style as Record<string, string>).stroke = 'x';
      return undefined;
    },
    bounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
    at: () => undefined,
    move: () => undefined,
  },
};

describe('page remise aux plugins pendant un geste (sujet 324)', () => {
  it('habillage, accroche et glisser de partie qui écrivent : modèle intact, erreur signalée une fois', () => {
    const { core, modes, guard, page } = setup(WRITER);
    // La page du document n'est pas gelée ici : c'est la copie de travail d'un geste.
    expect(Object.isFrozen(page)).toBe(false);
    const snapshot = JSON.stringify(page);
    expect(modes.dressing(page)).toBeUndefined();
    expect(modes.endAccepts(page, 'target', 'a')?.(page.shapes[1]!, { x: 0, y: 0 })).toBe(true);
    const parts = new ShapeParts(core);
    expect(parts.dropAt(page, page.shapes[0]!, 'p', { x: 0, y: 0 })).toBeUndefined();
    expect(JSON.stringify(page)).toBe(snapshot);
    expect(guard.warnings().map((w) => w.message)).toEqual([
      expect.stringMatching(/^Mode boom : erreur dans dressing \(/),
      expect.stringMatching(/^Mode boom : erreur dans edges\.connects \(/),
      expect.stringMatching(/^Mode boom : erreur dans parts\.dropAt \(/),
    ]);
    modes.dressing(page);
    expect(guard.warnings()).toHaveLength(3);
  });
});

describe('flèche qui arrive sur une partie (sujet 333)', () => {
  /** Mode dont `connects` et les suites notent la partie reçue ; les parties sont « haut » (y < 30) et « bas ». */
  function spy() {
    const seen = {
      connects: [] as Array<string | undefined>,
      created: [] as Array<string | undefined>,
      reconnected: [] as Array<string | undefined>,
    };
    const mode: PageModeDefinition = {
      id: 'boom',
      namespace: 'boom',
      name: 'Boom',
      edges: {
        connects: (_page, _source, _target, part) => (seen.connects.push(part), true),
        created: (_edit, _id, _current, part) => void seen.created.push(part),
        reconnected: (_edit, _id, part) => void seen.reconnected.push(part),
      },
      parts: {
        at: (_page, _shape, point) => (point.y < 30 ? 'haut' : 'bas'),
        bounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
      },
    };
    return { seen, ...setup(mode) };
  }

  it('endAccepts passe à connects la partie sous le point, au bout d’arrivée seulement', () => {
    const { seen, modes, page } = spy();
    const b = page.shapes[1]!;
    modes.endAccepts(page, 'target', 'a')?.(b, { x: 310, y: 5 });
    modes.endAccepts(page, 'target', 'a')?.(b, { x: 310, y: 50 });
    modes.endAccepts(page, 'source', 'a')?.(b, { x: 310, y: 5 });
    expect(seen.connects).toEqual(['haut', 'bas', undefined]);
  });

  it('created et reconnected reçoivent la partie visée (et rien si le départ est rebranché)', () => {
    const { seen, modes } = spy();
    modes.edgeCreated('p', 'e', 'haut');
    modes.edgeReconnected('p', 'e', 'bas');
    modes.edgeReconnected('p', 'e');
    expect(seen.created).toEqual(['haut']);
    expect(seen.reconnected).toEqual(['bas', undefined]);
  });
});
