import { Mesh, Object3D } from 'three';
import type { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { documentFromTree, readDrawio } from '../../../src/engine/format/parse';
import type { PageModel } from '../../../src/engine/model/types';
import { applyModeEdit } from '../../../src/engine/modes/edit';
import { createDefaultModeRegistry } from '../../../src/engine/modes/registry';
import { definition as sequences } from '../../../src/engine/modes/sequences';
import { FLOW, FLOW_COLORS, STEP, flowStrokeColor, readFlows } from '../../../src/engine/modes/sequences/flows';
import {
  addFlow,
  moveFlow,
  removeFlow,
  renameFlow,
  repairSequences,
  sequenceState,
  setEdgeFlow,
  setEdgeStep,
} from '../../../src/engine/modes/sequences/steps';
import type { ModeEdit } from '../../../src/engine/modes/types';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import type { RenderContext, TextSpec } from '../../../src/engine/render/types';
import { createDefaultRegistry } from '../../../src/engine/shapes/registry';
import { spatialValue } from '../../../src/engine/spatial';
import { fixture } from '../../helpers';

/** Page `index` de la fixture, et une fonction qui applique une opération puis relit la page. */
function setup(index = 0) {
  const { document, tree } = readDrawio(fixture('sequences.drawio'));
  let page = document.pages[index]!;
  const run = (operation: (edit: ModeEdit) => void): boolean => {
    const changed = applyModeEdit(page, tree.pages[index]!, operation);
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
    const page = (flows: string) => ({ attributes: { 'spatial.flows': flows } }) as unknown as PageModel;
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

  it('ajouter un flux : id libre suivant, première couleur libre', () => {
    const { run, page } = setup();
    run((edit) => addFlow(edit, '  Inscription '));
    expect(readFlows(page()).at(-1)).toEqual({ id: 'f4', title: 'Inscription', color: '#dae8fc' });
  });

  it('renommer, réordonner : les flèches ne bougent pas', () => {
    const { run, page } = setup();
    run((edit) => renameFlow(edit, 'f1', 'Authentification'));
    run((edit) => moveFlow(edit, 'f3', 0));
    expect(readFlows(page()).map((flow) => [flow.id, flow.title])).toEqual([
      ['f3', 'Vide'],
      ['f1', 'Authentification'],
      ['f2', 'Paiement « carte »'],
    ]);
    expect(order(page()).f1).toEqual(['login', 'lecture']);
  });

  it('une flèche ajoutée à un flux prend le rang n + 1', () => {
    const { run, page } = setup();
    run((edit) => setEdgeFlow(edit, 'libre', 'f1'));
    expect(order(page()).f1).toEqual(['login', 'lecture', 'libre']);
    expect(spatialValue(edge(page(), 'libre'), STEP)).toBe('3');
  });

  it('changer de flux : l’ancien se resserre, la flèche se met à la fin du nouveau', () => {
    const { run, page } = setup();
    run((edit) => setEdgeFlow(edit, 'login', 'f2'));
    expect(order(page())).toMatchObject({ f1: ['lecture'], f2: ['paiement', 'login'] });
    expect(spatialValue(edge(page(), 'lecture'), STEP)).toBe('1');
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
      expect([spatialValue(edge(page(), id), FLOW), spatialValue(edge(page(), id), STEP)]).toEqual([
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
    expect(['trois', 'trois-bis', 'sept', 'sans-rang'].map((id) => spatialValue(edge(page(), id), STEP))).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(spatialValue(edge(page(), 'perdu'), FLOW)).toBeUndefined();
  });
});

describe('mode Séquences : réglages déclarés et habillage', () => {
  const { page } = setup();

  it('flux et rang d’une flèche, rang masqué hors flux', () => {
    const [flow, step] = sequences.edgeProperties!;
    expect(flow!.value!(page(), edge(page(), 'paiement'))).toBe('f2');
    expect(step!.value!(page(), edge(page(), 'lecture'))).toBe('2');
    expect(step!.hidden!(page(), edge(page(), 'libre'))).toBe(true);
    expect(flow!.type === 'select' && flow!.options(page()).map((option) => option.label)).toEqual([
      'Aucun',
      'Connexion',
      'Paiement « carte »',
      'Vide',
    ]);
  });

  it('flèche d’un flux : trait dans la couleur du flux assombrie, pastille du rang ; hors flux : rien', () => {
    const dressing = sequences.dressing!(page());
    expect(dressing.edgeColor!(edge(page(), 'login'))).toBe(flowStrokeColor('#4e79a7'));
    expect(dressing.edgeBadge!(edge(page(), 'lecture'))).toEqual({ text: '2', color: '#4e79a7' });
    expect(dressing.edgeColor!(edge(page(), 'libre'))).toBeUndefined();
    expect(dressing.edgeBadge!(edge(page(), 'libre'))).toBeUndefined();
  });

  it('couleur assombrie : luminosité −25 %', () => {
    expect(flowStrokeColor('#ffffff')).toBe('#bfbfbf');
  });

  it('rendu : trait recoloré (style draw.io intact), pastille face à l’écran, plus petite sans texte', () => {
    const texts: TextSpec[] = [];
    const ctx: RenderContext = {
      text: {
        create(spec) {
          texts.push(spec);
          return new Object3D();
        },
      },
    };
    const modes = createDefaultModeRegistry();
    const root = buildPageScene(page(), createDefaultRegistry(), ctx, 'flat', modes.dressing(page())).root;
    const object = (id: string) => root.children.find((child) => child.userData.elementId === id)!;
    const strokeHex = (o: Object3D) =>
      ((o.children.find((c) => c instanceof Mesh) as Mesh).material as MeshBasicMaterial).color.getHexString();

    expect(`#${strokeHex(object('lecture'))}`).toBe(flowStrokeColor('#4e79a7'));
    expect(edge(page(), 'lecture').style.strokeColor).toBe('#000000');
    expect(strokeHex(object('libre'))).toBe('000000');

    const badge = (id: string) => object(id).getObjectByName('edge-badge');
    expect(badge('libre')).toBeUndefined();
    expect(badge('login')!.userData.billboard).toBe('screen');
    const badgeTexts = texts.filter((spec) => spec.bold && /^\d+$/.test(spec.text));
    expect(badgeTexts.every((spec) => spec.color.getHexString() === '000000')).toBe(true);
    // login (texte « login ») : pastille normale ; lecture (sans texte) : plus petite.
    expect(badgeTexts.map((spec) => [spec.text, spec.fontSize])).toEqual(
      expect.arrayContaining([
        ['1', 15],
        ['2', 7],
      ]),
    );
  });
});

describe('modes de page (sujet 69) : avertissements', () => {
  it('mode inconnu et données remises en ordre, rattachés à leur page', () => {
    const { document } = readDrawio(fixture('sequences.drawio'));
    const warnings = createDefaultModeRegistry().warnings(document);
    expect(warnings.map((w) => [w.pageId, w.cellId])).toEqual([
      ['desordre', 'perdu'],
      ['desordre', undefined],
      ['inconnu', undefined],
    ]);
    expect(warnings.at(-1)!.message).toContain('plus-tard');
  });
});
