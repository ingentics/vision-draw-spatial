import type { EdgeEnd, EndTextGap } from '../edit/edgeLabels';
import type { Point, Rect } from '../model/types';
// Modèle en lecture seule (sujet 303) : un mode lit la page, il n'écrit que par `ModeEdit`.
import type { ReadonlyPageModel as PageModel } from '../model/readonly';

/** Ce que l'appli fournit aux opérations de mode : couleurs proposées et textes de début / fin (paramètres). */
export interface ModeEditContext {
  /** Fonds des styles de forme des paramètres (`modePalette`) ; peut être vide. */
  palette: readonly string[];
  /** Textes de début / fin des flèches : taille, couleur, écarts au bout (paramètres `shapes.edgeEndText…`). */
  endText: { size: number; color: string; gap: EndTextGap };
}

/**
 * Écritures d'une opération de mode sur la page courante, groupées en une étape d'annulation. `page` est l'état
 * avant l'opération (le modèle n'est relu qu'à la fin) ; une écriture identique à la valeur en place est ignorée. Une
 * clé invalide lève une exception (l'opération n'écrit alors rien) ; un élément verrouillé ne change ni d'attribut, ni de
 * style, ni de bornes, ni de place dans l'ordre, ni de textes de bout (sujet 301).
 */
export interface ModeEdit {
  readonly page: PageModel;
  /** Couleurs proposées par l'appli (fonds des styles de forme des paramètres, `modePalette`) ; peut être vide. */
  readonly palette: readonly string[];
  /** Pas de la grille de la page (`gridSize` draw.io), 0 sans grille (sujet 263). */
  readonly gridSize: number;
  /** Attribut du mode sur `<diagram>`, par son nom court (écrit `spatial.<namespace>.<name>`) ; undefined le retire. */
  setPageAttribute(name: string, value: string | undefined): void;
  /**
   * Attribut du mode sur une forme ou une flèche, par son nom court (là où il est déjà, sinon dans le style) ;
   * undefined le retire.
   */
  setElementAttribute(elementId: string, name: string, value: string | undefined): void;
  /**
   * Clé du style draw.io d'un élément (ex. `fillColor`, sujet 179) ; undefined la retire. Ni `spatial.*` ni clé de
   * verrou (`locked`, `movable`, `resizable`, `editable`, `deletable`).
   */
  setElementStyle(elementId: string, key: string, value: string | undefined): void;
  /** Nouvelles bornes d'une forme, en coordonnées page (sujet 179) ; ses enfants suivent son coin haut-gauche. */
  setShapeBounds(shapeId: string, bounds: Rect): void;
  /**
   * Supprime une flèche et ses textes (sujet 269, ex. flèche vers un champ qui n'existe plus) ; rien pour une flèche
   * verrouillée.
   */
  removeEdge(edgeId: string): void;
  /** Envoie ces formes au fond de l'ordre de dessin, dans cet ordre (la première tout au fond) (sujet 230). */
  sendToBack(shapeIds: readonly string[]): void;
  /**
   * Texte de début ou de fin d'une flèche (sujet 265, ex. cardinalité) : ajouté ou réécrit dans la configuration
   * par défaut de l'appli (contre le bout, la flèche partant dans le sens `direction`, alignement qui l'éloigne de la
   * forme ; taille et couleur des paramètres), ou retiré (undefined). `margin` s'ajoute aux écarts des paramètres
   * (ex. place d'une pointe large).
   */
  setEdgeEndText(
    edgeId: string,
    end: EdgeEnd,
    text: string | undefined,
    direction: Point,
    margin?: Partial<EndTextGap>,
  ): void;
}
