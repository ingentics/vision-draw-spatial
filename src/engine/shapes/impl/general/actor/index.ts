import { Group } from 'three';
import type { Point, ShapeModel } from '../../../../model/types';
import { createLabel } from '../../../../render/flat/box';
import { dashPattern } from '../../../../render/geometry/stroke';
import { orientedPath } from '../../../../render/geometry/orient';
import { ellipsePath } from '../../../../render/geometry/paths';
import { fillMesh, strokeMesh } from '../../../../render/meshes';
import { styleColor, styleNumber, styleOpacity } from '../../../../render/styleValues';
import { PART_ORDER } from '../../../../render/types';
import type { RenderContext } from '../../../../render/types';
import { SPATIAL } from '../../../../spatial';
import type { ShapeDefinition } from '../../../types';
import { actorFigure } from './figure';
import { actorHeight, standingActor } from './standing';

/** Tête : assez de côtés pour rester ronde au zoom. */
const HEAD_SEGMENTS = 48;

/** Bonhomme 2D de draw.io, étiré dans les bornes et orienté comme draw.io (`direction`, `flipH`, `flipV`). */
function flatActor(shape: ShapeModel, ctx: RenderContext): Group {
  const { bounds, style } = shape;
  const group = new Group();
  group.name = `shape:${shape.id}`;
  const oriented = (draw: (w: number, h: number) => Point[]) => orientedPath(bounds, style, draw);
  const head = oriented((w, h) => ellipsePath(actorFigure(w, h).head, HEAD_SEGMENTS));

  const fill = styleColor(style, 'fillColor', '#ffffff');
  if (fill) group.add(fillMesh(head, fill, styleOpacity(style, 'fillOpacity')));

  const stroke = styleColor(style, 'strokeColor', '#000000');
  const width = styleNumber(style, 'strokeWidth', 1);
  if (stroke && width > 0) {
    const opacity = styleOpacity(style, 'strokeOpacity');
    const dash = dashPattern(style, width);
    const count = actorFigure(1, 1).strokes.length;
    const lines = [
      { path: head, closed: true },
      ...Array.from({ length: count }, (_, i) => ({
        path: oriented((w, h) => actorFigure(w, h).strokes[i]!),
        closed: false,
      })),
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
}

/**
 * Actor (`shape=umlActor`) : le bonhomme de draw.io en 2D ; en iso / 3D, debout face à la caméra (pas
 * d'extrusion), pieds au centre de son emprise, son texte sur une pancarte entre ses mains (`spatial.sign=0` : au sol).
 * Bonhomme fin : il se clique et reçoit les flèches sur ses bornes
 * (`outlineConnect=0` dans draw.io).
 */
export const definition: ShapeDefinition = {
  id: 'actor',
  kinds: ['umlActor'],
  flat: { create: flatActor },
  iso: standingActor,
  volumeHeight: actorHeight,
  contains: () => true,
  properties: [
    { type: 'toggle', key: SPATIAL.sign, label: 'Pancarte en iso / 3D', section: 'shape', checkedByDefault: true },
  ],
  minimap(context, shape, map) {
    const { x, y, width, height } = shape.bounds;
    const figure = actorFigure(width, height);
    const at = (p: Point) => map.toMinimap({ x: x + p.x, y: y + p.y });
    context.beginPath();
    const head = ellipsePath(figure.head, 16).map(at);
    head.forEach((p, i) => (i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y)));
    context.closePath();
    for (const stroke of figure.strokes) {
      stroke.map(at).forEach((p, i) => (i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y)));
    }
    context.lineWidth = 0.75;
    context.strokeStyle = '#5f6368';
    context.stroke();
  },
  swatch: () => '<circle cx="20" cy="7" r="3.5"/><path d="M20 10.5v7M14 13h12M15 25l5-7.5l5 7.5"/>',
  palette: {
    name: 'Acteur',
    category: 'general',
    order: 110,
    keywords: ['actor', 'acteur', 'utilisateur', 'user', 'personne', 'person', 'bonhomme', 'uml'],
    style: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;',
    value: 'Actor',
    width: 30,
    height: 60,
    icon: '<circle cx="20" cy="5" r="3.5"/><path d="M20 8.5v9M13 12h14M14 26l6-8.5l6 8.5"/>',
  },
};
