import type { ElementComment } from '../core/edit/comment';
import type { EdgeEnd } from '../core/edit/edgeLabels';
import type { Point } from '../core/model/types';
import type { EdgeTextAnchor } from '../core/domains/types';
import type { EngineCore } from '../core/domains/EngineCore';

/** Textes (SPEC §14) : édition en place des labels, format, textes des flèches, parties et commentaires. */
export class TextApi {
  constructor(private readonly core: EngineCore) {}

  /**
   * Demande d'édition du label d'un élément de la page courante (double-clic, F2) : l'UI reçoit
   * le texte et l'emprise à l'écran (événement `labelEdit`), puis appelle `setLabel`.
   */
  editLabel(elementId?: string): void {
    this.core.labelEditor.editLabel(elementId);
  }

  /**
   * Texte en cours de saisie dans l'éditeur en place (à chaque frappe) : une forme qui place elle-même son label (ex.
   * onglet d'une région RDD) est redessinée avec lui, sans rien écrire ; la fermeture rétablit le texte d'origine.
   */
  previewLabel(text: string): void {
    this.core.labelEditor.previewLabel(text);
  }

  /** Fin de l'édition en place (validée ou annulée) : le label dessiné réapparaît. */
  closeLabelEdit(): void {
    this.core.labelEditor.closeLabelEdit();
  }

  /**
   * Remplace le label d'un élément : texte brut (converti en HTML si le style l'exige), ou HTML draw.io
   * si le texte a une mise en forme partielle (`html`, le style passe en `html=1`).
   */
  setLabel(elementId: string, text: string, html?: string): void {
    this.core.textEdits.setLabel(elementId, text, html);
  }

  /**
   * Format du texte d'une cellule de la page courante (forme, arête ou label enfant) : clés de style
   * `fontStyle`, `fontSize`, `fontColor`, `align`, `verticalAlign`… (undefined = clé retirée). Une
   * étape d'annulation ; pendant l'édition en place, l'éditeur reçoit le nouveau format.
   */
  setFormat(cellId: string, patch: Record<string, string | undefined>): void {
    this.core.textEdits.setTextFormat(cellId, patch);
  }

  /**
   * Texte d'une flèche : son label (`cellId` = l'arête) ou un label enfant, retiré si le texte est vide ;
   * HTML draw.io s'il a une mise en forme partielle.
   */
  setEdgeText(edgeId: string, cellId: string, text: string, html?: string): void {
    this.core.edgeTexts.setEdgeText(edgeId, cellId, text, html);
  }

  /**
   * Ancre un texte de flèche au début, au milieu ou à la fin du tracé (à 10 % du bout pour le début et
   * la fin, comme les textes créés), sur le tracé (distance et décalage remis à zéro).
   */
  setEdgeTextAnchor(edgeId: string, cellId: string, anchor: EdgeTextAnchor): void {
    this.core.edgeTexts.setEdgeTextAnchor(edgeId, cellId, anchor);
  }

  /**
   * Texte de début ou de fin d'une flèche de la page courante (label enfant près de la source ou de
   * la cible, comme dans draw.io) : créé, modifié, ou retiré si le texte est vide.
   */
  setEdgeEndLabel(edgeId: string, end: EdgeEnd, text: string, html?: string, flipped?: boolean): void {
    this.core.edgeTexts.setEdgeEndLabel(edgeId, end, text, html, flipped);
  }

  /**
   * Déplace le texte de flèche en cours d'édition (poignée sous l'éditeur) : `screen` est le point visé
   * pour le texte (son ancre). Suivi en direct ; `endEditedTextMove` l'écrit dans le fichier.
   */
  moveEdited(screen: Point): void {
    this.core.edgeTexts.moveEditedText(screen);
  }

  /** Fin du déplacement du texte en cours d'édition : une étape d'annulation, écrite comme draw.io. */
  endEditedMove(): void {
    this.core.edgeTexts.endEditedTextMove();
  }

  /**
   * Fait sauter le texte de début / fin en cours d'édition de l'autre côté du trait (règle inversée), s'il
   * est dans une configuration par défaut ; un texte encore à créer sera créé de ce côté.
   */
  flipEdited(): void {
    this.core.edgeTexts.flipEditedText();
  }

  /** Texte d'une partie d'une forme (ex. label d'un champ d'une table RDD, sujet 249), validé dans l'éditeur. */
  setPartText(shapeId: string, part: string, text: string): void {
    this.core.shapeParts.setText(shapeId, part, text);
  }

  /** Commentaire d'une partie d'une forme validé dans l'éditeur (touche C, sujet 262) ; vide le retire. */
  setPartComment(shapeId: string, part: string, text: string): void {
    this.core.shapeParts.setComment(shapeId, part, text);
  }

  /**
   * Commentaire d'un élément de la page courante (attribut `tooltip`, montré au survol) : texte brut, et HTML s'il a
   * une mise en forme partielle ; texte vide = retiré.
   */
  setComment(elementId: string, comment: ElementComment): void {
    this.core.properties.setComment(elementId, comment);
  }

  /** Édition en place du commentaire d'un élément de la page courante (événement `commentEdit` pour l'UI). */
  editComment(elementId: string): void {
    this.core.properties.editComment(elementId);
  }
}
