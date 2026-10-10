import { describe, expect, it } from 'vitest';
import { DocumentFile } from '../../../../../src/engine/core/domains/document/file';
import { EditHistory } from '../../../../../src/engine/core/domains/document/undo';
import { LiveEdit } from '../../../../../src/engine/core/domains/edit/drag/liveEdit';
import { Selections } from '../../../../../src/engine/core/domains/selection/selection';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { PageEffects } from '../../../../../src/engine/core/domains/effects/pageEffects';
import { PageModes } from '../../../../../src/engine/core/domains/modes/pageModes';
import { PluginGuard } from '../../../../../src/engine/core/domains/runtime/pluginGuard';
import { PageEffectRegistry } from '../../../../../src/engine/core/effects/registry';
import { cellLabelValue } from '../../../../../src/engine/core/format/cellEdits';
import type { LabelRewrite } from '../../../../../src/engine/core/format/fileLabels';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import { PageModeRegistry } from '../../../../../src/engine/core/modes/registry';
import { DEFAULT_SETTINGS } from '../../../../../src/engine/core/settings';
import type { PageModel } from '../../../../../src/engine/core/model/types';
import { createDefaultRegistry } from '../../../../../src/engine/plugins';
import { shapeOf } from '../../../../../src/engine/core/model/pageIndex';
import { traced } from '../traced';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
</root></mxGraphModel></diagram>
<diagram id="q" name="Q"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;

/** Document chargé sur un cœur réduit ; `rebound` : pages sur lesquelles la sélection a été reprise. */
function setup() {
  const rebound: PageModel[] = [];
  const core = {
    registry: createDefaultRegistry(),
    pageModes: { withModeWarnings: (document: unknown) => document, fileLabels: () => undefined },
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

/**
 * Cœur traçant (sujet 385) : document, annulation, sélection et suite d'une modification en direct réels ; les autres
 * domaines notent leurs appels, les événements émis aussi, dans l'ordre (`log`).
 */
function tracedSetup(fileLabels: (pages: unknown, direction: string) => LabelRewrite | undefined = () => undefined) {
  const log: string[] = [];
  const documents: unknown[] = [];
  const core = {
    registry: createDefaultRegistry(),
    pageModes: { withModeWarnings: (document: unknown) => document, fileLabels },
    pageEffects: { warnings: () => [] },
    pluginGuard: { warnings: () => [] },
    targets: { isEditable: () => true, canEditNow: () => true },
    canInteract: () => true,
    resetDocumentState: () => log.push('resetDocumentState'),
    events: {
      emit: (name: string, payload: unknown) => {
        log.push(`emit:${name}`);
        if (name === 'documentChange') documents.push(payload);
      },
    },
  } as unknown as Record<string, unknown>;
  const file = new DocumentFile(core as unknown as EngineCore);
  const edits = new EditHistory(core as unknown as EngineCore);
  const selection = new Selections(core as unknown as EngineCore);
  Object.assign(core, {
    file,
    edits,
    selection,
    live: new LiveEdit(core as unknown as EngineCore),
    pages: traced(log, 'pages', {
      currentPageId: 'p',
      getCurrentPage: () => file.document!.pages[0],
      pageById: (id: string) => file.document!.pages.find((p) => p.id === id),
      savedViews: () => new Map(),
    }),
    graph: traced(log, 'graph', { isGraph: () => false }),
    scenes: traced(log, 'scenes', { current: undefined }),
    arrangement: traced(log, 'arrangement', { distributeAfterEdit: () => false }),
    ...Object.fromEntries(
      ['gesture', 'highlight', 'minimap', 'rendering', 'levels', 'labelEditor', 'viewModes', 'pointer', 'keys']
        .concat(['modeCurrents', 'modeFollowUps', 'metrics'])
        .map((name) => [name, traced(log, name)]),
    ),
  });
  const { document, tree } = readDrawio(XML);
  file.replaceDocument(document, tree);
  return { file, edits, selection, live: core.live as LiveEdit, log, documents };
}

/** Traces d'une sélection changée (vidée ou reprise) : contour, événement, survol, indication du mode. */
const SELECTION_SET = [
  'pages.getCurrentPage',
  'highlight.update',
  'highlight.syncAnimation',
  'emit:selectionChange',
  'pointer.syncHoverComment',
  'keys.emitModeHint',
];

describe('événements reçus par l’appli : le document seul émet ses changements (sujet 385)', () => {
  it('annuler / rétablir : document relu, scènes vidées, état « modifié » puis document, retour à la page', () => {
    const { file, edits, selection, log, documents } = tracedSetup();
    edits.recordEdit('Étape');
    selection.selectItems([{ type: 'shape', element: shapeOf(file.document!.pages[0]!, 'a')! }]);
    log.length = 0;
    edits.undo();
    const restored = [
      'graph.invalidate',
      'scenes.clear',
      'graph.isGraph',
      'pages.setCurrent',
      'emit:undoChange',
      'emit:documentChange',
      'pages.goToPage',
    ];
    expect(log).toEqual(['gesture.endMove', ...SELECTION_SET, ...restored]);
    expect(documents).toEqual([file.document]);
    log.length = 0;
    edits.redo();
    // Plus de sélection à vider ; le document redevient modifié.
    expect(log).toEqual(['gesture.endMove', ...restored.slice(0, 4), 'emit:modifiedChange', ...restored.slice(4)]);
    expect(documents[1]).toBe(file.document);
  });

  it('modification en direct écrite : scène gardée, état « modifié » puis document', () => {
    const { file, live, log, documents } = tracedSetup();
    live.afterLiveWrite('p');
    expect(log).toEqual([
      'scenes.invalidate',
      'graph.invalidateWithScenes',
      'highlight.clearVeil',
      'highlight.update',
      'minimap.invalidate',
      'rendering.requestRender',
      'emit:undoChange',
      'emit:documentChange',
    ]);
    expect(documents).toEqual([file.document]);
  });

  it('arbre changé : document relu, sélection reprise par id, puis document émis', () => {
    const { file, selection, log, documents } = tracedSetup();
    selection.selectItems([{ type: 'shape', element: shapeOf(file.document!.pages[0]!, 'a')! }]);
    log.length = 0;
    file.documentChanged(['p']);
    expect(log).toEqual([
      ...SELECTION_SET,
      'arrangement.distributeAfterEdit',
      'levels.rebuildScenes',
      'pages.getCurrentPage',
      'labelEditor.hideEditedLabel',
      ...SELECTION_SET,
      'modeCurrents.pickModeCurrent',
      'rendering.syncBackground',
      'emit:undoChange',
      'emit:documentChange',
      'viewModes.enforce',
      'rendering.requestRender',
    ]);
    expect(documents).toEqual([file.document]);
    expect(selection.current?.items[0]?.element).toBe(shapeOf(file.document!.pages[0]!, 'a'));
  });

  it('fichier chargé : états remis à zéro, chargement émis, première page affichée', async () => {
    const { file, log } = tracedSetup();
    log.length = 0;
    await file.load(XML, 'f');
    expect(log).toEqual([
      'metrics.fileRead',
      'resetDocumentState',
      'emit:load',
      'pages.goToPage',
      'modeFollowUps.documentOpened',
    ]);
  });
});

describe('labels du fichier écrits par un mode (sujets 478, 503)', () => {
  const HEAD = '<b>T</b><br>';
  const fileLabels = (_pages: unknown, direction: string): LabelRewrite =>
    direction === 'export'
      ? (_page, _shape, value) => HEAD + value
      : (_page, _shape, value) => (value.startsWith(HEAD) ? value.slice(HEAD.length) : undefined);

  it('enregistré : labels du mode dans le fichier, arbre du document intact ; rouvert : texte d’avant', async () => {
    const { file } = tracedSetup(fileLabels);
    const xml = file.serialize()!;
    expect(cellLabelValue(readDrawio(xml).tree.pages[0]!, 'a')).toBe(`${HEAD}A`);
    expect(cellLabelValue(file.xmlTree!.pages[0]!, 'a')).toBe('A');
    await file.load(xml, 'f');
    expect(cellLabelValue(file.xmlTree!.pages[0]!, 'a')).toBe('A');
    expect(shapeOf(file.document!.pages[0], 'a')!.label).toBe('A');
  });
});
