import { setCellObjectAttribute, setCellStyle, setCellStyleValue } from '../../format/cellEdits';
import { setCellWrapperAttribute } from '../../format/create';
import { commentOf } from '../../edit/comment';
import { parseStyle, withStyleDefault } from '../../format/style';
import { metamorphInstructionsOf, metamorphStateOf } from '../../edit/metamorph';
import type { MetamorphCandidate, MetamorphState, MetamorphView } from '../../edit/metamorph';
import type { DocumentModel, ShapeModel } from '../../model/types';
import { shapeOf } from '../../model/pageIndex';
import { styleColorValue } from '../../render/styleColors';
import { readShapeLibrary } from '../../shapes/library/libraryFormat';
import type { LibraryShape, ShapeLibraryResult } from '../../shapes/library/libraryFormat';
import { iconOf } from '../../shapes/library/libraryStore';
import { SPATIAL } from '../../spatial';
import type { EngineCore } from '../EngineCore';

/** Demande envoyée à l'hôte et pas encore satisfaite. */
interface Pending {
  pageId: string;
}

/**
 * Formes Metamorph (sujet 538) : brouillon validé → demande de propositions à l'hôte (`metamorphRequest`) →
 * propositions reçues (`metamorphResults`) → « Réessayer » (nouvelle demande), « Reprompt » (retour au brouillon) ou
 * forme choisie, qui remplace la Metamorph. L'état est écrit dans le fichier ; les demandes en cours et les
 * propositions reçues ne vivent qu'ici, le temps du document.
 */
export class Metamorphs {
  private readonly pending = new Map<string, Pending>();
  private readonly candidates = new Map<string, MetamorphCandidate[]>();
  /** Message de l'hôte quand la génération a échoué (propositions vides : « Réessayer » ou « Reprompt » possibles). */
  private readonly failures = new Map<string, string>();
  /** Demandes faites par forme depuis l'ouverture du document (`MetamorphRequest.attempt`). */
  private readonly attempts = new Map<string, number>();

  constructor(private readonly core: EngineCore) {}

  resetDocument(): void {
    this.pending.clear();
    this.candidates.clear();
    this.failures.clear();
    this.attempts.clear();
  }

  /** Ce que le panneau montre d'une Metamorph de la page courante ; undefined pour une autre forme. */
  view(shapeId: string): MetamorphView | undefined {
    const shape = shapeOf(this.core.pages.getCurrentPage(), shapeId);
    const state = shape && this.stateOf(shape);
    if (!shape || !state) return undefined;
    const error = this.failures.get(shapeId);
    return {
      state,
      instructions: metamorphInstructionsOf(shape),
      candidates: this.candidates.get(shapeId) ?? [],
      ...(error === undefined ? {} : { error }),
    };
  }

  /** Instructions visuelles d'un brouillon (écrites en quittant le champ : une étape d'annulation). */
  setInstructions(shapeId: string, instructions: string): void {
    const target = this.draft(shapeId);
    if (!target || metamorphInstructionsOf(target.shape) === instructions) return;
    this.core.edits.recordEdit('Instructions Metamorph');
    setCellWrapperAttribute(target.pageTree, shapeId, SPATIAL.metamorphInstructions, instructions || undefined);
    this.core.file.documentChanged([target.page.id]);
  }

  /**
   * « Valider » : un brouillon décrit (par son texte, ses instructions ou les deux) passe en attente et sa demande part
   * à l'hôte. Faux s'il n'y a rien à décrire.
   */
  submit(shapeId: string): boolean {
    const target = this.draft(shapeId);
    if (!target || !(target.shape.label.trim() || metamorphInstructionsOf(target.shape).trim())) return false;
    this.core.edits.recordEdit('Metamorph validée');
    // Avant l'écriture : le document relu ne redemande pas ce qui part ici.
    this.pending.set(shapeId, { pageId: target.page.id });
    setCellStyleValue(target.pageTree, shapeId, SPATIAL.metamorph, 'morphing');
    this.core.file.documentChanged([target.page.id]);
    this.request(target.page.id, shapeOf(this.core.pages.pageById(target.page.id), shapeId) ?? target.shape);
    return true;
  }

  /**
   * Propositions de l'hôte pour une demande en cours : un JSON de bibliothèque de formes (sujet 529), une proposition
   * par forme. L'état `ready` est écrit sans étape d'annulation (ce n'est pas un geste de l'utilisateur). Refusé sans
   * demande en cours (brouillon revenu par annuler…) ou si le JSON est invalide.
   */
  results(shapeId: string, json: unknown): ShapeLibraryResult {
    if (!this.pending.has(shapeId)) return { ok: false, errors: [`aucune demande en cours pour la forme ${shapeId}`] };
    const result = readShapeLibrary(json);
    if (!result.ok) return result;
    this.received(shapeId, result.library.shapes.map(candidateOf));
    return result;
  }

  /**
   * Génération échouée chez l'hôte (réponse à `metamorphRequest`) : la forme est prête sans propositions, avec le
   * message `error`, et « Réessayer » ou « Reprompt » rendent la main. Faux sans demande en cours.
   */
  failed(shapeId: string, error: string): boolean {
    if (!this.pending.has(shapeId)) return false;
    this.received(shapeId, [], error);
    return true;
  }

  /**
   * « Réessayer » : même description, propositions oubliées, nouvelle demande à l'hôte. Seulement une fois les
   * propositions reçues : pendant la génération, rien.
   */
  retry(shapeId: string): void {
    const target = this.ready(shapeId);
    if (!target) return;
    this.core.edits.recordEdit('Metamorph relancée');
    this.forget(shapeId);
    this.pending.set(shapeId, { pageId: target.page.id });
    setCellStyleValue(target.pageTree, shapeId, SPATIAL.metamorph, 'morphing');
    this.core.file.documentChanged([target.page.id]);
    this.request(target.page.id, target.shape);
    this.core.events.emit('metamorphChange', shapeId);
  }

  /** « Reprompt » : retour au brouillon (texte et instructions modifiables), une fois les propositions reçues. */
  reprompt(shapeId: string): void {
    const target = this.ready(shapeId);
    if (!target) return;
    this.core.edits.recordEdit('Metamorph à redécrire');
    this.forget(shapeId);
    setCellStyleValue(target.pageTree, shapeId, SPATIAL.metamorph, 'draft');
    this.core.file.documentChanged([target.page.id]);
    this.core.events.emit('metamorphChange', shapeId);
  }

  /**
   * Proposition choisie : la Metamorph prend le style du modèle de palette `templateId` (forme de bibliothèque déjà
   * enregistrée par l'hôte) et perd ce qui en faisait une Metamorph. Même cellule : bornes, texte, parent et flèches
   * attachées restent. Faux si le modèle n'est pas chargé.
   */
  accept(shapeId: string, templateId: string): boolean {
    const target = this.ready(shapeId);
    const template = this.core.registry.templates().find((t) => t.id === templateId && t.library !== undefined);
    if (!target || !template) return false;
    this.core.edits.recordEdit('Metamorph remplacée');
    const fontSize = target.shape.style.fontSize ?? String(this.core.settings.shapes.textSize);
    setCellStyle(target.pageTree, shapeId, withStyleDefault(template.style, 'fontSize', fontSize));
    setCellObjectAttribute(target.pageTree, shapeId, SPATIAL.metamorphInstructions, undefined);
    this.forget(shapeId);
    this.core.file.documentChanged([target.page.id]);
    this.core.events.emit('metamorphChange', shapeId);
    return true;
  }

  /**
   * Document ouvert ou modifié : une Metamorph en attente ou prête sans demande ni propositions en mémoire (fichier
   * rouvert, rétablir…) redemande ses propositions ; ce que gardait une forme revenue au brouillon ou disparue est
   * oublié.
   */
  documentShown(document: DocumentModel): void {
    const waiting = new Map<string, { pageId: string; shape: ShapeModel }>();
    for (const page of document.pages)
      for (const shape of page.shapes) {
        const state = metamorphStateOf(shape);
        if (state === 'morphing' || state === 'ready') waiting.set(shape.id, { pageId: page.id, shape });
      }
    for (const id of [...this.pending.keys(), ...this.candidates.keys()]) if (!waiting.has(id)) this.forget(id);
    for (const [id, { pageId, shape }] of waiting) {
      if (this.pending.has(id) || this.candidates.has(id)) continue;
      this.pending.set(id, { pageId });
      this.request(pageId, shape);
    }
  }

  private request(pageId: string, shape: ShapeModel): void {
    const attempt = (this.attempts.get(shape.id) ?? 0) + 1;
    this.attempts.set(shape.id, attempt);
    this.core.events.emit('metamorphRequest', {
      pageId,
      shapeId: shape.id,
      text: shape.label,
      comment: commentOf(shape)?.text ?? '',
      instructions: metamorphInstructionsOf(shape),
      width: shape.bounds.width,
      height: shape.bounds.height,
      attempt,
    });
  }

  /** Réponse de l'hôte à une demande en cours : propositions (ou échec) gardées, état `ready` écrit sans étape d'annulation. */
  private received(shapeId: string, candidates: MetamorphCandidate[], error?: string): void {
    const pageId = this.pending.get(shapeId)!.pageId;
    this.pending.delete(shapeId);
    this.candidates.set(shapeId, candidates);
    if (error !== undefined) this.failures.set(shapeId, error);
    const pageTree = this.core.file.pageTreeOf(pageId);
    const shape = shapeOf(this.core.pages.pageById(pageId), shapeId);
    if (shape && pageTree && pageTree.encoding !== 'unreadable' && metamorphStateOf(shape) === 'morphing') {
      setCellStyleValue(pageTree, shapeId, SPATIAL.metamorph, 'ready');
      this.core.file.documentChanged([pageId]);
    }
    this.core.events.emit('metamorphChange', shapeId);
  }

  private forget(shapeId: string): void {
    this.pending.delete(shapeId);
    this.candidates.delete(shapeId);
    this.failures.delete(shapeId);
  }

  /**
   * État montré d'une Metamorph : prête dès que ses propositions sont en mémoire, même si le fichier dit encore
   * `morphing` (annuler une modification faite pendant la génération remet cet état) ; en attente tant qu'elles ne le
   * sont pas, même si le fichier dit `ready` (fichier rouvert : elles ont été redemandées).
   */
  private stateOf(shape: ShapeModel): MetamorphState | undefined {
    const state = metamorphStateOf(shape);
    if (state === undefined || state === 'draft') return state;
    return this.candidates.has(shape.id) ? 'ready' : 'morphing';
  }

  private draft(shapeId: string) {
    return this.target(shapeId, ['draft']);
  }

  /** Metamorph prête : ses propositions (ou son échec) sont arrivées (un état `ready` rouvert les attend encore). */
  private ready(shapeId: string) {
    return this.target(shapeId, ['ready']);
  }

  /** Metamorph de la page courante modifiable, dans l'un des états montrés `states`. */
  private target(shapeId: string, states: readonly MetamorphState[]) {
    const editable = this.core.targets.editablePage();
    const shape = shapeOf(editable?.page, shapeId);
    const state = shape && this.stateOf(shape);
    if (!editable || !shape || !state || !states.includes(state)) return undefined;
    return { ...editable, shape };
  }
}

/** Proposition montrée par le panneau : nom, aperçu et couleurs de son style. */
function candidateOf(shape: LibraryShape): MetamorphCandidate {
  const style = parseStyle(shape.style).values;
  const fill = styleColorValue(style, 'fillColor', null);
  const stroke = styleColorValue(style, 'strokeColor', null);
  return {
    id: shape.id,
    name: shape.name,
    ...(shape.description === undefined ? {} : { description: shape.description }),
    icon: iconOf(shape),
    ...(fill ? { fill } : {}),
    ...(stroke ? { stroke } : {}),
  };
}
