import { Group } from 'three';
import type { Point, ShapeModel } from '../../../../model/types';
import { createLabel } from '../../../../render/flat/box';
import { dashPattern } from '../../../../render/geometry/stroke';
import { ellipsePath } from '../../../../render/geometry/paths';
import { blockHeight } from '../../../../render/iso/block';
import { edgeLines } from '../../../../render/lines';
import { fillMesh, solidMaterial } from '../../../../render/meshes';
import { styleColor, styleNumber, styleOpacity } from '../../../../render/styleValues';
import { PART_ORDER } from '../../../../render/types';
import type { RenderContext } from '../../../../render/types';
import type { SceneRenderer } from '../../../types';
import { actorFigure } from './figure';

/** Tête : assez de côtés pour rester ronde au zoom. */
const HEAD_SEGMENTS = 48;
/** Traits juste devant la tête (vers la caméra) : pas de z-fighting avec son fond. */
const FRONT = 0.05;

/** Hauteur debout en iso / 3D : celle de la forme, `spatial.height` prioritaire. */
export function actorHeight(shape: ShapeModel, ctx: RenderContext): number {
  return blockHeight(shape, ctx, shape.bounds.height);
}

/**
 * Actor en iso / 3D : pas d'extrusion, le bonhomme 2D se tient **debout**, comme une unité de jeu. Sa silhouette
 * est dans un plan vertical, pieds au centre de l'emprise, de la hauteur de la forme (`spatial.height` prioritaire)
 * et aux proportions de la 2D ; le moteur la tourne face à la caméra à chaque image (`userData.billboard`,
 * `render/billboard.ts`). Le label hors de la forme est posé au sol devant lui (`createShapeObject`).
 *
 * Repère de la silhouette : x horizontal (vers la droite vu de la caméra), z vers le haut, face vers −y.
 */
export const standingActor: SceneRenderer = {
  create(shape, ctx) {
    const { bounds, style } = shape;
    const height = actorHeight(shape, ctx);
    const width = bounds.height > 0 ? (bounds.width * height) / bounds.height : bounds.width;
    const group = new Group();
    group.name = `shape:${shape.id}`;
    group.userData.height = height;
    // Se clique sur toute sa hauteur, pas seulement au dessus (`interaction/pick.ts`).
    group.userData.standing = true;

    const silhouette = new Group();
    silhouette.name = 'silhouette';
    silhouette.userData.billboard = true;
    silhouette.position.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, 0);
    group.add(silhouette);

    // Du cadre 2D du bonhomme (y vers le bas) au plan de la silhouette (z vers le haut).
    const figure = actorFigure(width, height);
    const upright = (p: Point): Point => ({ x: p.x - width / 2, y: height - p.y });
    const head = ellipsePath(figure.head, HEAD_SEGMENTS).map(upright);
    // Cadre de la tête dans le plan de la silhouette (x, z) : la sélection l'entoure (`core/selection/highlight.ts`).
    silhouette.userData.head = {
      x: figure.head.x - width / 2,
      y: height - figure.head.y - figure.head.height,
      width: figure.head.width,
      height: figure.head.height,
    };

    const fill = styleColor(style, 'fillColor', '#ffffff');
    if (fill) {
      // Plan (x, y) couché sur (x, z) : rotation d'un quart de tour autour de x.
      const plane = new Group();
      plane.rotation.x = Math.PI / 2;
      const disc = fillMesh(head, fill, 1);
      disc.material = solidMaterial(fill);
      disc.name = 'head';
      plane.add(disc);
      silhouette.add(plane);
    }

    const stroke = styleColor(style, 'strokeColor', '#000000');
    const strokeWidth = styleNumber(style, 'strokeWidth', 1);
    if (stroke && strokeWidth > 0) {
      const segments: number[] = [];
      const polyline = (points: Point[], closed: boolean) => {
        const last = closed ? points.length : points.length - 1;
        for (let i = 0; i < last; i++) {
          const a = points[i]!;
          const b = points[(i + 1) % points.length]!;
          segments.push(a.x, -FRONT, a.y, b.x, -FRONT, b.y);
        }
      };
      polyline(head, true);
      for (const line of figure.strokes) polyline(line.map(upright), false);
      const lines = edgeLines(segments, {
        color: stroke,
        opacity: styleOpacity(style, 'strokeOpacity'),
        width: strokeWidth,
        dash: dashPattern(style, strokeWidth),
      });
      lines.name = 'stroke';
      lines.renderOrder = PART_ORDER.stroke;
      silhouette.add(lines);
    }

    const label = createLabel(shape, ctx);
    if (label) group.add(label);
    return group;
  },
};
