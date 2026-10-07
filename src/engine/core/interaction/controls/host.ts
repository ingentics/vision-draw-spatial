import type { Point, Rect } from '../../model/types';
import type { CameraLimits, CameraState, Viewport } from '../cameraMath';

/** Touches de modification maintenues (voir `CameraHost.heldKeys`). */
export interface HeldKeys {
  followLink: boolean;
  multiSelect: boolean;
}

/** Ce que les contrôles demandent au moteur. */
export interface CameraHost {
  getCameraState(): CameraState;
  setCameraState(state: CameraState): void;
  getViewport(): Viewport;
  /** Bornes de la caméra (zoom, inclinaison) ; absent : bornes par défaut. */
  getCameraLimits?(): CameraLimits;
  /** Bascule vue globale ↔ 1:1, autour du point écran donné. */
  toggleOverview(screen?: Point): void;
  /**
   * Clic gauche simple (sans glisser) : sélection. `toggle` : la touche de sélection multiple est
   * enfoncée (ajouter l'élément à la sélection, ou l'en retirer).
   */
  click?(screen: Point, options: { toggle: boolean; followLink: boolean }): void;
  /**
   * Double-clic gauche. `followLink` : le geste pour suivre un lien est le double-clic et sa touche
   * est enfoncée (entrer dans le lien) ; sinon, édition du texte.
   */
  doubleClick?(screen: Point, options: { followLink: boolean }): void;
  /**
   * Touches de modification maintenues seules (sans autre touche) : celle pour suivre un lien (zones
   * liées en évidence, « Mode navigation ») et celle de sélection multiple.
   */
  heldKeys?(held: HeldKeys): void;
  /** Survol (undefined quand le pointeur quitte le canvas). */
  hover?(screen: Point | undefined): void;
  /** Retour (Retour arrière, Alt+←). */
  back?(): void;
  /** Bascule vue 2D ↔ iso (touche I). */
  toggleViewMode?(): void;
  /** Bascule vers / depuis la vue 3D (touche P). */
  toggle3d?(): void;
  /** Affiche / masque la mini-carte (touche M). */
  toggleMinimap?(): void;
  /** Aplatit / rétablit les volumes en iso et en 3D (touche V). */
  toggleFlatten?(): void;
  /** Vue graphe ↔ dernière page (touche G). */
  toggleGraph?(): void;
  /**
   * Appui gauche (sans Espace) : vrai si un élément déplaçable est sous le pointeur ; le glisser
   * qui suit le déplace (`moveTo`, au-delà du seuil de clic), jusqu'au relâchement (`endMove`).
   */
  beginMove?(screen: Point): boolean;
  /**
   * `snap` : aimanter à la grille (désactivé en maintenant Alt, comme dans draw.io) ; `free` : sans les bornes du mode
   * de la page (Ctrl maintenu, sujet 241 : une région peut entrer dans une autre).
   */
  moveTo?(screen: Point, options: { snap: boolean; free?: boolean }): void;
  endMove?(): void;
  /**
   * Appui gauche sur le vide (rien à déplacer) : vrai si l'on peut y tirer un rectangle de sélection
   * (ticket 60) ; au relâchement, `selectInRect` reçoit le rectangle écran.
   */
  canMarquee?(screen: Point): boolean;
  /** `add` : touche de sélection multiple (ajoute à la sélection) ; `touch` : Alt (il suffit de toucher). */
  selectInRect?(rect: Rect, options: { add: boolean; touch: boolean }): void;
  /** ⌘ + A / Ctrl + A, le focus sur la zone de dessin : sélectionne tous les éléments de la page (ticket 122). */
  selectAll?(): void;
  /**
   * Raccourcis d'ordre de dessin de draw.io, le focus sur la zone de dessin (ticket 130) : ⌘ / Ctrl + Maj + F / B
   * (premier plan, arrière-plan), Alt + Maj + F / B (avancer, reculer).
   */
  orderSelection?(move: 'front' | 'back' | 'forward' | 'backward'): void;
  /**
   * Flèche du clavier : déplace la sélection (1 px, un pas de grille avec Maj, ticket 123) ; faux si rien
   * n'est déplaçable (la flèche déplace alors la vue).
   */
  nudgeSelection?(direction: Point, coarse: boolean): boolean;
  /** F2 : éditer le label de la sélection. */
  editSelection?(): void;
  /** Suppr (ou le raccourci `deleteSelection`) : supprimer la sélection. */
  deleteSelection?(): void;
  /** Variante de placement de la flèche sélectionnée ; faux si elle ne s'applique pas (rien n'est fait). */
  placementVariant?(): boolean;
  /** Éditer le commentaire de l'élément sélectionné, sinon de l'élément survolé ; faux sans l'un ni l'autre. */
  editComment?(): boolean;
  /** Y a-t-il une sélection supprimable (page modifiable) ? Décide entre supprimer et Retour. */
  canDeleteSelection?(): boolean;
  /** Échap : désélectionner. */
  escape?(): void;
  /** Touche d'un mode de page sur la sélection (ex. « + » / « - ») ; vrai si elle a été prise. */
  modeKey?(key: string): boolean;
}
