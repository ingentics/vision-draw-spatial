import { DoubleSide, Vector2 } from 'three';
import type { Color } from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { PART_ORDER } from './types';

/**
 * Arêtes des volumes (vue iso, 3D) : lignes d'épaisseur **constante à l'écran quelle que soit leur
 * orientation** (rubans tournés vers la caméra, épaisseur en pixels de page, extrémités arrondies).
 * Une arête du dessus, couchée, et une arête verticale ont donc la même épaisseur apparente, et se
 * raccordent parfaitement à l'angle (mêmes points d'extrémité).
 */

/**
 * Taille de la vue en pixels CSS, requise par le matériau des lignes : un seul vecteur partagé par
 * toutes les lignes, mis à jour par le moteur (`setLineResolution`) quand la vue change de taille.
 */
const LINE_RESOLUTION = new Vector2(1, 1);

export function setLineResolution(width: number, height: number): void {
  LINE_RESOLUTION.set(Math.max(width, 1), Math.max(height, 1));
}

export interface EdgeLineStyle {
  color: Color;
  opacity: number;
  /** Épaisseur, en pixels de page. */
  width: number;
  /** Pointillés draw.io : longueurs du tiret et de l'espace, en pixels de page. */
  dash?: number[];
}

/** Segments indépendants (`[x0, y0, z0, x1, y1, z1, …]`), en espace page, au style d'une bordure. */
export function edgeLines(segments: number[], style: EdgeLineStyle): LineSegments2 {
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(segments);
  const material = new LineMaterial({
    color: style.color.getHex(),
    linewidth: style.width,
    worldUnits: true,
    transparent: true,
    opacity: style.opacity,
    // Les arêtes masquent ce qui est derrière elles (ex. le label d'une flèche derrière un bloc).
    depthWrite: true,
    // L'espace page est une symétrie de l'espace monde (y et z échangés) : les triangles des rubans
    // y sont retournés, il faut les deux faces.
    side: DoubleSide,
    dashed: !!style.dash,
    dashSize: style.dash?.[0] ?? 1,
    gapSize: style.dash?.[1] ?? 0,
  });
  material.uniforms.resolution!.value = LINE_RESOLUTION;
  const lines = new LineSegments2(geometry, material);
  if (style.dash) lines.computeLineDistances();
  lines.renderOrder = PART_ORDER.stroke;
  return lines;
}
