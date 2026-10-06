import type { Object3D } from 'three';
import type { ViewMode } from '../interaction/camera';
import type { PageModel, Point, Rect } from '../model/types';

/**
 * Effets de page (sujet 143) : décors et comportements qu'une page active en plus de son mode
 * (`spatial.effects="forest,…"` sur `<diagram>`). Contrairement au mode, ils se cumulent ; le mode reste maître et
 * peut en refuser (`PageModeDefinition.allowsEffect`), et un effet n'existe que dans ses modes d'affichage (`viewModes`). Chaque effet vit dans son dossier (`effects/<id>/index.ts`,
 * qui exporte `definition`), listé par `effects/registry.ts` : le retirer = supprimer le dossier et sa ligne.
 */
export interface PageEffectDefinition {
  /** Identifiant, écrit dans `spatial.effects` : nom du dossier. */
  id: string;
  /** Nom affiché dans le panneau. */
  name: string;
  /** Aide au survol de sa case. */
  description?: string;
  /** Réglages globaux de l'effet (Paramètres › Effets), bornés ; leurs valeurs sont passées au décor. */
  settings?: EffectSetting[];
  /**
   * Modes d'affichage où l'effet existe (sujet 196) ; absent = tous. Sur une page dont le mode n'en permet aucun
   * (ex. Séquences, 2D seulement), l'effet est inactif.
   */
  viewModes?: ViewMode[];
  /**
   * Décor de la scène en volume (vue iso / 3D, jamais en 2D), en espace page (x, y draw.io, z = hauteur) : il pousse
   * avec les volumes à la bascule et suit le fondu de la page. Reconstruit à chaque modification de la page.
   */
  volume?(page: PageModel, room: EffectRoom, values: EffectValues): Object3D | undefined;
}

/** Réglage global d'un effet : un nombre borné, affiché par un curseur. */
export interface EffectSetting {
  key: string;
  label: string;
  /** Aide au survol. */
  title?: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** Affichage : `px` (pixels de page) ou `%` (fraction de 0 à 1 affichée en pourcentage). */
  unit?: 'px' | '%';
}

/** Valeurs des réglages d'un effet, par clé (bornées, défaut pour les absentes). */
export type EffectValues = Record<string, number>;

/** Place prise par le schéma sur la page, pour qu'un décor l'évite. */
export interface EffectRoom {
  /** Emprise du schéma (formes, tracés, textes) ; undefined pour une page vide. */
  bounds: Rect | undefined;
  /** Distance d'un point au plus proche élément (forme, tracé ou texte), en pixels de page ; 0 dedans. */
  distance(point: Point): number;
}
