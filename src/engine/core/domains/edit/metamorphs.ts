import { setCellObjectAttribute, setCellStyle, setCellStyleValue } from '../../format/cellEdits';
import { setCellWrapperAttribute } from '../../format/create';
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
  /** Demandes faites par forme depuis l'ouverture du document (`MetamorphRequest.attempt`). */
  private readonly attempts = new Map<string, number>();

  constructor(private readonly core: EngineCore) {}

  resetDocument(): void {
    this.pending.clear();
    this.candidates.clear();
    this.attempts.clear();
  }

  /**
   * Ce que le panneau montre d'une Metamorph de la page courante ; undefined pour une autre forme. Un état `ready` sans
   * propositions en mémoire (fichier rouvert) se montre en attente : elles ont été redemandées.
   */
  view(shapeId: string): MetamorphView | undefined {
    const shape = shapeOf(this.core.pages.getCurrentPage(), shapeId);
    const state = shape && metamorphStateOf(shape);
    if (!shape || !state) return undefined;
    const candidates = this.candidates.get(shapeId) ?? [];
    return {
      state: state === 'ready' && candidates.length === 0 ? 'morphing' : state,
      instructions: metamorphInstructionsOf(shape),
      candidates,
    };
  }

  /** Instructions visuelles d'un brouillon ; `merge` : saisie en direct, une étape d'annulation par saisie. */
  setInstructions(shapeId: string, instructions: string, merge?: string): void {
    const target = this.draft(shapeId);
    if (!target || metamorphInstructionsOf(target.shape) === instructions) return;
    this.core.edits.recordMergeableEdit('Instructions Metamorph', merge);
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
    const pending = this.pending.get(shapeId);
    if (!pending) return { ok: false, errors: [`aucune demande en cours pour la forme ${shapeId}`] };
    const result = readShapeLibrary(json);
    if (!result.ok) return result;
    this.pending.delete(shapeId);
    this.candidates.set(shapeId, result.library.shapes.map(candidateOf));
    const page = this.core.pages.pageById(pending.pageId);
    const pageTree = this.core.file.pageTreeOf(pending.pageId);
    const shape = shapeOf(page, shapeId);
    if (shape && pageTree && pageTree.encoding !== 'unreadable' && metamorphStateOf(shape) === 'morphing') {
      setCellStyleValue(pageTree, shapeId, SPATIAL.metamorph, 'ready');
      this.core.file.documentChanged([pending.pageId]);
    }
    this.core.events.emit('metamorphChange', shapeId);
    return result;
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
    const target = this.target(shapeId, ['ready']);
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
      instructions: metamorphInstructionsOf(shape),
      width: shape.bounds.width,
      height: shape.bounds.height,
      attempt,
    });
  }

  private forget(shapeId: string): void {
    this.pending.delete(shapeId);
    this.candidates.delete(shapeId);
  }

  private draft(shapeId: string) {
    return this.target(shapeId, ['draft']);
  }

  /** Metamorph prête dont les propositions sont arrivées (un état `ready` rouvert les attend encore). */
  private ready(shapeId: string) {
    return this.candidates.has(shapeId) ? this.target(shapeId, ['ready']) : undefined;
  }

  /** Metamorph de la page courante modifiable, dans l'un des états `states`. */
  private target(shapeId: string, states: readonly MetamorphState[]) {
    const editable = this.core.targets.editablePage();
    const shape = shapeOf(editable?.page, shapeId);
    const state = shape && metamorphStateOf(shape);
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
