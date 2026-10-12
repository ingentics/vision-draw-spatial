import type { ReadonlyShapeModel as ShapeModel } from '../model/readonly';
import { SPATIAL, spatialValue } from '../spatial';

/**
 * Forme Metamorph (sujet 538) : forme à générer depuis une description (son texte et des instructions visuelles).
 * Son état est écrit dans le fichier (`spatial.metamorph`) ; les propositions reçues ne vivent que dans le moteur.
 */

/** Brouillon (texte et instructions modifiables), propositions demandées au serveur, propositions reçues. */
export type MetamorphState = 'draft' | 'morphing' | 'ready';

const STATES: readonly MetamorphState[] = ['draft', 'morphing', 'ready'];

/** État d'une Metamorph ; undefined pour une autre forme (une valeur inconnue vaut brouillon). */
export function metamorphStateOf(shape: Pick<ShapeModel, 'style' | 'attributes'>): MetamorphState | undefined {
  const value = spatialValue(shape, SPATIAL.metamorph);
  if (value === undefined) return undefined;
  return STATES.find((state) => state === value) ?? 'draft';
}

export function metamorphInstructionsOf(shape: Pick<ShapeModel, 'style' | 'attributes'>): string {
  return spatialValue(shape, SPATIAL.metamorphInstructions) ?? '';
}

/** Demande de propositions envoyée à l'hôte (événement `metamorphRequest`) : ce que décrit la forme. */
export interface MetamorphRequest {
  pageId: string;
  shapeId: string;
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
export interface MetamorphCandidate {
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

/** Ce que le panneau montre d'une Metamorph. */
export interface MetamorphView {
  state: MetamorphState;
  instructions: string;
  /** Propositions reçues ; vide tant qu'elles ne sont pas arrivées (y compris à la réouverture d'un état `ready`). */
  candidates: MetamorphCandidate[];
  /** Message de l'hôte quand la génération a échoué (état `ready`, sans propositions). */
  error?: string;
}
