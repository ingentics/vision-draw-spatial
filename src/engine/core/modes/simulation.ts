import type { Object3D } from 'three';
import type { ReadonlyPageModel as PageModel } from '../model/readonly';
import type { Point } from '../model/types';
import type { RenderContext } from '../render/types';

/**
 * Simulation d'un mode sur une page (sujet 461) : état de session gardé par le moteur, jamais écrit ni annulable, qui
 * marche aussi sur une page en lecture seule. Le moteur n'en connaît que le commun : édition bloquée (la caméra reste
 * libre), clics et touches rendus au mode, voile, couche du mode dessinée au-dessus de tout et animée, caméra qui
 * suit. Ce que la couche montre (forme courante, flèches proposées…) est l'affaire du mode.
 */

/** Un pas de la simulation, décrit par le mode. Les ids sont ceux de la page simulée. */
export interface SimulationFrame {
  /** Opacité du voile posé sur la page, de 0 à 1 ; défaut : `SIMULATION_DEFAULTS.veilOpacity`. */
  veilOpacity?: number;
  /** Éléments gardés au-dessus du voile (une forme avec son contenu). */
  kept?: readonly string[];
  /** Forme à garder dans la vue : sortie de la vue, la caméra glisse pour la centrer. */
  follow?: string;
  /**
   * Couche du mode, dessinée par-dessus la page et le voile, sans test de profondeur ; construite à l'affichage du pas
   * et de nouveau quand la scène est reconstruite.
   */
  layer?(scene: SimulationScene): SimulationLayer | undefined;
}

/** Ce que le moteur donne à la couche d'un mode : la page dessinée. */
export interface SimulationScene {
  page: PageModel;
  /** Tracé dessiné d'une flèche, en pixels de page (décalage d'une flèche déplacée compris). */
  route(edgeId: string): Point[] | undefined;
  /** Contour d'une forme : le sien, sinon son emprise. */
  outline(shapeId: string): Point[] | undefined;
  /** Textes (pastilles…) ; la mesure du texte est celle du moteur. */
  ctx: RenderContext;
  /** Animations réduites (préférence du système) : la couche se dessine immobile. */
  reducedMotion: boolean;
}

/** Couche d'un pas de simulation. */
export interface SimulationLayer {
  object: Object3D;
  /**
   * Image suivante d'une couche animée ; `elapsed` : ms depuis l'affichage du pas. Faux quand il n'y a plus rien à
   * animer (le moteur ne la rappelle plus).
   */
  animate?(elapsed: number): boolean;
  /** Élément visé par un point de la couche (pixels de page, ex. pastille d'une flèche) ; prime sur la page. */
  hit?(point: Point): string | undefined;
}

/** Ce que la simulation rend à celui qui l'a ouverte. */
export interface SimulationHandlers {
  /** Clic sur un élément : celui que vise la couche, sinon celui de la page sous le pointeur. Rien n'est sélectionné. */
  click?(elementId: string): void;
  /** L'élément réagit-il au clic (curseur main au survol) ? */
  clickable?(elementId: string): boolean;
  /** Touche pendant la simulation (`KeyboardEvent.key`), Échap mis à part (il la ferme) ; vrai si elle est prise. */
  key?(key: string): boolean;
  /** Simulation fermée : par `closeSimulation`, Échap, un changement de page ou de fichier. */
  closed?(): void;
}

/** Simulation ouverte : sa page, et l'objet de celui qui l'a ouverte (ex. la simulation du mode). */
export interface SimulationSession {
  pageId: string;
  owner: object;
}

/** Valeurs quand le mode n'en dit rien. */
export const SIMULATION_DEFAULTS = {
  veilOpacity: 0.35,
  /** Glissement de la caméra vers la forme à suivre sortie de la vue, en ms. */
  followDuration: 300,
} as const;
