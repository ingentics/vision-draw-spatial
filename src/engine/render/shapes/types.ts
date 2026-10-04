import type { Object3D } from 'three';
import type { Point, Rect, ShapeModel } from '../../model/types';
import type { RenderContext } from '../types';

/**
 * Une forme peut avoir plusieurs rendus selon le contexte (SPEC §8.2) :
 * - `flat` : à plat sur le sol (vue de dessus) — **obligatoire**, c'est le repli de tous les autres ;
 * - `iso` : en vue isométrique (ex. éléments dressés face à la caméra) ;
 * - `volume` : en 3D (ex. extrusion, SPEC §17) ;
 * - `minimap` : dans la mini-carte (Canvas 2D).
 * Un niveau absent se rabat sur `flat` (scène) ou sur le contour de la forme (mini-carte).
 */
export type SceneLevel = 'flat' | 'iso' | 'volume';

/** Rendu Three.js d'une forme, en espace page (coordonnées draw.io absolues). */
export interface SceneRenderer {
  create(shape: ShapeModel, ctx: RenderContext): Object3D;
}

/** Passage des coordonnées page aux coordonnées de la mini-carte. */
export interface MinimapMapping {
  toMinimap(point: Point): Point;
  /** Pixels mini-carte par pixel de page. */
  scale: number;
}

/** Dessin d'une forme dans la mini-carte (contexte déjà mis à l'échelle des pixels CSS). */
export type MinimapPainter = (context: CanvasRenderingContext2D, shape: ShapeModel, map: MinimapMapping) => void;

export interface ShapeDefinition {
  /** Nom de forme géré (`ShapeModel.kind`). */
  kind: string;
  /** Par défaut : correspondance exacte sur `kind`. */
  matches?(shape: ShapeModel): boolean;
  /**
   * Contour au sol, en coordonnées page (polygone fermé). Géométrie de référence de la forme :
   * utilisée par le rendu à plat et par les replis (mini-carte…). Absent = rectangle des bornes.
   */
  outline?(shape: ShapeModel): Point[];
  /** Rendu à plat, obligatoire : repli de tous les autres niveaux. */
  flat: SceneRenderer;
  iso?: SceneRenderer;
  volume?: SceneRenderer;
  /**
   * Hauteur du volume en iso / 3D, si la forme en a une par défaut qui lui est propre (ex. demi-cylindre
   * couché : hauteur = rayon). Absent = `blockHeight` (`spatial.height`, sinon le réglage).
   * Sert à l'empilement, à la pastille de lien et à la sélection : le rendu iso doit l'utiliser aussi.
   */
  volumeHeight?(shape: ShapeModel, ctx: RenderContext): number;
  /**
   * Zone du texte, en coordonnées page, pour le rendu de ce niveau (`level` : un niveau que la forme
   * dessine elle-même, sinon `flat`). Le label y est placé (marges `spacing*` comprises) et l'éditeur en
   * place s'y ouvre : affichage et édition coïncident. Absent = les bornes de la forme.
   */
  textZone?(shape: ShapeModel, level: SceneLevel): Rect;
  /** Dessin en mini-carte ; `null` = rien (ex. texte, groupe) ; absent = contour rempli. */
  minimap?: MinimapPainter | null;
}
