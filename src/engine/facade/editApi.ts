import type { ShapeTemplate } from '../core/edit/palette';
import type { StylePreset } from '../core/edit/stylePresets';
import type { LinkModel, Point } from '../core/model/types';
import type { OrientAction } from '../core/edit/orientShapes';
import type { EngineCore } from '../core/domains/EngineCore';

/** Édition des éléments (SPEC §14) : édition permise, ajout depuis la palette, liens, styles, attributs spatiaux, orientation, flèches. */
export class EditApi {
  constructor(private readonly core: EngineCore) {}

  /** Geste d'édition en cours (déplacement, redimensionnement, connecteur) : ne pas l'interrompre. */
  isDragging(): boolean {
    return this.core.gesture.isDragging();
  }

  isEditable(): boolean {
    return this.core.targets.isEditable();
  }

  /** Active ou désactive l'édition (poignées, glisser, commandes d'édition). */
  setEditable(editable: boolean): void {
    this.core.targets.setEditable(editable);
  }

  /**
   * Ajoute une forme de la palette sur la page courante, centrée sur un point écran (dépôt) ou au
   * centre de la vue : point projeté au sol (vue de dessus comme iso), aimanté à la grille.
   * Renvoie l'id de la nouvelle cellule, sélectionnée. Déposée dans une place proposée par le mode de la page (sujet
   * 481), elle s'y pose ; `snap` faux (Alt) : pas de place.
   */
  addShape(template: ShapeTemplate, screen?: Point, snap = true): string | undefined {
    return this.core.elements.addShape(template, screen, snap);
  }

  /** Forme de la palette glissée au-dessus du canvas, à `screen` : places du mode montrées (sujet 481). */
  paletteDragOver(template: ShapeTemplate, screen: Point, snap: boolean): void {
    this.core.elements.paletteDragOver(template, screen, snap);
  }

  /** Fin du glisser depuis la palette (lâché ou sorti du canvas) : places retirées. */
  paletteDragEnd(): void {
    this.core.elements.paletteDragEnd();
  }

  /** Lien d'un élément de la page courante (vers une page ou une URL) ; undefined = retiré. */
  setLink(elementId: string, link: LinkModel | undefined): void {
    this.core.properties.setLink(elementId, link);
  }

  /**
   * Attribut spatial d'une forme (SPEC §14.3), ex. `spatial.height`, `spatial.tag` : nombre (positif) ou texte
   * (sans `;`, séparateur du style) ; undefined le retire (valeur par défaut). Écrit là où il est déjà (attribut
   * de l'objet), sinon dans le style. `merge` : réglage en direct (champ tapé au fil des frappes), fusionné en une
   * étape d'annulation avec les précédents de même clé ; pour un attribut qui ne touche que le dessin de la forme
   * (`LIVE_SHAPE_KEYS`), seule la forme est redessinée.
   */
  setSpatial(elementId: string, key: string, value: number | string | undefined, merge?: string): void {
    this.core.properties.setSpatial(elementId, key, value, merge);
  }

  /**
   * Applique un style (fond, contour, texte) à des formes de la page courante, en une seule étape
   * d'annulation. `known` : styles de la palette, pour retirer une couleur de texte posée par l'un d'eux.
   */
  applyStylePreset(elementIds: string[], preset: StylePreset, known?: StylePreset[]): void {
    this.core.styles.applyStylePreset(elementIds, preset, known);
  }

  /**
   * Clés de style draw.io sur des formes ou des flèches de la page courante (ex. bordure : `strokeColor`, `strokeWidth`,
   * `dashed`…), en une étape d'annulation ; undefined retire la clé. Seules les clés qui changent.
   */
  setElementsStyle(
    elementIds: string[],
    patch: Record<string, string | undefined> | ((style: Record<string, string>) => Record<string, string | undefined>),
    label?: string,
    merge?: string,
  ): void {
    this.core.styles.setElementsStyle(elementIds, patch, label, merge);
  }

  /**
   * Retourne ou pivote de 90° les formes données qui l'acceptent (sujet 335), chacune sur son centre, en une étape
   * d'annulation. Le texte ne bouge pas.
   */
  orientShapes(shapeIds: string[], action: OrientAction): void {
    this.core.orient.orientShapes(shapeIds, action);
  }

  /** Inverse des flèches de la page courante (ticket 131) : elles vont de leur ancienne cible à leur ancienne source. */
  reverseEdges(edgeIds: string[]): void {
    this.core.styles.reverseEdges(edgeIds);
  }

  /**
   * Retour en auto : points intermédiaires et points d'attache imposés retirés, la flèche reste reliée
   * aux mêmes formes (le tracé redevient entièrement calculé).
   */
  resetEdgeRoute(edgeId: string): void {
    this.core.edgePoints.resetEdgeRoute(edgeId);
  }
}
