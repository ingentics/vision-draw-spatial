import type { Color, Object3D } from 'three';
import type { ShapeModel } from '../model/types';

/** Ordre de dessin des sous-parties d'un élément (ajouté à l'ordre de l'élément dans la page). */
export const PART_ORDER = { fill: 0, stroke: 1, label: 2 } as const;

/** Nombre de sous-parties réservées par élément dans l'ordre de dessin. */
export const PARTS_PER_ELEMENT = 4;

export interface TextSpec {
  text: string;
  /** Point d'ancrage en coordonnées page. */
  x: number;
  y: number;
  anchorX: 'left' | 'center' | 'right';
  anchorY: 'top' | 'middle' | 'bottom';
  align: 'left' | 'center' | 'right';
  fontSize: number;
  color: Color;
  opacity: number;
  bold: boolean;
  /** Largeur de retour à la ligne ; absente = pas de retour automatique. */
  maxWidth?: number;
}

/**
 * Fabrique de textes, injectée par le moteur (troika en production, bouchon en test).
 * L'objet renvoyé est en espace page, lisible en vue de dessus.
 */
export interface TextFactory {
  create(spec: TextSpec): Object3D;
}

export interface RenderContext {
  text: TextFactory;
}

/** SPEC §8.2 : ajouter une forme = écrire un renderer et l'enregistrer. */
export interface ShapeRenderer {
  kind: string;
  /** Par défaut : correspondance exacte sur `kind`. */
  matches?(shape: ShapeModel): boolean;
  /** Objet en espace page (coordonnées draw.io absolues). */
  create(shape: ShapeModel, ctx: RenderContext): Object3D;
  dispose?(object: Object3D): void;
}
