import type { ShapeLibraryResult } from '../core/shapes/library/libraryFormat';
import type { GenerationView } from '../core/edit/generation';
import type { EngineCore } from '../core/domains/EngineCore';

/** Formes générées par l'hôte (sujets 538, 545, ex. Metamorph). */
export class GenerationApi {
  constructor(private readonly core: EngineCore) {}

  /**
   * Forme générée de la page courante (sujets 538, 545, ex. Metamorph) : titre, état, instructions et propositions
   * reçues ; undefined pour une autre forme.
   */
  of(shapeId: string): GenerationView | undefined {
    return this.core.generatedShapes.view(shapeId);
  }

  /** Instructions visuelles d'une forme générée au brouillon (une étape d'annulation). */
  setInstructions(shapeId: string, instructions: string): void {
    this.core.generatedShapes.setInstructions(shapeId, instructions);
  }

  /** « Valider » une forme générée au brouillon : sa demande part à l'hôte (`generationRequest`). Faux si rien à décrire. */
  submit(shapeId: string): boolean {
    return this.core.generatedShapes.submit(shapeId);
  }

  /**
   * Propositions de l'hôte pour une forme générée en attente (réponse à `generationRequest`) : un JSON de bibliothèque
   * de formes (format `drawio-spatial/shapes`, une proposition par forme). Rend ses erreurs s'il est invalide ou si la
   * forme n'attend plus rien.
   */
  results(shapeId: string, json: unknown): ShapeLibraryResult {
    return this.core.generatedShapes.results(shapeId, json);
  }

  /**
   * Génération échouée chez l'hôte (réponse à `generationRequest`) : la forme est prête sans propositions, montre
   * `error`, et « Réessayer » ou « Reprompt » rendent la main. Faux si la forme n'attend plus rien.
   */
  failed(shapeId: string, error: string): boolean {
    return this.core.generatedShapes.failed(shapeId, error);
  }

  /**
   * « Réessayer » une forme générée prête : ses propositions sont oubliées et une nouvelle demande part à l'hôte, même
   * description. Sans effet pendant la génération.
   */
  retry(shapeId: string): void {
    this.core.generatedShapes.retry(shapeId);
  }

  /** « Reprompt » une forme générée prête : retour au brouillon pour modifier sa description. Sans effet pendant la génération. */
  reprompt(shapeId: string): void {
    this.core.generatedShapes.reprompt(shapeId);
  }

  /**
   * Proposition choisie : la forme générée devient la forme du modèle de palette `templateId` (forme d'une bibliothèque
   * que l'hôte vient d'enregistrer, ex. `metamorph:<id>`), à la même place, avec son texte et ses flèches. Faux si le
   * modèle n'est pas chargé.
   */
  accept(shapeId: string, templateId: string): boolean {
    return this.core.generatedShapes.accept(shapeId, templateId);
  }
}
