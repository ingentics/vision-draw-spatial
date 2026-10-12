import { setCellObjectAttribute, setCellStyle, setCellStyleValue } from '../../format/cellEdits';
import { setCellWrapperAttribute } from '../../format/create';
import { commentOf } from '../../edit/comment';
import { parseStyle, withStyleDefault } from '../../format/style';
import { generationInstructionsOf, generationStateOf } from '../../edit/generation';
import type { GenerationCandidate, GenerationState, GenerationView, ShapeGeneration } from '../../edit/generation';
import type { DocumentModel, ShapeModel } from '../../model/types';
import { byId, shapeOf } from '../../model/pageIndex';
import { styleColorValue } from '../../render/styleColors';
import { readShapeLibrary } from '../../shapes/library/libraryFormat';
import type { LibraryShape, ShapeLibraryResult } from '../../shapes/library/libraryFormat';
import { iconOf } from '../../shapes/library/libraryStore';
import type { EngineCore } from '../EngineCore';

/** Demande envoyée à l'hôte et pas encore satisfaite. */
interface Pending {
  pageId: string;
}

/**
 * Formes générées par l'hôte (sujets 538, 545 ; ex. Metamorph) : brouillon validé → demande de propositions à l'hôte
 * (`generationRequest`) → propositions reçues (`generationResults`) ou échec (`generationFailed`) → « Réessayer »
 * (nouvelle demande), « Reprompt » (retour au brouillon) ou forme choisie, qui remplace la forme générée. L'état est
 * écrit dans le fichier, sous les clés que déclare la forme (`ShapeDefinition.generation`) ; les demandes en cours et
 * les propositions reçues ne vivent qu'ici, le temps du document. Les étapes d'annulation portent le titre de la forme
 * (ex. « Metamorph validée »).
 */
export class GeneratedShapes {
  private readonly pending = new Map<string, Pending>();
  private readonly candidates = new Map<string, GenerationCandidate[]>();
  /** Message de l'hôte quand la génération a échoué (propositions vides : « Réessayer » ou « Reprompt » possibles). */
  private readonly failures = new Map<string, string>();
  /** Demandes faites par forme depuis l'ouverture du document (`GenerationRequest.attempt`). */
  private readonly attempts = new Map<string, number>();

  constructor(private readonly core: EngineCore) {}

  resetDocument(): void {
    this.pending.clear();
    this.candidates.clear();
    this.failures.clear();
    this.attempts.clear();
  }

  /** Ce que le panneau montre d'une forme générée de la page courante ; undefined pour une autre forme. */
  view(shapeId: string): GenerationView | undefined {
    const shape = shapeOf(this.core.pages.getCurrentPage(), shapeId);
    const generation = shape && this.generationOf(shape);
    const state = generation && this.stateOf(shape, generation);
    if (!shape || !generation || !state) return undefined;
    const error = this.failures.get(shapeId);
    return {
      title: generation.title,
      state,
      instructions: generationInstructionsOf(shape, generation),
      candidates: this.candidates.get(shapeId) ?? [],
      ...(error === undefined ? {} : { error }),
    };
  }

  /** Instructions visuelles d'un brouillon (écrites en quittant le champ : une étape d'annulation). */
  setInstructions(shapeId: string, instructions: string): void {
    const target = this.draft(shapeId);
    if (!target || generationInstructionsOf(target.shape, target.generation) === instructions) return;
    this.core.edits.recordEdit(`Instructions ${target.generation.title}`);
    setCellWrapperAttribute(target.pageTree, shapeId, target.generation.instructionsKey, instructions || undefined);
    this.core.file.documentChanged([target.page.id]);
  }

  /**
   * « Valider » : un brouillon décrit (par son texte, ses instructions ou les deux) passe en attente et sa demande part
   * à l'hôte. Faux s'il n'y a rien à décrire.
   */
  submit(shapeId: string): boolean {
    const target = this.draft(shapeId);
    if (!target) return false;
    const { page, pageTree, shape, generation } = target;
    if (!(shape.label.trim() || generationInstructionsOf(shape, generation).trim())) return false;
    this.core.edits.recordEdit(`${generation.title} validée`);
    // Avant l'écriture : le document relu ne redemande pas ce qui part ici.
    this.pending.set(shapeId, { pageId: page.id });
    setCellStyleValue(pageTree, shapeId, generation.stateKey, generation.states.pending);
    this.core.file.documentChanged([page.id]);
    this.request(page.id, shapeOf(this.core.pages.pageById(page.id), shapeId) ?? shape, generation);
    return true;
  }

  /**
   * Propositions de l'hôte pour une demande en cours : un JSON de bibliothèque de formes (sujet 529), une proposition
   * par forme. L'état `ready` est écrit sans étape d'annulation (ce n'est pas un geste de l'utilisateur). Refusé sans
   * demande en cours (brouillon revenu par annuler…) ou si le JSON est invalide.
   */
  results(shapeId: string, json: unknown): ShapeLibraryResult {
    if (!this.waits(shapeId)) return { ok: false, errors: [`aucune demande en cours pour la forme ${shapeId}`] };
    const result = readShapeLibrary(json);
    if (!result.ok) return result;
    this.received(shapeId, result.library.shapes.map(candidateOf));
    return result;
  }

  /**
   * Génération échouée chez l'hôte (réponse à `generationRequest`) : la forme est prête sans propositions, avec le
   * message `error`, et « Réessayer » ou « Reprompt » rendent la main. Faux sans demande en cours.
   */
  failed(shapeId: string, error: string): boolean {
    if (!this.waits(shapeId)) return false;
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
    this.core.edits.recordEdit(`${target.generation.title} relancée`);
    this.forget(shapeId);
    this.pending.set(shapeId, { pageId: target.page.id });
    setCellStyleValue(target.pageTree, shapeId, target.generation.stateKey, target.generation.states.pending);
    this.core.file.documentChanged([target.page.id]);
    this.request(target.page.id, target.shape, target.generation);
    this.core.events.emit('generationChange', shapeId);
  }

  /** « Reprompt » : retour au brouillon (texte et instructions modifiables), une fois les propositions reçues. */
  reprompt(shapeId: string): void {
    const target = this.ready(shapeId);
    if (!target) return;
    this.core.edits.recordEdit(`${target.generation.title} à redécrire`);
    this.forget(shapeId);
    setCellStyleValue(target.pageTree, shapeId, target.generation.stateKey, target.generation.states.draft);
    this.core.file.documentChanged([target.page.id]);
    this.core.events.emit('generationChange', shapeId);
  }

  /**
   * Proposition choisie : la forme prend le style du modèle de palette `templateId` (forme de bibliothèque déjà
   * enregistrée par l'hôte) et perd ce qui en faisait une forme générée. Même cellule : bornes, texte, parent et
   * flèches attachées restent. Faux si le modèle n'est pas chargé.
   */
  accept(shapeId: string, templateId: string): boolean {
    const target = this.ready(shapeId);
    const template = byId(this.core.registry.templates(), templateId);
    if (!target || template?.library === undefined) return false;
    this.core.edits.recordEdit(`${target.generation.title} remplacée`);
    const fontSize = target.shape.style.fontSize ?? String(this.core.settings.shapes.textSize);
    setCellStyle(target.pageTree, shapeId, withStyleDefault(template.style, 'fontSize', fontSize));
    setCellObjectAttribute(target.pageTree, shapeId, target.generation.instructionsKey, undefined);
    this.forget(shapeId);
    this.core.file.documentChanged([target.page.id]);
    this.core.events.emit('generationChange', shapeId);
    return true;
  }

  /**
   * Document ouvert ou modifié : une forme en attente ou prête sans demande ni propositions en mémoire (fichier
   * rouvert, rétablir…) redemande ses propositions ; ce que gardait une forme revenue au brouillon ou disparue est
   * oublié.
   */
  documentShown(document: DocumentModel): void {
    const waiting = new Map<string, { pageId: string; shape: ShapeModel; generation: ShapeGeneration }>();
    for (const page of document.pages)
      for (const shape of page.shapes) {
        const generation = this.generationOf(shape);
        const state = generation && generationStateOf(shape, generation);
        if (generation && (state === 'pending' || state === 'ready'))
          waiting.set(shape.id, { pageId: page.id, shape, generation });
      }
    for (const id of [...this.pending.keys(), ...this.candidates.keys()]) if (!waiting.has(id)) this.forget(id);
    for (const [id, { pageId, shape, generation }] of waiting) {
      if (this.pending.has(id) || this.candidates.has(id)) continue;
      this.pending.set(id, { pageId });
      this.request(pageId, shape, generation);
    }
  }

  private request(pageId: string, shape: ShapeModel, generation: ShapeGeneration): void {
    const attempt = (this.attempts.get(shape.id) ?? 0) + 1;
    this.attempts.set(shape.id, attempt);
    this.core.events.emit('generationRequest', {
      pageId,
      shapeId: shape.id,
      kind: this.core.registry.resolve(shape).definition.id,
      text: shape.label,
      comment: commentOf(shape)?.text ?? '',
      instructions: generationInstructionsOf(shape, generation),
      width: shape.bounds.width,
      height: shape.bounds.height,
      attempt,
    });
  }

  /** Réponse de l'hôte à une demande en cours : propositions (ou échec) gardées, état `ready` écrit sans étape d'annulation. */
  private received(shapeId: string, candidates: GenerationCandidate[], error?: string): void {
    const pageId = this.pending.get(shapeId)!.pageId;
    this.pending.delete(shapeId);
    this.candidates.set(shapeId, candidates);
    if (error !== undefined) this.failures.set(shapeId, error);
    const pageTree = this.core.file.pageTreeOf(pageId);
    const shape = shapeOf(this.core.pages.pageById(pageId), shapeId);
    const generation = shape && this.generationOf(shape);
    if (shape && generation && pageTree && pageTree.encoding !== 'unreadable') {
      if (generationStateOf(shape, generation) === 'pending') {
        setCellStyleValue(pageTree, shapeId, generation.stateKey, generation.states.ready);
        this.core.file.documentChanged([pageId]);
      }
    }
    this.core.events.emit('generationChange', shapeId);
  }

  /** Une réponse de l'hôte est-elle attendue pour la forme ? Jamais après la fin du moteur (réponse tardive). */
  private waits(shapeId: string): boolean {
    return !this.core.disposed && this.pending.has(shapeId);
  }

  private forget(shapeId: string): void {
    this.pending.delete(shapeId);
    this.candidates.delete(shapeId);
    this.failures.delete(shapeId);
  }

  /** Génération déclarée par la définition de la forme ; undefined pour une autre forme. */
  private generationOf(shape: ShapeModel): ShapeGeneration | undefined {
    return this.core.registry.resolve(shape).definition.generation;
  }

  /**
   * État montré : prête dès que ses propositions sont en mémoire, même si le fichier dit encore `pending` (annuler une
   * modification faite pendant la génération remet cet état) ; en attente tant qu'elles n'y sont pas, même si le
   * fichier dit `ready` (fichier rouvert : elles ont été redemandées).
   */
  private stateOf(shape: ShapeModel, generation: ShapeGeneration): GenerationState | undefined {
    const state = generationStateOf(shape, generation);
    if (state === undefined || state === 'draft') return state;
    return this.candidates.has(shape.id) ? 'ready' : 'pending';
  }

  private draft(shapeId: string) {
    return this.target(shapeId, 'draft');
  }

  /** Forme prête : ses propositions (ou son échec) sont arrivées (un état `ready` rouvert les attend encore). */
  private ready(shapeId: string) {
    return this.target(shapeId, 'ready');
  }

  /** Forme générée de la page courante modifiable, dans l'état montré `state`. */
  private target(shapeId: string, state: GenerationState) {
    const editable = this.core.targets.editablePage();
    const shape = shapeOf(editable?.page, shapeId);
    const generation = shape && this.generationOf(shape);
    if (!editable || !shape || !generation || this.stateOf(shape, generation) !== state) return undefined;
    return { ...editable, shape, generation };
  }
}

/** Proposition montrée par le panneau : nom, aperçu et couleurs de son style. */
function candidateOf(shape: LibraryShape): GenerationCandidate {
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
