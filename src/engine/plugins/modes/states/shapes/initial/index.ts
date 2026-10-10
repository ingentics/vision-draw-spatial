import { Color, Group } from 'three';
import { ellipsePath, fillMesh } from '../../../../../core/plugins';
import type { RenderContext, ShapeDefinition, ShapeModel } from '../../../../../core/plugins';
import { EXIT_COLOR } from '../../exits/exitKind';
import { INITIAL_KIND } from '../../kinds';

/**
 * Point d'entrée (sujet 433) : disque noir plein Ø 20, taille fixe, sans texte ; départ des transitions seulement
 * (sujet 434). Toujours noir : pas de style à choisir (sujet 440). Dans draw.io, une ellipse noire.
 */

const SIZE = 20;

const outline = (shape: ShapeModel) => ellipsePath(shape.bounds);

function createInitial(shape: ShapeModel, _ctx: RenderContext): Group {
  const group = new Group();
  group.add(fillMesh(outline(shape), new Color(EXIT_COLOR), 1));
  return group;
}

export const definition: ShapeDefinition = {
  id: INITIAL_KIND,
  outline,
  flat: { create: createInitial },
  resizable: false,
  styleable: false,
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
