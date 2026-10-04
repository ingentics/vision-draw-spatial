import type { Point, Rect, ShapeModel } from '../../model/types';
import { createBox, createLabel, VERTEX_DEFAULTS } from '../../render/flat/box';
import { cubicTo } from '../../render/geometry/curves';
import { dashPattern } from '../../render/geometry/stroke';
import { strokeMesh } from '../../render/meshes';
import { styleColor, styleNumber, styleOpacity } from '../../render/styleValues';
import { PART_ORDER } from '../../render/types';
import type { SceneLevel, SceneRenderer } from '../types';

/**
 * Tracés communs des formes de stockage (SPEC §8.3), natives de draw.io, dessinées comme draw.io en 2D, et en
 * « bâtiments » en iso / 3D (toit plat rectangulaire avec le label, façade du type : `utils/building`) :
 * - BDD : `shape=cylinder3` (cylindre) ► corps arrondi cerclé ;
 * - queue : `shape=cylinder3;direction=south` (cylindre couché, bout visible à droite), ou
 *   `shape=mxgraph.flowchart.direct_data` (cylindre couché des organigrammes) ► chevrons de flux ;
 * - cache distribué : `shape=datastore` (cylindre à anneaux) ► tranches et voyants, une par nœud.
 *
 * Les trois ont la même ellipse, de taille fixe (`CYLINDER_RING`) : au redimensionnement, le corps du
 * cylindre s'étire, pas les ellipses. Écarts volontaires avec draw.io (choix produit) : draw.io
 * agrandit les anneaux du cache avec sa hauteur, et dessine l'ellipse du `cylinder3` de hauteur
 * `size` ; les deux sont identiques ici et dans draw.io avec les valeurs de la palette.
 */

/** Tracé 2D d'un cylindre : silhouette (remplie, bordée), lèvres (traits seuls), zone du label. */
export interface CylinderDrawing {
  silhouette: Point[];
  lips: Point[][];
  label: Rect;
}

// ---------------------------------------------------------------------------
// Tracés draw.io (mêmes courbes que `redrawPath` dans draw.io)

/** Corps commun des cylindres draw.io : ellipse du haut et arrondi du bas de hauteur `dy`. */
export function cylinderSilhouette({ x, y, width: w, height: h }: Rect, dy: number): Point[] {
  const start = { x, y: y + dy };
  const top = cubicTo(start, { x, y: y - dy / 3 }, { x: x + w, y: y - dy / 3 }, { x: x + w, y: y + dy });
  const bottomStart = { x: x + w, y: y + h - dy };
  const bottom = cubicTo(bottomStart, { x: x + w, y: y + h + dy / 3 }, { x, y: y + h + dy / 3 }, { x, y: y + h - dy });
  return [start, ...top, bottomStart, ...bottom];
}

/** Lèvre avant de l'ellipse du haut, décalée de `offset` vers le bas. */
export function cylinderLip({ x, y, width: w }: Rect, dy: number, offset = 0): Point[] {
  const start = { x, y: y + dy + offset };
  return [
    start,
    ...cubicTo(
      start,
      { x, y: y + 2 * dy + offset },
      { x: x + w, y: y + 2 * dy + offset },
      { x: x + w, y: y + dy + offset },
    ),
  ];
}

/**
 * Hauteur de l'ellipse des cylindres (BDD, queue, cache) : celle de draw.io pour un cache de 60 px de
 * haut, fixe au redimensionnement (plus l'épaisseur du trait, comme draw.io pour le cache).
 */
export const CYLINDER_RING = 8;

export const ringHeight = (style: Record<string, string>) => CYLINDER_RING + styleNumber(style, 'strokeWidth', 1) - 1;

// ---------------------------------------------------------------------------
// Rendus

/** 2D : silhouette (fond, bordure), lèvres avec le style de la bordure, label dans sa zone. */
export function cylinderFlat(drawing: (shape: ShapeModel) => CylinderDrawing): SceneRenderer {
  return {
    create(shape, ctx) {
      const { silhouette, lips, label } = drawing(shape);
      const box = createBox({ ...shape, label: '' }, silhouette, ctx, VERTEX_DEFAULTS);
      const color = styleColor(shape.style, 'strokeColor', VERTEX_DEFAULTS.stroke);
      const width = styleNumber(shape.style, 'strokeWidth', 1);
      if (color && width > 0) {
        for (const lip of lips) {
          const mesh = strokeMesh(lip, color, styleOpacity(shape.style, 'strokeOpacity'), {
            width,
            closed: false,
            dash: dashPattern(shape.style, width),
          });
          if (!mesh) continue;
          mesh.name = 'stroke-lip';
          mesh.renderOrder = PART_ORDER.stroke;
          box.add(mesh);
        }
      }
      const text = createLabel(shape, ctx, shape.label, label);
      if (text) box.add(text);
      return box;
    },
  };
}

/** Zone du texte : celle du tracé en 2D ; en iso, le toit du bâtiment (les bornes). */
export const flatTextZone =
  (drawing: (shape: ShapeModel) => CylinderDrawing) =>
  (shape: ShapeModel, level: SceneLevel): Rect =>
    level === 'flat' ? drawing(shape).label : shape.bounds;
