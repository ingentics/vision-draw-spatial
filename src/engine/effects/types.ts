import type { Object3D } from 'three';
import type { PageModel, Point, Rect } from '../model/types';

/**
 * Effets de page (sujet 143) : décors et comportements qu'une page active en plus de son mode
 * (`spatial.effects="forest,…"` sur `<diagram>`). Contrairement au mode, ils se cumulent ; le mode reste maître et
 * peut en refuser (`PageModeDefinition.allowsEffect`). Chaque effet vit dans son dossier (`effects/<id>/index.ts`,
 * qui exporte `definition`), listé par `effects/registry.ts` : le retirer = supprimer le dossier et sa ligne.
 */
export interface PageEffectDefinition {
  /** Identifiant, écrit dans `spatial.effects` : nom du dossier. */
  id: string;
  /** Nom affiché dans le panneau. */
  name: string;
  /** Aide au survol de sa case. */
  description?: string;
  /**
   * Décor de la scène en volume (vue iso / 3D, jamais en 2D), en espace page (x, y draw.io, z = hauteur) : il pousse
   * avec les volumes à la bascule et suit le fondu de la page. Reconstruit à chaque modification de la page.
   */
  volume?(page: PageModel, room: EffectRoom): Object3D | undefined;
}

/** Place prise par le schéma sur la page, pour qu'un décor l'évite. */
export interface EffectRoom {
  /** Emprise du schéma (formes, tracés, textes) ; undefined pour une page vide. */
  bounds: Rect | undefined;
  /** Distance d'un point au plus proche élément (forme, tracé ou texte), en pixels de page ; 0 dedans. */
  distance(point: Point): number;
}
