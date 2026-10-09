import { Mesh, Object3D } from 'three';
import type { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { definition as forest } from '../../../../src/engine/plugins/effects/forest';
import { documentFromTree, readDrawio } from '../../../../src/engine/core/format/parse';
import type { PageModel } from '../../../../src/engine/core/model/types';
import { DEFAULT_MODE_EDIT_CONTEXT, applyModeEdit } from '../../../../src/engine/core/modes/modeEditWriter';
import { definition as sequences } from '../../../../src/engine/plugins/modes/sequences';
import { FLOW, FLOW_COLORS, STEP, readFlows } from '../../../../src/engine/plugins/modes/sequences/flows';
import {
  addFlow,
  removeFlow,
  renameFlow,
  repairSequences,
  sequenceState,
  setEdgeFlow,
  setEdgeStep,
} from '../../../../src/engine/plugins/modes/sequences/steps';
import type { ModeEdit } from '../../../../src/engine/core/modes/modeEdit';
import { darken } from '../../../../src/engine/core/render/styleColors';
import { buildPageScene } from '../../../../src/engine/core/render/pageScene';
import type { RenderContext, TextSpec } from '../../../../src/engine/core/render/types';
import { spatialValue } from '../../../../src/engine/core/spatial';
import { fixture, MEASURE } from '../../../helpers';
import { createDefaultModeRegistry, createDefaultRegistry } from '../../../../src/engine/plugins';
import { SEQUENCES_KEYS, keys } from '../../../../src/engine/plugins/modes/sequences/keys';
import { modeHost } from '../../modeHost';

/** Page `index` de la fixture, et une fonction qui applique une opération puis relit la page. */
function setup(index = 0) {
  const { document, tree } = readDrawio(fixture('sequences.drawio'));
  let page = document.pages[index]!;
  const run = (operation: (edit: ModeEdit) => void): boolean => {
    const changed = applyModeEdit(page, tree.pages[index]!, SEQUENCES_KEYS, operation);
    page = documentFromTree(tree).pages[index]!;
    return changed;
  };
  return { run, page: () => page };
}

/** Flèches de chaque flux, par rang. */
const order = (page: PageModel) => Object.fromEntries(sequenceState(page).members);
const edge = (page: PageModel, id: string) => page.edges.find((e) => e.id === id)!;

describe('mode Séquences (sujet 70) : lecture', () => {
  it('flux ordonnés (id, titre, couleur) et flèches rangées, page cohérente sans avertissement', () => {
    const { page } = setup();
    expect(readFlows(page())).toEqual([
      { id: 'f1', title: 'Connexion', color: '#4e79a7' },
      { id: 'f2', title: 'Paiement « carte »', color: '#f28e2b' },
      { id: 'f3', title: 'Vide', color: '#e15759' },
    ]);
    // `paiement` porte ses attributs sur son objet (« Modifier les données » dans draw.io).
    expect(order(page())).toEqual({ f1: ['login', 'lecture'], f2: ['paiement'], f3: [] });
    expect(sequenceState(page()).issues).toEqual([]);
  });

  it('incohérences remises en ordre au mieux : rang, puis ordre de dessin ; flux inconnu = sans flux', () => {
    const { page } = setup(1);
    expect(order(page())).toEqual({ f1: ['trois', 'trois-bis', 'sept', 'sans-rang'] });
    expect(sequenceState(page()).placement.has('perdu')).toBe(false);
    expect(sequenceState(page()).issues.map((issue) => issue.cellId ?? 'flux')).toEqual(['perdu', 'flux']);
  });

  it('flux illisibles ignorés au mieux (JSON invalide, doublon, couleur invalide)', () => {
    const page = (flows: string) => ({ attributes: { 'spatial.seq.flows': flows } }) as unknown as PageModel;
    expect(readFlows(page('pas du JSON'))).toEqual([]);
    expect(readFlows(page('[{"id":"a","title":"A","color":"rouge"},{"id":"a"},{"title":"sans id"}]'))).toEqual([
      { id: 'a', title: 'A', color: '#dae8fc' },
    ]);
  });
});

describe('mode Séquences : opérations', () => {
  it('couleurs des flux : fonds des styles de forme, à partir de « Bleu »', () => {
    expect(FLOW_COLORS.slice(0, 3)).toEqual(['#dae8fc', '#d5e8d4', '#ffe6cc']);
    expect(FLOW_COLORS).toHaveLength(18);
  });

  it('la couleur d’un nouveau flux vient de la palette passée par l’appli (styles des paramètres)', () => {
    const { page } = setup();
    let id = '';
    const { tree } = readDrawio(fixture('sequences.drawio'));
    applyModeEdit(page(), tree.pages[0]!, SEQUENCES_KEYS, (edit) => (id = addFlow(edit, 'Essai')), {
      ...DEFAULT_MODE_EDIT_CONTEXT,
      palette: ['#4e79a7', '#123456'],
    });
    expect(readFlows(documentFromTree(tree).pages[0]!).find((flow) => flow.id === id)!.color).toBe('#123456');
  });

  it('ajouter un flux : id libre suivant, première couleur libre', () => {
    const { run, page } = setup();
    run((edit) => addFlow(edit, '  Inscription '));
    expect(readFlows(page()).at(-1)).toEqual({ id: 'f4', title: 'Inscription', color: '#dae8fc' });
  });

  it('renommer : les flèches ne bougent pas', () => {
    const { run, page } = setup();
    run((edit) => renameFlow(edit, 'f1', 'Authentification'));
    expect(readFlows(page()).map((flow) => [flow.id, flow.title])).toEqual([
      ['f1', 'Authentification'],
      ['f2', 'Paiement « carte »'],
      ['f3', 'Vide'],
    ]);
    expect(order(page()).f1).toEqual(['login', 'lecture']);
  });

  it('une flèche ajoutée à un flux prend le rang n + 1', () => {
    const { run, page } = setup();
    run((edit) => setEdgeFlow(edit, 'libre', 'f1'));
    expect(order(page()).f1).toEqual(['login', 'lecture', 'libre']);
    expect(spatialValue(edge(page(), 'libre'), keys.key(STEP))).toBe('3');
  });

  it('changer de flux : l’ancien se resserre, la flèche se met à la fin du nouveau', () => {
    const { run, page } = setup();
    run((edit) => setEdgeFlow(edit, 'login', 'f2'));
    expect(order(page())).toMatchObject({ f1: ['lecture'], f2: ['paiement', 'login'] });
    expect(spatialValue(edge(page(), 'lecture'), keys.key(STEP))).toBe('1');
  });

  it('retirer une flèche de son flux efface ses attributs, là où ils étaient (objet)', () => {
    const { run, page } = setup();
    run((edit) => setEdgeFlow(edit, 'paiement', undefined));
    const paiement = edge(page(), 'paiement');
    expect([paiement.attributes[FLOW], paiement.attributes[STEP], paiement.style[FLOW]]).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('changer le rang échange avec la flèche qui l’occupait ; borné à 1…n', () => {
    const { run, page } = setup();
    run((edit) => setEdgeFlow(edit, 'libre', 'f1'));
    run((edit) => setEdgeStep(edit, 'libre', 1));
    expect(order(page()).f1).toEqual(['libre', 'lecture', 'login']);
    run((edit) => setEdgeStep(edit, 'libre', 99));
    expect(order(page()).f1).toEqual(['login', 'lecture', 'libre']);
  });

  it('supprimer un flux : ses flèches perdent flux et rang', () => {
    const { run, page } = setup();
    run((edit) => removeFlow(edit, 'f1'));
    expect(readFlows(page()).map((flow) => flow.id)).toEqual(['f2', 'f3']);
    for (const id of ['login', 'lecture']) {
      expect([spatialValue(edge(page(), id), keys.key(FLOW)), spatialValue(edge(page(), id), keys.key(STEP))]).toEqual([
        undefined,
        undefined,
      ]);
    }
  });

  it('une opération qui ne change rien n’écrit rien', () => {
    const { run } = setup();
    expect(run((edit) => setEdgeFlow(edit, 'login', 'f1'))).toBe(false);
    expect(run((edit) => setEdgeStep(edit, 'login', 1))).toBe(false);
    expect(run((edit) => setEdgeFlow(edit, 'login', 'inconnu'))).toBe(false);
  });

  it('remise en ordre écrite (après une suppression) : rangs consécutifs, flux inconnu retiré', () => {
    const { run, page } = setup(1);
    run(repairSequences);
    expect(sequenceState(page()).issues).toEqual([]);
    expect(
      ['trois', 'trois-bis', 'sept', 'sans-rang'].map((id) => spatialValue(edge(page(), id), keys.key(STEP))),
    ).toEqual(['1', '2', '3', '4']);
    expect(spatialValue(edge(page(), 'perdu'), keys.key(FLOW))).toBeUndefined();
  });
});

describe('mode Séquences : réglages déclarés et habillage', () => {
  const { page } = setup();

  it('flux et rang d’une flèche, rang masqué hors flux', () => {
    const [flow, step] = sequences.edges!.properties!;
    expect(flow!.value!(page(), edge(page(), 'paiement'))).toBe('f2');
    expect(step!.value!(page(), edge(page(), 'lecture'))).toBe('2');
    expect(step!.hidden!(page(), edge(page(), 'libre'))).toBe(true);
    expect(flow!.type === 'choice' && flow!.options(page(), []).map((option) => option.label)).toEqual([
      'Aucun',
      'Connexion',
      'Paiement « carte »',
      'Vide',
    ]);
  });

  it('flèche d’un flux : trait dans la couleur du flux assombrie, pastille du rang ; hors flux : rien', () => {
    const dressing = sequences.dressing!(page(), createDefaultModeRegistry().values('sequences', undefined));
    expect(dressing.edgeColor!(edge(page(), 'login'))).toBe('#4e79a7');
    expect(dressing.edgeBadge!(edge(page(), 'lecture'))).toEqual({ text: '2', color: '#4e79a7' });
    expect(dressing.edgeColor!(edge(page(), 'libre'))).toBeUndefined();
    expect(dressing.edgeBadge!(edge(page(), 'libre'))).toBeUndefined();
  });

  it('couleur assombrie : luminosité × (1 − assombrissement)', () => {
    expect(darken('#ffffff', 0.25)).toBe('#bfbfbf');
    expect(darken('#ffffff', 0)).toBe('#ffffff');
  });

  it('rendu : trait recoloré (style draw.io intact), pastille face à l’écran, plus petite sans texte', () => {
    const texts: TextSpec[] = [];
    const ctx: RenderContext = {
      ...MEASURE,
      text: {
        create(spec) {
          texts.push(spec);
          return new Object3D();
        },
      },
    };
    const modes = createDefaultModeRegistry();
    const root = buildPageScene(
      page(),
      createDefaultRegistry(),
      ctx,
      'flat',
      modeHost(modes).host.dressing(page()),
    ).root;
    const object = (id: string) => root.children.find((child) => child.userData.elementId === id)!;
    const strokeHex = (o: Object3D) =>
      ((o.children.find((c) => c instanceof Mesh) as Mesh).material as MeshBasicMaterial).color.getHexString();

    expect(`#${strokeHex(object('lecture'))}`).toBe(darken('#4e79a7', 0.25));
    expect(edge(page(), 'lecture').style.strokeColor).toBe('#000000');
    expect(strokeHex(object('libre'))).toBe('000000');

    const badge = (id: string) => object(id).getObjectByName('edge-badge');
    expect(badge('libre')).toBeUndefined();
    expect(badge('login')!.userData.billboard).toBe('screen');
    const badgeTexts = texts.filter((spec) => /^\d+$/.test(spec.text));
    expect(badgeTexts.every((spec) => spec.color.getHexString() === '000000' && !spec.bold)).toBe(true);
    // login (texte « login ») : pastille normale ; lecture (sans texte) : plus petite.
    expect(badgeTexts.map((spec) => [spec.text, spec.fontSize])).toEqual(
      expect.arrayContaining([
        ['1', 15],
        ['2', 7],
      ]),
    );
  });
});

describe('flux courant (sujet 79)', () => {
  const current = sequences.current!;

  it('par défaut le premier flux ; une flèche d’un flux le choisit ; un flux disparu ne vaut plus', () => {
    const { page } = setup();
    expect(current.initial(page())).toBe('f1');
    expect(current.pick!(page(), edge(page(), 'paiement'))).toBe('f2');
    expect(current.pick!(page(), edge(page(), 'libre'))).toBeUndefined();
    expect(current.color!(page(), 'f2')).toBe('#f28e2b');
    expect(current.valid(page(), 'f2')).toBe(true);
    expect(current.valid(page(), 'f9')).toBe(false);
    expect(current.values!(page())).toEqual(['f1', 'f2', 'f3']);
    expect(current.label!(page(), 'f2')).toBe('Paiement « carte »');
    expect(current.focus!(page(), 'f1')!.sort()).toEqual(['api', 'client', 'db', 'lecture', 'login']);
    expect(current.focus!(page(), 'f3')).toBeUndefined();
  });

  it('renommer le courant renomme le flux (sujet 88)', () => {
    const { run, page } = setup();
    run((edit) => current.rename!(edit, 'f2', 'Achat'));
    expect(readFlows(page()).find((flow) => flow.id === 'f2')!.title).toBe('Achat');
  });

  it('une flèche créée va à la fin du flux courant', () => {
    const { run, page } = setup();
    // `libre` joue la flèche tout juste créée (sans flux).
    run((edit) => sequences.edges!.created!(edit, 'libre', 'f2'));
    expect(order(page()).f2).toEqual(['paiement', 'libre']);
    expect(run((edit) => sequences.edges!.created!(edit, 'login', undefined))).toBe(false);
  });

  it('« + » / « - » : rang suivant / précédent, sans effet aux bouts ; flèche hors flux non concernée', () => {
    const { run, page } = setup();
    const plus = sequences.keys!['+']!;
    const minus = sequences.keys!['-']!;
    expect(plus.applies(page(), edge(page(), 'libre'))).toBe(false);
    run((edit) => plus.run(edit, edge(page(), 'login'), 'f1'));
    expect(order(page()).f1).toEqual(['lecture', 'login']);
    expect(run((edit) => plus.run(edit, edge(page(), 'login'), 'f1'))).toBe(false);
    run((edit) => minus.run(edit, edge(page(), 'login'), 'f1'));
    expect(order(page()).f1).toEqual(['login', 'lecture']);
    expect(run((edit) => minus.run(edit, edge(page(), 'login'), 'f1'))).toBe(false);
  });
});

describe('pastille : paramètres de la pastille (sujet 77)', () => {
  it('taille, couleurs, gras et assombrissement viennent des réglages du mode (ticket 283)', () => {
    const { page } = setup();
    const texts: TextSpec[] = [];
    const ctx: RenderContext = {
      ...MEASURE,
      text: {
        create(spec) {
          texts.push(spec);
          return new Object3D();
        },
      },
    };
    const dressing = modeHost(createDefaultModeRegistry(), {
      sequences: {
        badgeRadius: 20,
        badgeTextSize: 18,
        badgeSmallRadius: 4,
        badgeSmallTextSize: 6,
        badgeBorderColor: '#ff0000',
        badgeBorderWidth: 0,
        badgeTextColor: '#00ff00',
        badgeBold: true,
        badgeGap: 0,
        badgeLabelFaceCamera: false,
        edgeDarken: 0,
      },
    }).host.dressing(page());
    const root = buildPageScene(page(), createDefaultRegistry(), ctx, 'flat', dressing).root;
    const login = root.children.find((child) => child.userData.elementId === 'login')!;
    const digit = texts.find((spec) => spec.text === '1')!;
    expect([digit.fontSize, digit.bold, digit.color.getHexString()]).toEqual([18, true, '00ff00']);
    // Bordure d'épaisseur nulle : pas de contour ; trait non assombri.
    expect(login.getObjectByName('edge-badge')!.children).toHaveLength(2);
    const stroke = login.children.find((c) => c instanceof Mesh) as Mesh;
    expect((stroke.material as MeshBasicMaterial).color.getHexString()).toBe('4e79a7');
  });
});

describe('pastille et texte face à la caméra (sujet 105)', () => {
  const build = (faceCamera: boolean, labelFaceCamera: boolean) => {
    const { page } = setup();
    const ctx: RenderContext = {
      ...MEASURE,
      text: { create: (spec) => new Object3D().translateX(spec.x).translateY(spec.y) },
    };
    const dressing = modeHost(createDefaultModeRegistry(), {
      sequences: { badgeFaceCamera: faceCamera, badgeLabelFaceCamera: labelFaceCamera },
    }).host.dressing(page());
    const root = buildPageScene(page(), createDefaultRegistry(), ctx, 'flat', dressing).root;
    return root.children.find((child) => child.userData.elementId === 'login')!;
  };

  it('par défaut, pastille et texte se redressent ; le texte pivote sur son ancrage', () => {
    const login = build(true, true);
    expect(login.getObjectByName('edge-badge')!.userData.billboard).toBe('screen');
    const pivot = login.getObjectByName('label-pivot')!;
    expect(pivot.userData.billboard).toBe('screen');
    const label = pivot.getObjectByName('label')!;
    expect([label.position.x, label.position.y]).toEqual([0, 0]);
    expect(pivot.position.x).toBeCloseTo(label.userData.labelAnchor.x);
  });

  it('décochés : pastille et texte restent à plat', () => {
    const login = build(false, false);
    expect(login.getObjectByName('edge-badge')!.userData.billboard).toBeUndefined();
    expect(login.getObjectByName('label-pivot')).toBeUndefined();
    expect(login.getObjectByName('label')).toBeDefined();
  });
});

describe('modes de page (sujet 69) : avertissements', () => {
  it('mode inconnu et données remises en ordre, rattachés à leur page', () => {
    const { document } = readDrawio(fixture('sequences.drawio'));
    const warnings = modeHost().warnings(document);
    expect(warnings.map((w) => [w.pageId, w.cellId])).toEqual([
      ['desordre', 'perdu'],
      ['desordre', undefined],
      ['inconnu', undefined],
    ]);
    expect(warnings.at(-1)!.message).toContain('plus-tard');
  });
});

describe('mode Séquences : vues (sujet 193)', () => {
  it('2D seulement sur une page Séquences, toutes les vues ailleurs', () => {
    const registry = createDefaultModeRegistry();
    const page = (attributes: Record<string, string>) =>
      ({ id: 'p', name: 'P', layers: [], shapes: [], edges: [], attributes }) as unknown as PageModel;
    const modePage = page({ 'spatial.mode': 'sequences' });
    expect(['top', 'iso', '3d'].filter((m) => registry.allowsViewMode(modePage, m as 'top'))).toEqual(['top']);
    expect(registry.viewModeFor(modePage, 'iso')).toBe('top');
    expect(registry.allowsViewMode(page({}), 'iso')).toBe(true);
  });

  it('forêt (iso / 3D) inactive sur une page Séquences, active ailleurs (sujet 196)', () => {
    const registry = createDefaultModeRegistry();
    const page = (attributes: Record<string, string>) =>
      ({ id: 'p', name: 'P', layers: [], shapes: [], edges: [], attributes }) as unknown as PageModel;
    const { host } = modeHost(registry);
    expect(host.allowsEffect(page({ 'spatial.mode': 'sequences' }), forest)).toBe(false);
    expect(host.allowsEffect(page({}), forest)).toBe(true);
    expect(host.allowsEffect(page({ 'spatial.mode': 'sequences' }), { id: 'x', viewModes: ['top'] })).toBe(true);
  });
});
