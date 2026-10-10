import { Color, Group } from 'three';
import { ellipsePath, fillMesh, styleColor } from '../../../../../core/plugins';
import type { RenderContext, ShapeDefinition, ShapeModel } from '../../../../../core/plugins';
import { INITIAL_KIND } from '../../kinds';

/**
 * Point d'entrée (sujet 433) : disque noir plein Ø 20, taille fixe, sans texte ; départ des transitions seulement
 * (sujet 434). Dans draw.io, une ellipse noire.
 */

const SIZE = 20;

const outline = (shape: ShapeModel) => ellipsePath(shape.bounds);

function createInitial(shape: ShapeModel, _ctx: RenderContext): Group {
  const group = new Group();
  const color = styleColor(shape.style, 'fillColor', '#000000') ?? new Color('#000000');
  group.add(fillMesh(outline(shape), color, 1));
  return group;
}

export const definition: ShapeDefinition = {
  id: INITIAL_KIND,
  outline,
  flat: { create: createInitial },
  resizable: false,
  plainText: true,
  swatch: () => '<circle cx="20" cy="14" r="7" fill="currentColor"/>',
  palette: {
    name: 'Point d’entrée',
    category: 'states',
    order: 2,
    keywords: ['initial', 'entrée', 'entree', 'start', 'début'],
    style: `ellipse;fillColor=#000000;strokeColor=#000000;html=1;aspect=fixed;spatial.kind=${INITIAL_KIND};`,
    value: '',
    width: SIZE,
    height: SIZE,
    icon: '<circle cx="20" cy="14" r="7" fill="currentColor"/>',
  },
};
