import { Group } from 'three';
import type { Point, ShapeModel } from '../../../../../core/model/types';
import { createLabel } from '../../../../../core/render/flat/box';
import { dashPattern } from '../../../../../core/render/geometry/stroke';
import { orientedPath } from '../../../../../core/render/geometry/orient';
import { fillMesh, strokeMesh } from '../../../../../core/render/meshes';
import { styleNumber, styleOpacity } from '../../../../../core/model/styleValues';
import { styleColor } from '../../../../../core/render/styleColors';
import { PART_ORDER } from '../../../../../core/render/types';
import type { RenderContext } from '../../../../../core/render/types';
import { SPATIAL } from '../../../../../core/spatial';
import type { ShapeDefinition } from '../../../../../core/shapes/types';
import type { FigureOf } from './figure';
import { actorHeight, standingActor } from './standing';

/** Silhouette 2D, étirée dans les bornes et orientée comme draw.io (`direction`, `flipH`, `flipV`). */
function flatActor(figureOf: FigureOf) {
  return (shape: ShapeModel, ctx: RenderContext): Group => {
    const { bounds, style } = shape;
    const group = new Group();
    group.name = `shape:${shape.id}`;
    const figure = figureOf(1, 1);
    const oriented = (pick: (w: number, h: number) => Point[]) => orientedPath(bounds, style, pick);
    const parts = figure.parts.map((_, i) => oriented((w, h) => figureOf(w, h).parts[i]!));

    const fill = styleColor(style, 'fillColor', '#ffffff');
    if (fill) for (const part of parts) group.add(fillMesh(part, fill, styleOpacity(style, 'fillOpacity')));

    const stroke = styleColor(style, 'strokeColor', '#000000');
    const width = styleNumber(style, 'strokeWidth', 1);
    if (stroke && width > 0) {
      const opacity = styleOpacity(style, 'strokeOpacity');
      const dash = dashPattern(style, width);
      const lines = [
        ...parts.map((path) => ({ path, closed: true })),
        ...figure.strokes.map((_, i) => ({ path: oriented((w, h) => figureOf(w, h).strokes[i]!), closed: false })),
      ];
      for (const { path, closed } of lines) {
        const mesh = strokeMesh(path, stroke, opacity, { width, closed, dash });
        if (mesh) {
          mesh.renderOrder = PART_ORDER.stroke;
          group.add(mesh);
        }
      }
    }

    const label = createLabel(shape, ctx);
    if (label) group.add(label);
    return group;
  };
}

/**
 * Ce qu'ont en commun les acteurs (`human/`, `droid/`), d'après la silhouette de la variante : en 2D le bonhomme de
 * draw.io ; en iso / 3D, debout face à la caméra (pas d'extrusion), pieds au centre de son emprise, son texte sur une
 * pancarte entre ses mains (`spatial.sign=0` : au sol). Bonhomme fin : il se clique et reçoit les flèches sur ses
 * bornes (`outlineConnect=0` dans draw.io).
 */
export function actorDefinition(
  figureOf: FigureOf,
): Pick<ShapeDefinition, 'flat' | 'iso' | 'volumeHeight' | 'contains' | 'properties' | 'minimap'> {
  return {
    flat: { create: flatActor(figureOf) },
    iso: standingActor(figureOf),
    volumeHeight: actorHeight,
    contains: () => true,
    properties: [
      { type: 'toggle', key: SPATIAL.sign, label: 'Pancarte en iso / 3D', section: 'shape', checkedByDefault: true },
    ],
    minimap(context, shape, map) {
      const { x, y, width, height } = shape.bounds;
      const figure = figureOf(width, height);
      const at = (p: Point) => map.toMinimap({ x: x + p.x, y: y + p.y });
      context.beginPath();
      for (const part of figure.parts) {
        part.map(at).forEach((p, i) => (i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y)));
        context.closePath();
      }
      for (const stroke of figure.strokes) {
        stroke.map(at).forEach((p, i) => (i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y)));
      }
      context.lineWidth = 0.75;
      context.strokeStyle = '#5f6368';
      context.stroke();
    },
  };
}
