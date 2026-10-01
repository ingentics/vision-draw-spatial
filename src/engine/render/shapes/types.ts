import type { Object3D } from 'three';
import type { Point, ShapeModel } from '../../model/types';
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
  /** Dessin en mini-carte ; `null` = rien (ex. texte, groupe) ; absent = contour rempli. */
  minimap?: MinimapPainter | null;
}
