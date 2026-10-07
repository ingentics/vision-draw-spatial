import type { Object3D } from 'three';
import type { ViewMode } from '../interaction/cameraMath';
import type { PageModel, Point, Rect } from '../model/types';
import type { PluginSetting, PluginValues } from '../settings/pluginSettings';

/**
 * Effets de page (sujet 143) : décors et comportements qu'une page active en plus de son mode
 * (`spatial.effects="forest,…"` sur `<diagram>`). Contrairement au mode, ils se cumulent ; le mode reste maître et
 * peut en refuser (`PageModeDefinition.page.allowsEffect`), et un effet n'existe que dans ses modes d'affichage
 * (`viewModes`). Chaque effet vit dans son dossier (`plugins/effects/<id>/index.ts`, qui exporte `definition`),
 * collecté tout seul (sujet 286) : le retirer = supprimer le dossier.
 */
export interface PageEffectDefinition {
  /** Identifiant, écrit dans `spatial.effects` : nom du dossier. */
  id: string;
  /** Nom affiché dans le panneau. */
  name: string;
  /** Aide au survol de sa case. */
  description?: string;
  /** Réglages globaux de l'effet (Paramètres › Effets), bornés ; leurs valeurs sont passées au décor. */
  settings?: PluginSetting[];
  /**
   * Modes d'affichage où l'effet existe (sujet 196) ; absent = tous. Sur une page dont le mode n'en permet aucun
   * (ex. Séquences, 2D seulement), l'effet est inactif.
   */
  viewModes?: ViewMode[];
  /**
   * Décor de la scène en volume (vue iso / 3D, jamais en 2D), en espace page (x, y draw.io, z = hauteur) : il pousse
   * avec les volumes à la bascule et suit le fondu de la page. Reconstruit à chaque modification de la page. `light` :
   * l'ombrage des volumes des formes, d'après les réglages.
   */
  volume?(page: PageModel, room: EffectRoom, values: PluginValues, light: EffectLight): Object3D | undefined;
}

/** Lumière des volumes, pour qu'un décor soit ombré comme les formes (réglages d'ombrage des volumes). */
export interface EffectLight {
  /** Luminosité d'une facette de normale sortante `normal` (espace page, z vers le haut, longueur 1), en fraction de sa couleur. */
  shade(normal: { x: number; y: number; z: number }): number;
}

/** Place prise par le schéma sur la page, pour qu'un décor l'évite. */
export interface EffectRoom {
  /** Emprise du schéma (formes, tracés, textes) ; undefined pour une page vide. */
  bounds: Rect | undefined;
  /** Distance d'un point au plus proche élément (forme, tracé ou texte), en pixels de page ; 0 dedans. */
  distance(point: Point): number;
}
