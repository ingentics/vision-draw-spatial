import type { Object3D } from 'three';
import type { ReadonlyPageModel as PageModel } from '../model/readonly';
import type { Point } from '../model/types';
import type { RenderContext } from '../render/types';

/**
 * Prise en main de la page par un mode (sujet 467) : briques neutres que le moteur ouvre à un mode pour un état de
 * session qui lui est propre (ex. parcours pas à pas d'une machine), jamais écrit ni annulable. Le moteur ne sait pas
 * ce que le mode en fait :
 * - verrou d'édition (`lockEditing`) : plus rien ne se modifie, la caméra reste libre ;
 * - capture des entrées (`EditLock.captureInput`) : clics, survol et touches rendus au détenteur du verrou ;
 * - couche par-dessus (`setOverlay`) : voile, éléments gardés au-dessus, objets dessinés par le mode et animés ;
 * - forme gardée dans la vue (`keepInView`).
 */

/** Briques remises à un mode (côté appli : le moteur lui-même, vu par ce seul contrat). */
export interface PageTakeover {
  /**
   * Verrouille l'édition de la page affichée pour `owner` (même en lecture seule) : sélection vidée, geste et texte en
   * cours fermés. Le verrou est rendu par `release`, ou par le moteur au changement de page ou de document et à son
   * arrêt ; `released` est alors appelé. Undefined sans page affichée, sur la vue graphe, pendant une transition, ou si
   * un autre détenteur tient déjà le verrou.
   */
  lockEditing(owner: object, released?: () => void): EditLock | undefined;
  /** Pose la couche de `owner` sur la page affichée (remplace la sienne) ; retirée au changement de page. */
  setOverlay(owner: object, overlay: PageOverlay): void;
  /** Retire la couche de `owner`, s'il en a une. */
  clearOverlay(owner: object): void;
  /** La forme sort (même en partie) de la zone de dessin : la caméra glisse pour la centrer. */
  keepInView(shapeId: string): void;
}

/** Verrou d'édition tenu par un mode. */
export interface EditLock {
  readonly owner: object;
  /** Page verrouillée. */
  readonly pageId: string;
  /** Rend le verrou (et la capture des entrées) ; sans effet s'il est déjà rendu. */
  release(): void;
  /** Capture les entrées jusqu'à ce que le verrou soit rendu (remplace une capture précédente). */
  captureInput(capture: InputCapture): void;
}

/**
 * Entrées capturées par le détenteur du verrou : rien n'est sélectionné, aucun geste d'édition. La caméra (glisser,
 * molette, touches de la vue) reste libre.
 */
export interface InputCapture {
  /** Clic sur un élément : celui que vise la couche (`OverlayLayer.hit`), sinon celui de la page sous le pointeur. */
  click?(elementId: string): void;
  /** L'élément réagit-il au clic (curseur main au survol) ? */
  clickable?(elementId: string): boolean;
  /**
   * Touche sans ⌘, Ctrl ni Alt (`KeyboardEvent.key`, Échap comprise), au premier appui ; vrai si elle est prise. Une
   * touche non prise revient à la vue (flèches, Espace, raccourcis de la vue) ; une touche prise et tenue n'est pas
   * répétée.
   */
  key?(key: string): boolean;
}

/** Couche d'un mode posée sur la page affichée. */
export interface PageOverlay {
  /**
   * Voile sur la page (opacité de 0 à 1 ; défaut : `OVERLAY_DEFAULTS.veilOpacity`) et éléments gardés au-dessus (une
   * forme avec son contenu) ; absent : pas de voile.
   */
  veil?: { opacity?: number; kept?: readonly string[] };
  /**
   * Objets du mode, dessinés par-dessus la page et le voile, sans test de profondeur ; construits à la pose et de
   * nouveau quand la scène de la page est reconstruite.
   */
  layer?(scene: OverlayScene): OverlayLayer | undefined;
}

/** Ce que le moteur donne à la couche d'un mode : la page dessinée. */
export interface OverlayScene {
  page: PageModel;
  /** Tracé dessiné d'une flèche, en pixels de page (décalage d'une flèche déplacée compris). */
  route(edgeId: string): Point[] | undefined;
  /** Contour d'une forme : le sien, sinon son emprise. */
  outline(shapeId: string): Point[] | undefined;
  /** Textes (pastilles…) ; la mesure du texte est celle du moteur. */
  ctx: RenderContext;
  /** Animations réduites (préférence du système) : la couche se dessine immobile, `animate` n'est pas appelé. */
  reducedMotion: boolean;
}

/** Objets d'une couche. */
export interface OverlayLayer {
  object: Object3D;
  /**
   * Image suivante d'une couche animée, appelée avant chaque image ; `elapsed` : ms depuis la pose de la couche. Faux
   * quand il n'y a plus rien à animer (le moteur ne la rappelle plus). Une couche toujours animée fait redessiner la
   * page à chaque image.
   */
  animate?(elapsed: number): boolean;
  /** Élément visé par un point de la couche (pixels de page, ex. pastille d'une flèche) ; prime sur la page. */
  hit?(point: Point): string | undefined;
}

/** Valeurs quand le mode n'en dit rien. */
export const OVERLAY_DEFAULTS = {
  veilOpacity: 0.35,
} as const;
