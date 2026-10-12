import type { ReadonlyShapeModel as ShapeModel } from '../model/readonly';
import { spatialValue } from '../spatial';

/**
 * Formes générées par l'hôte (sujets 538, 545) : une forme qui le déclare (`ShapeDefinition.generation`, ex. Metamorph)
 * est décrite (son texte et des instructions visuelles), l'hôte en génère des propositions, et la proposition choisie
 * la remplace. Son état est écrit dans le fichier, sous les clés que la forme déclare ; les propositions reçues ne
 * vivent que dans le moteur.
 */

/** Brouillon (texte et instructions modifiables), propositions demandées à l'hôte, propositions reçues. */
export type GenerationState = 'draft' | 'pending' | 'ready';

/** Ce qu'une forme générée déclare : où le fichier garde son état et ses instructions, et le titre de son panneau. */
export interface ShapeGeneration {
  /** Titre de la section du panneau (ex. « Metamorph »). */
  title: string;
  /** Clé spatiale de l'état (style de la cellule) ; sa présence fait de la forme une forme à générer. */
  stateKey: string;
  /** Valeur écrite de chaque état (ex. `pending` écrit `morphing`). */
  states: Readonly<Record<GenerationState, string>>;
  /** Clé spatiale des instructions visuelles (attribut de l'objet : texte libre, sur plusieurs lignes). */
  instructionsKey: string;
}

const STATES: readonly GenerationState[] = ['draft', 'pending', 'ready'];

/** État écrit d'une forme générée ; undefined sans état (une valeur inconnue vaut brouillon). */
export function generationStateOf(
  shape: Pick<ShapeModel, 'style' | 'attributes'>,
  generation: ShapeGeneration,
): GenerationState | undefined {
  const value = spatialValue(shape, generation.stateKey);
  if (value === undefined) return undefined;
  return STATES.find((state) => generation.states[state] === value) ?? 'draft';
}

export function generationInstructionsOf(
  shape: Pick<ShapeModel, 'style' | 'attributes'>,
  generation: ShapeGeneration,
): string {
  return spatialValue(shape, generation.instructionsKey) ?? '';
}

/** Demande de propositions envoyée à l'hôte (événement `generationRequest`) : ce que décrit la forme. */
export interface GenerationRequest {
  pageId: string;
  shapeId: string;
  /** Id de la définition de la forme (ex. `metamorph`) : l'hôte choisit qui génère. */
  kind: string;
  /** Texte de la forme, en texte brut. */
  text: string;
  /** Commentaire de la forme (attribut `tooltip`), en texte brut ; vide sans commentaire. */
  comment: string;
  /** Instructions visuelles (la description de la forme voulue). */
  instructions: string;
  width: number;
  height: number;
  /** Numéro de la demande pour cette forme depuis l'ouverture du fichier (1, puis 2 après « Réessayer »…). */
  attempt: number;
}

/** Proposition reçue, telle que le panneau la montre. */
export interface GenerationCandidate {
  /** Id de la forme proposée (`shapes[].id` du JSON reçu). */
  id: string;
  name: string;
  description?: string;
  /** Aperçu : contenu SVG d'un cadre `0 0 40 28` (comme une icône de la palette). */
  icon: string;
  /** Couleurs du style proposé (fond, bordure), pour l'aperçu ; absentes : celles de l'interface. */
  fill?: string;
  stroke?: string;
}

/** Ce que le panneau montre d'une forme générée. */
export interface GenerationView {
  /** Titre de la section (`ShapeGeneration.title`). */
  title: string;
  state: GenerationState;
  instructions: string;
  /** Propositions reçues ; vide tant qu'elles ne sont pas arrivées (y compris à la réouverture d'un état `ready`). */
  candidates: GenerationCandidate[];
  /** Message de l'hôte quand la génération a échoué (état `ready`, sans propositions). */
  error?: string;
}
