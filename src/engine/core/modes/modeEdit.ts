import type { EdgeEnd, EndTextGap } from '../edit/edgeLabels';
import type { Point, Rect } from '../model/types';
// Modèle en lecture seule (sujet 303) : un mode lit la page, il n'écrit que par `ModeEdit`.
import type { ReadonlyPageModel as PageModel } from '../model/readonly';
import type { MeasureText } from '../render/richLayout';

/**
 * Ce que le moteur fournit aux opérations de mode : couleurs proposées et textes de début / fin (paramètres), mesure du
 * texte.
 */
export interface ModeEditContext {
  /** Fonds des styles de forme des paramètres (`modePalette`) ; peut être vide. */
  palette: readonly string[];
  /** Textes de début / fin des flèches : taille, couleur, écarts au bout (paramètres `shapes.edgeEndText…`). */
  endText: { size: number; color: string; gap: EndTextGap };
  /** Mesure du texte du moteur (sujet 377) : approchée tant que les polices ne sont pas chargées. */
  measureText: MeasureText;
}

/**
 * Ce qui fixe la taille qu'un mode écrit pour une forme qui suit son texte : grille de la page (sujet 263) et mesure du
 * texte du moteur (sujet 377). Celui de `ModeEdit`, remis aussi à l'aperçu de saisie (`ModeParts.textPreview`) pour
 * qu'il ait la taille écrite ensuite.
 */
export interface ModeSizing {
  /** Pas de la grille de la page (`gridSize` draw.io), 0 sans grille (sujet 263). */
  readonly gridSize: number;
  /** Largeur d'un texte en pixels de page, mesurée comme le moteur le dessine (sujet 377). */
  readonly measureText: MeasureText;
}

/**
 * Écritures d'une opération de mode sur la page courante, groupées en une étape d'annulation. `page` est l'état
 * avant l'opération (le modèle n'est relu qu'à la fin) ; une écriture identique à la valeur en place est ignorée. Une
 * clé invalide lève une exception (l'opération n'écrit alors rien) ; un élément verrouillé ne change ni d'attribut, ni de
 * style, ni de bornes, ni de place dans l'ordre, ni de textes de bout (sujet 301).
 */
export interface ModeEdit extends ModeSizing {
  readonly page: PageModel;
  /** Couleurs proposées par l'appli (fonds des styles de forme des paramètres, `modePalette`) ; peut être vide. */
  readonly palette: readonly string[];
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
