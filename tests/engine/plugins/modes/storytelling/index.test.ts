import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { documentFromTree, readDrawio } from '../../../../../src/engine/core/format/parse';
import type { PageModel } from '../../../../../src/engine/core/model/types';
import type { ModeEdit } from '../../../../../src/engine/core/modes/modeEdit';
import { DEFAULT_MODE_EDIT_CONTEXT, applyModeEdit } from '../../../../../src/engine/core/modes/modeEditWriter';
import { buildPageScene } from '../../../../../src/engine/core/render/pageScene';
import type { RenderContext } from '../../../../../src/engine/core/render/types';
import { spatialValue } from '../../../../../src/engine/core/spatial';
import { createDefaultModeRegistry, createDefaultRegistry } from '../../../../../src/engine/plugins';
import { definition as storytelling } from '../../../../../src/engine/plugins/modes/storytelling';
import { storiesExport } from '../../../../../src/engine/plugins/modes/storytelling/export/json';
import { STORY_KEYS, keys } from '../../../../../src/engine/plugins/modes/storytelling/keys';
import {
  COLOR,
  NUMBER,
  repairStories,
  OF,
  setStoryNumber,
  setStoryOf,
  startStory,
  stopStory,
  storyState,
} from '../../../../../src/engine/plugins/modes/storytelling/stories';
import { fixture, MEASURE } from '../../../../helpers';
import { modeHost } from '../../../modeHost';

/** Page `index` de la fixture, et une fonction qui applique une opération puis relit la page. */
function setup(index = 0, palette?: readonly string[]) {
  const { document, tree } = readDrawio(fixture('storytelling.drawio'));
  let page = document.pages[index]!;
  const run = (operation: (edit: ModeEdit) => void): boolean => {
    const context = palette ? { ...DEFAULT_MODE_EDIT_CONTEXT, palette } : undefined;
    const changed = applyModeEdit(page, tree.pages[index]!, STORY_KEYS, operation, context);
    page = documentFromTree(tree).pages[index]!;
    return changed;
  };
  return { run, page: () => page };
}

/** Histoires écrites `numéro : flèches`. */
const stories = (page: PageModel) =>
  storyState(page).stories.map((story) => `${story.number} : ${story.edges.join(' ')}`);
/** Titres des histoires de la fixture : textes des étapes à la suite (sujet 541). */
const TITLES = [
  'Client Passer commande Panier Payer Paiement Expédier Livraison',
  'Admin Contrôler le stock Stock Valider Paiement',
  // « relire » sans texte : omis.
  'Admin Rapport Vérifier Vérification Corriger Rapport',
];
const edge = (page: PageModel, id: string) => page.edges.find((e) => e.id === id)!;
const written = (page: PageModel, id: string, key: string) => spatialValue(edge(page, id), keys.key(key));

describe('mode Story telling (sujet 474) : parcours', () => {
  it('suite écrite sur les flèches (sujet 541) : une flèche dans une seule histoire, boucle arrêtée', () => {
    const { page } = setup();
    expect(stories(page())).toEqual([
      '1 : commander payer expedier',
      // « Expédier » n'est que dans l'histoire 1 : l'histoire 2 s'arrête à Paiement.
      '2 : controler valider',
      // Boucle Rapport → Vérification → Rapport arrêtée.
      '3 : relire verifier corriger',
    ]);
    const { byEdge, issues } = storyState(page());
    expect(byEdge.get('expedier')!.number).toBe(1);
    expect(byEdge.has('reserver')).toBe(false);
    expect(byEdge.has('hors')).toBe(false);
    expect(issues).toEqual([]);
  });

  it('branche (première suivie), flèche hors du fil (à la fin), histoire disparue : signalées', () => {
    const { run, page } = setup();
    run((edit) => {
      setStoryOf(edit, 'reserver', 'commander');
      setStoryOf(edit, 'hors', 'controler');
    });
    // Admin → Client ne part pas de Paiement : hors du fil, à la fin.
    expect(stories(page()).slice(0, 2)).toEqual([
      '1 : commander payer expedier reserver',
      '2 : controler valider hors',
    ]);
    run((edit) => edit.setElementAttribute('valider', OF, 'disparue'));
    expect(storyState(page()).byEdge.has('valider')).toBe(false);
    expect(storyState(page()).issues).toEqual([
      {
        cellId: 'valider',
        message: 'Flèche « Valider » : son histoire n’existe plus',
      },
      {
        cellId: 'paiement',
        message: 'Histoire 1 : plusieurs de ses flèches partent de « Paiement », seule la première est suivie',
      },
      {
        cellId: 'hors',
        message: 'Histoire 2 : la flèche « hors histoire » ne suit pas les précédentes',
      },
    ]);
  });

  it('histoire d’une flèche : une histoire qui existe, jamais sur une flèche numérotée', () => {
    const { run, page } = setup();
    expect(run((edit) => setStoryOf(edit, 'reserver', 'payer'))).toBe(false);
    expect(run((edit) => setStoryOf(edit, 'commander', 'controler'))).toBe(false);
    run((edit) => setStoryOf(edit, 'expedier', undefined));
    expect(written(page(), 'expedier', OF)).toBeUndefined();
    expect(stories(page())[0]).toBe('1 : commander payer');
  });

  it('titre : textes des étapes à la suite, vides omis ; sans aucun texte : « Histoire N »', () => {
    const { page } = setup();
    expect(storyState(page()).stories.map((story) => story.title)).toEqual(TITLES);
    const blank = <T extends { label: string }>(element: T): T => ({ ...element, label: ' \n ' });
    const silent = { ...page(), shapes: page().shapes.map(blank), edges: page().edges.map(blank) };
    expect(storyState(silent).stories.map((story) => story.title)).toEqual(['Histoire 1', 'Histoire 2', 'Histoire 3']);
  });

  it('numéros en désordre remis en ordre : numéro, puis ordre de dessin, illisibles à la fin ; signalé', () => {
    const { page } = setup(1);
    expect(storyState(page()).stories.map((story) => story.id)).toEqual(['trois', 'trois-bis', 'libre', 'illisible']);
    expect(storyState(page()).issues).toEqual([
      { message: 'Numéros des histoires remis en ordre (trous, doublons ou illisibles)' },
    ]);
  });

  it('remise en ordre écrite : numéros consécutifs, couleurs enregistrées', () => {
    const { run, page } = setup(1);
    run(repairStories);
    expect(storyState(page()).issues).toEqual([]);
    expect(['trois', 'trois-bis', 'libre', 'illisible'].map((id) => written(page(), id, NUMBER))).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(written(page(), 'trois', COLOR)).toBe('#dae8fc');
  });
});

describe('mode Story telling : numéros', () => {
  it('ouvrir une histoire : numéro n + 1, première couleur libre de l’appli ; la suite la rejoint', () => {
    const { run, page } = setup(0, ['#dae8fc', '#123456']);
    run((edit) => startStory(edit, 'hors'));
    expect(written(page(), 'hors', NUMBER)).toBe('4');
    expect(written(page(), 'hors', COLOR)).toBe('#123456');
    // Depuis Client (arrivée de « hors »), « Passer commande » est numérotée : rien ne suit.
    expect(stories(page()).at(-1)).toBe('4 : hors');
  });

  it('changer un numéro l’échange avec l’histoire qui l’avait (borné), couleurs inchangées', () => {
    const { run, page } = setup();
    run((edit) => setStoryNumber(edit, 'relire', 1));
    expect(storyState(page()).stories.map((story) => [story.id, story.color])).toEqual([
      ['relire', '#ffe6cc'],
      ['controler', '#d5e8d4'],
      ['commander', '#dae8fc'],
    ]);
    run((edit) => setStoryNumber(edit, 'relire', 99));
    expect(storyState(page()).stories.map((story) => story.id)).toEqual(['commander', 'controler', 'relire']);
  });

  it('retirer un numéro resserre les suivants ; ses flèches n’ont plus d’histoire', () => {
    const { run, page } = setup();
    run((edit) => stopStory(edit, 'commander'));
    expect([written(page(), 'commander', NUMBER), written(page(), 'commander', COLOR)]).toEqual([undefined, undefined]);
    expect([written(page(), 'payer', OF), written(page(), 'expedier', OF)]).toEqual([undefined, undefined]);
    expect(stories(page())).toEqual(['1 : controler valider', '2 : relire verifier corriger']);
  });

  it('flèche numérotée supprimée : les suivants se resserrent, ses flèches n’ont plus d’histoire (remise en ordre)', () => {
    const { document, tree } = readDrawio(fixture('storytelling.drawio'));
    const page = document.pages[0]!;
    const without = { ...page, edges: page.edges.filter((e) => e.id !== 'controler') };
    applyModeEdit(without, tree.pages[0]!, STORY_KEYS, storytelling.lifecycle!.removed!);
    const after = documentFromTree(tree).pages[0]!;
    expect(written(after, 'relire', NUMBER)).toBe('2');
    expect(written(after, 'valider', OF)).toBeUndefined();
    expect(written(after, 'payer', OF)).toBe('commander');
  });

  it('une opération qui ne change rien n’écrit rien', () => {
    const { run } = setup();
    expect(run((edit) => startStory(edit, 'commander'))).toBe(false);
    expect(run((edit) => setStoryNumber(edit, 'commander', 1))).toBe(false);
    expect(run((edit) => stopStory(edit, 'payer'))).toBe(false);
  });

  it('« + » ouvre une histoire ou passe au numéro suivant ; « - » au précédent ; sans effet aux bouts', () => {
    const { run, page } = setup();
    const plus = storytelling.keys!['+']!;
    const minus = storytelling.keys!['-']!;
    expect(plus.applies(page(), edge(page(), 'payer'))).toBe(true);
    expect(minus.applies(page(), edge(page(), 'payer'))).toBe(false);
    run((edit) => plus.run(edit, edge(page(), 'commander'), undefined));
    expect(storyState(page()).stories.map((story) => story.id)).toEqual(['controler', 'commander', 'relire']);
    run((edit) => minus.run(edit, edge(page(), 'commander'), undefined));
    expect(run((edit) => minus.run(edit, edge(page(), 'commander'), undefined))).toBe(false);
    run((edit) => plus.run(edit, edge(page(), 'hors'), undefined));
    expect(written(page(), 'hors', NUMBER)).toBe('4');
  });

  it('réglages de la flèche : début d’histoire, numéro masqué sans numéro, histoire de la flèche', () => {
    const { run, page } = setup();
    const [start, number, story] = storytelling.edges!.properties!;
    expect(start!.value!(page(), edge(page(), 'commander'))).toBe('1');
    expect(start!.value!(page(), edge(page(), 'payer'))).toBeUndefined();
    expect(number!.value!(page(), edge(page(), 'relire'))).toBe('3');
    expect(number!.hidden!(page(), edge(page(), 'payer'))).toBe(true);
    expect(story!.type === 'choice' && story!.options(page(), [])).toEqual([
      { value: '', label: 'Aucune' },
      { value: 'commander', label: `1. ${TITLES[0]}`, color: '#dae8fc' },
      { value: 'controler', label: `2. ${TITLES[1]}`, color: '#d5e8d4' },
      { value: 'relire', label: `3. ${TITLES[2]}`, color: '#ffe6cc' },
    ]);
    expect(story!.value!(page(), edge(page(), 'expedier'))).toBe('commander');
    expect(story!.value!(page(), edge(page(), 'hors'))).toBe('');
    expect(story!.hidden!(page(), edge(page(), 'commander'))).toBe(true);
    expect(story!.hidden!(page(), edge(page(), 'hors'))).toBe(false);
    run((edit) => story!.write!(edit, edge(page(), 'hors'), 'relire'));
    expect(written(page(), 'hors', OF)).toBe('relire');
    // Une flèche de la suite qui ouvre une histoire perd la sienne.
    run((edit) => start!.write!(edit, edge(page(), 'payer'), '1'));
    expect([written(page(), 'payer', NUMBER), written(page(), 'payer', OF)]).toEqual(['4', undefined]);
    run((edit) => start!.write!(edit, edge(page(), 'payer'), undefined));
    expect(written(page(), 'payer', NUMBER)).toBeUndefined();
  });

  it('copier-coller : la copie perd numéro, couleur et histoire', () => {
    expect(storytelling.pasteKeys).toEqual([NUMBER, COLOR, OF]);
  });
});

describe('mode Story telling : habillage et histoire courante', () => {
  const { page } = setup();
  const values = createDefaultModeRegistry().values('storytelling', undefined);

  it('couleur de la seule histoire de la flèche, quelle que soit la courante', () => {
    const dressing = storytelling.dressing!(page(), values, 'controler');
    expect(dressing.edgeColor!(edge(page(), 'verifier'))).toBe('#ffe6cc');
    expect(dressing.edgeColor!(edge(page(), 'expedier'))).toBe('#dae8fc');
    expect(dressing.edgeColor!(edge(page(), 'hors'))).toBeUndefined();
  });

  it('flèches plus épaisses (au moins l’épaisseur du mode) et arrêtées avant les formes (réglages du mode)', () => {
    const dressing = storytelling.dressing!(page(), values);
    expect(dressing.edgeStyle!(edge(page(), 'payer'))).toEqual({ strokeWidth: '3' });
    const thick = { ...edge(page(), 'payer'), style: { ...edge(page(), 'payer').style, strokeWidth: '5' } };
    expect(dressing.edgeStyle!(thick)).toBeUndefined();
    expect(dressing.edgeInset).toBe(10);
  });

  it('pastille du numéro sur la flèche qui ouvre l’histoire seulement', () => {
    const dressing = storytelling.dressing!(page(), values);
    expect(dressing.edgeBadge!(edge(page(), 'controler'))).toEqual({ text: '2', color: '#d5e8d4' });
    expect(dressing.edgeBadge!(edge(page(), 'valider'))).toBeUndefined();
  });

  it('pastille face à la caméra au rendu', () => {
    const ctx: RenderContext = { ...MEASURE, text: { create: () => new Object3D() } };
    const root = buildPageScene(
      page(),
      createDefaultRegistry(),
      ctx,
      'flat',
      modeHost(createDefaultModeRegistry()).host.dressing(page()),
    ).root;
    const object = (id: string) => root.children.find((child) => child.userData.elementId === id)!;
    expect(object('commander').getObjectByName('edge-badge')!.userData.billboard).toBe('screen');
    expect(object('payer').getObjectByName('edge-badge')).toBeUndefined();
  });

  it('courant : la première par défaut, celle d’une flèche cliquée ; flèches et formes de l’histoire nettes', () => {
    const current = storytelling.current!;
    expect(current.initial(page())).toBe('commander');
    expect(current.pick!(page(), edge(page(), 'verifier'))).toBe('relire');
    expect(current.pick!(page(), edge(page(), 'hors'))).toBeUndefined();
    expect(current.label!(page(), 'relire')).toBe(TITLES[2]);
    expect(current.values!(page())).toEqual(['commander', 'controler', 'relire']);
    expect(current.focus!(page(), 'relire')!.sort()).toEqual([
      'admin',
      'corriger',
      'rapport',
      'relire',
      'verif',
      'verifier',
    ]);
    // Pas de barre en haut de la zone de dessin ; Tab passe à l'histoire suivante, en boucle.
    expect(current.color).toBeUndefined();
    const tab = storytelling.pageKeys!.Tab!;
    expect(tab.run(page(), 'controler')).toBe('relire');
    expect(tab.run(page(), 'relire')).toBe('commander');
  });

  it('palette réduite à Acteur, Droid, Rectangle et Metamorph ; tous les modes d’affichage ; ancrage auto, tracé droit, sans grille', () => {
    expect(storytelling.page!.palette!.shapes).toEqual(['actor', 'actor-droid', 'rectangle', 'metamorph']);
    expect(storytelling.page!.viewModes).toBeUndefined();
    expect(storytelling.page!.defaults).toEqual({ anchoring: 'auto', edgeLine: 'straight' });
    // Grille cachée sur la page du mode (sujet 537), gardée sur une page normale.
    const modes = createDefaultModeRegistry();
    expect(modes.showsGrid(page())).toBe(false);
    expect(modes.showsGrid({ ...page(), attributes: {} })).toBe(true);
  });
});

describe('mode Story telling : export JSON', () => {
  it('histoires par numéro, étapes dans l’ordre de la suite, textes des formes reliées', () => {
    const { page } = setup();
    const exported = storiesExport(page());
    expect(exported.stories.map((story) => [story.number, story.title])).toEqual([
      [1, TITLES[0]],
      [2, TITLES[1]],
      [3, TITLES[2]],
    ]);
    expect(exported.stories[0]!.steps).toEqual([
      { label: 'Passer commande', from: 'Client', to: 'Panier' },
      { label: 'Payer', from: 'Panier', to: 'Paiement' },
      { label: 'Expédier', from: 'Paiement', to: 'Livraison' },
    ]);
  });

  it('bout libre : null', () => {
    const { page } = setup(1);
    expect(storiesExport(page()).stories.find((story) => story.title === 'A bout libre')!.steps).toEqual([
      { label: 'bout libre', from: 'A', to: null },
    ]);
  });
});

describe('mode Story telling : flèche tirée (sujets 540, 541)', () => {
  it('avec une histoire courante, elle la continue', () => {
    const { run, page } = setup();
    run((edit) => storytelling.edges!.created!(edit, 'reserver', 'controler'));
    expect(written(page(), 'reserver', OF)).toBe('controler');
  });

  it('sans histoire courante, elle ouvre une histoire', () => {
    const { run, page } = setup();
    run((edit) => storytelling.edges!.created!(edit, 'reserver', undefined));
    expect(storyState(page()).stories.map((story) => story.id)).toEqual([
      'commander',
      'controler',
      'relire',
      'reserver',
    ]);
  });
});
