import { Group } from 'three';
import {
  createLabel,
  fillMesh,
  orientedPath,
  strokeMesh,
  styleColor,
  styleOpacity,
  styleStroke,
  VERTEX_DEFAULTS,
} from '../../../../../core/plugins';
import type { Point, RenderContext, ShapeDefinition, ShapeModel } from '../../../../../core/plugins';
import type { FigureOf } from './figure';
import { SIGN, actorHeight, standingActor } from './standingActor';

/** Silhouette 2D, étirée dans les bornes et orientée comme draw.io (`direction`, `flipH`, `flipV`). */
function flatActor(figureOf: FigureOf) {
  return (shape: ShapeModel, ctx: RenderContext): Group => {
    const { bounds, style } = shape;
    const group = new Group();
    group.name = `shape:${shape.id}`;
    const figure = figureOf(1, 1);
    const oriented = (pick: (w: number, h: number) => Point[]) => orientedPath(bounds, style, pick);
    const parts = figure.parts.map((_, i) => oriented((w, h) => figureOf(w, h).parts[i]!));

    const fill = styleColor(style, 'fillColor', VERTEX_DEFAULTS.fill);
    if (fill) for (const part of parts) group.add(fillMesh(part, fill, styleOpacity(style, 'fillOpacity')));

    const stroke = styleStroke(style, VERTEX_DEFAULTS.stroke);
    if (stroke) {
      const { color, opacity, width, dash } = stroke;
      const lines = [
        ...parts.map((path) => ({ path, closed: true })),
        ...figure.strokes.map((_, i) => ({ path: oriented((w, h) => figureOf(w, h).strokes[i]!), closed: false })),
      ];
      for (const { path, closed } of lines) {
        const mesh = strokeMesh(path, color, opacity, { width, closed, dash });
        if (mesh) {
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
      { type: 'toggle', key: SIGN, label: 'Pancarte en iso / 3D', section: 'shape', checkedByDefault: true },
    ],
    minimap(brush, shape, map) {
      const { x, y, width, height } = shape.bounds;
      const figure = figureOf(width, height);
      const at = (p: Point) => map.toMinimap({ x: x + p.x, y: y + p.y });
      const stroke = '#5f6368';
      for (const part of figure.parts) brush.polygon(part.map(at), { stroke });
      for (const line of figure.strokes) brush.polyline(line.map(at), { stroke });
    },
  };
}
