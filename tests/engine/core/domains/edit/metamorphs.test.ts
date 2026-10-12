import { describe, expect, it } from 'vitest';
import { Metamorphs } from '../../../../../src/engine/core/domains/edit/metamorphs';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import type { MetamorphRequest } from '../../../../../src/engine/core/edit/metamorph';
import { setCellStyleValue } from '../../../../../src/engine/core/format/cellEdits';
import { documentFromTree, readDrawio } from '../../../../../src/engine/core/format/parse';
import type { DocumentModel } from '../../../../../src/engine/core/model/types';
import { createDefaultRegistry } from '../../../../../src/engine/plugins';
import { libraryJson } from '../../shapes/library/libraryJson';

const cell = (id: string, value: string, style: string, x: number) =>
  `<mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="0" width="160" height="120" as="geometry"/></mxCell>`;

const METAMORPH = 'rounded=0;whiteSpace=wrap;html=1;spatial.kind=metamorph;';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<UserObject label="Serveur" tooltip="Paiements par carte" id="m">${cell('', '', `${METAMORPH}spatial.metamorph=draft;fontSize=14;`, 0).replace(' id="" value=""', '')}</UserObject>
${cell('waiting', 'Base', `${METAMORPH}spatial.metamorph=ready;`, 200)}
${cell('plain', 'P', 'rounded=0;', 400)}
<mxCell id="e" style="endArrow=classic;" edge="1" parent="1" source="m" target="plain"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

/** Domaine sur un faux cœur : une page, un registre réel, demandes et événements reçus, étapes d'annulation. */
function setup() {
  const { tree } = readDrawio(XML);
  const state = { document: documentFromTree(tree) as DocumentModel };
  const requests: MetamorphRequest[] = [];
  const changes: string[] = [];
  const steps: string[] = [];
  const registry = createDefaultRegistry();
  const page = () => state.document.pages[0]!;
  const core = {
    pages: { getCurrentPage: page, pageById: page },
    targets: { editablePage: () => ({ page: page(), pageTree: tree.pages[0]! }) },
    file: {
      pageTreeOf: () => tree.pages[0]!,
      // Comme le moteur : le document relu est signalé au domaine (`documentChange`).
      documentChanged: () => {
        state.document = documentFromTree(tree);
        metamorphs.documentShown(state.document);
      },
    },
    edits: {
      recordEdit: (label: string) => steps.push(label),
      recordMergeableEdit: (label: string) => steps.push(label),
    },
    registry,
    settings: { shapes: { textSize: 12 } },
    events: {
      emit: (event: string, value: unknown) => {
        if (event === 'metamorphRequest') requests.push(value as MetamorphRequest);
        else changes.push(`${event}:${String(value)}`);
      },
    },
  } as unknown as EngineCore;
  const metamorphs = new Metamorphs(core);
  const shape = (id: string) => page().shapes.find((s) => s.id === id);
  /** Annuler une modification faite entre-temps : l'état d'une Metamorph revient à `value` dans le fichier relu. */
  const rewind = (id: string, value: string) => {
    setCellStyleValue(tree.pages[0]!, id, 'spatial.metamorph', value);
    core.file.documentChanged([]);
  };
  return { metamorphs, shape, requests, changes, steps, registry, rewind, document: () => state.document };
}

/** Propositions de l'hôte : deux formes, l'une sans catégorie. */
const candidates = () =>
  libraryJson({ id: 'a', name: 'Baie' }, { library: { id: 'metamorph-candidates', name: 'Propositions' } });

describe('Metamorph (sujet 538)', () => {
  it('brouillon : instructions écrites, « Valider » écrit l’attente et envoie la demande', () => {
    const { metamorphs, shape, requests, steps } = setup();
    expect(metamorphs.view('plain')).toBeUndefined();
    expect(metamorphs.view('m')).toEqual({ state: 'draft', instructions: '', candidates: [] });
    metamorphs.setInstructions('m', 'Une baie\nbleue');
    expect(metamorphs.view('m')?.instructions).toBe('Une baie\nbleue');
    expect(metamorphs.submit('m')).toBe(true);
    expect(shape('m')?.style['spatial.metamorph']).toBe('morphing');
    expect(requests.filter((r) => r.shapeId === 'm')).toEqual([
      {
        pageId: 'p',
        shapeId: 'm',
        text: 'Serveur',
        comment: 'Paiements par carte',
        instructions: 'Une baie\nbleue',
        width: 160,
        height: 120,
        attempt: 1,
      },
    ]);
    expect(steps).toEqual(['Instructions Metamorph', 'Metamorph validée']);
    // Plus un brouillon : instructions figées, pas de seconde demande.
    metamorphs.setInstructions('m', 'autre');
    expect(metamorphs.submit('m')).toBe(false);
    expect(requests.filter((r) => r.shapeId === 'm')).toHaveLength(1);
  });

  it('propositions reçues : état `ready` sans étape d’annulation, panneau prévenu', () => {
    const { metamorphs, shape, changes, steps } = setup();
    metamorphs.submit('m');
    const result = metamorphs.results('m', candidates());
    expect(result.ok).toBe(true);
    expect(shape('m')?.style['spatial.metamorph']).toBe('ready');
    expect(steps).toEqual(['Metamorph validée']);
    expect(changes).toContain('metamorphChange:m');
    expect(metamorphs.view('m')).toMatchObject({
      state: 'ready',
      candidates: [{ id: 'a', name: 'Baie', icon: '<path d="M4 4L36 4L20 24Z"/>' }],
    });
    // Plus rien n'est attendu : une seconde réponse est refusée.
    expect(metamorphs.results('m', candidates()).ok).toBe(false);
  });

  it('refuse un JSON invalide sans rien changer, et une réponse sans demande', () => {
    const { metamorphs, shape } = setup();
    expect(metamorphs.results('m', candidates()).ok).toBe(false);
    metamorphs.submit('m');
    expect(metamorphs.results('m', { format: 'autre' }).ok).toBe(false);
    expect(shape('m')?.style['spatial.metamorph']).toBe('morphing');
  });

  it('pendant la génération : ni « Réessayer » ni « Reprompt »', () => {
    const { metamorphs, shape, requests, steps } = setup();
    metamorphs.submit('m');
    metamorphs.retry('m');
    metamorphs.reprompt('m');
    expect(shape('m')?.style['spatial.metamorph']).toBe('morphing');
    expect(requests.filter((r) => r.shapeId === 'm')).toHaveLength(1);
    expect(steps).toEqual(['Metamorph validée']);
  });

  it('« Réessayer » : même description, propositions oubliées, nouvelle demande numérotée', () => {
    const { metamorphs, shape, requests, steps } = setup();
    metamorphs.submit('m');
    metamorphs.results('m', candidates());
    metamorphs.retry('m');
    expect(shape('m')?.style['spatial.metamorph']).toBe('morphing');
    expect(metamorphs.view('m')).toMatchObject({ state: 'morphing', candidates: [] });
    expect(requests.filter((r) => r.shapeId === 'm').map((r) => r.attempt)).toEqual([1, 2]);
    expect(steps.at(-1)).toBe('Metamorph relancée');
    expect(metamorphs.results('m', candidates()).ok).toBe(true);
  });

  it('« Reprompt » : retour au brouillon, propositions oubliées, la validation suivante est numérotée', () => {
    const { metamorphs, shape, requests } = setup();
    metamorphs.submit('m');
    metamorphs.results('m', candidates());
    metamorphs.reprompt('m');
    expect(shape('m')?.style['spatial.metamorph']).toBe('draft');
    expect(metamorphs.view('m')?.candidates).toEqual([]);
    expect(metamorphs.results('m', candidates()).ok).toBe(false);
    metamorphs.submit('m');
    expect(requests.filter((r) => r.shapeId === 'm').map((r) => r.attempt)).toEqual([1, 2]);
  });

  it('proposition choisie : même cellule avec le style du modèle, texte et flèche gardés', () => {
    const { metamorphs, shape, registry, document, steps } = setup();
    metamorphs.setInstructions('m', 'Une baie');
    metamorphs.submit('m');
    metamorphs.results('m', candidates());
    expect(metamorphs.accept('m', 'metamorph:a')).toBe(false);
    registry.registerLibrary(
      libraryJson({ id: 'a', category: undefined }, { library: { id: 'metamorph', name: 'M' } }),
    );
    expect(metamorphs.accept('m', 'metamorph:a')).toBe(true);
    const placed = shape('m')!;
    expect(placed.style['spatial.library']).toBe('metamorph');
    expect(placed.style['spatial.kind']).toBe('a');
    expect(placed.style['spatial.metamorph']).toBeUndefined();
    expect(placed.style.fontSize).toBe('14');
    expect(placed.attributes['spatial.metamorphInstructions']).toBeUndefined();
    expect(placed.label).toBe('Serveur');
    expect(placed.bounds).toMatchObject({ x: 0, y: 0, width: 160, height: 120 });
    expect(document().pages[0]!.edges[0]).toMatchObject({ sourceId: 'm', targetId: 'plain' });
    expect(registry.templateOf(placed)?.category).toBe('other');
    expect(metamorphs.view('m')).toBeUndefined();
    expect(steps.at(-1)).toBe('Metamorph remplacée');
  });

  it('document rouvert : une Metamorph prête sans propositions les redemande, montrée en attente', () => {
    const { metamorphs, requests, document } = setup();
    metamorphs.documentShown(document());
    expect(requests.map((r) => [r.shapeId, r.attempt])).toEqual([['waiting', 1]]);
    expect(metamorphs.view('waiting')?.state).toBe('morphing');
    metamorphs.documentShown(document());
    expect(requests).toHaveLength(1);
    expect(metamorphs.results('waiting', candidates()).ok).toBe(true);
    expect(metamorphs.view('waiting')?.state).toBe('ready');
    metamorphs.resetDocument();
    metamorphs.documentShown(document());
    expect(requests).toHaveLength(2);
  });

  it('génération échouée : prête sans propositions, message montré, « Réessayer » et « Reprompt » rendent la main', () => {
    const { metamorphs, shape, requests, steps } = setup();
    expect(metamorphs.failed('m', 'Erreur')).toBe(false);
    metamorphs.submit('m');
    expect(metamorphs.failed('m', 'Serveur injoignable')).toBe(true);
    expect(shape('m')?.style['spatial.metamorph']).toBe('ready');
    expect(steps).toEqual(['Metamorph validée']);
    expect(metamorphs.view('m')).toEqual({
      state: 'ready',
      instructions: '',
      candidates: [],
      error: 'Serveur injoignable',
    });
    metamorphs.retry('m');
    expect(metamorphs.view('m')).toEqual({ state: 'morphing', instructions: '', candidates: [] });
    expect(requests.filter((r) => r.shapeId === 'm').map((r) => r.attempt)).toEqual([1, 2]);
    metamorphs.failed('m', 'Encore');
    metamorphs.reprompt('m');
    expect(metamorphs.view('m')).toEqual({ state: 'draft', instructions: '', candidates: [] });
  });

  it('annuler une modification faite pendant la génération : la forme reste prête, ses propositions gardées', () => {
    const { metamorphs, rewind, requests } = setup();
    metamorphs.submit('m');
    metamorphs.results('m', candidates());
    // La photo d'annulation prise pendant la génération porte encore `morphing`.
    rewind('m', 'morphing');
    expect(metamorphs.view('m')).toMatchObject({ state: 'ready', candidates: [{ id: 'a' }] });
    expect(requests.filter((r) => r.shapeId === 'm')).toHaveLength(1);
    metamorphs.retry('m');
    expect(requests.filter((r) => r.shapeId === 'm')).toHaveLength(2);
  });

  it('annuler « Réessayer » pendant la génération : la forme attend toujours la réponse, puis est prête', () => {
    const { metamorphs, rewind } = setup();
    metamorphs.submit('m');
    metamorphs.results('m', candidates());
    metamorphs.retry('m');
    rewind('m', 'ready');
    expect(metamorphs.view('m')?.state).toBe('morphing');
    expect(metamorphs.results('m', candidates()).ok).toBe(true);
    expect(metamorphs.view('m')?.state).toBe('ready');
  });
});
