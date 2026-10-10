import { Color, Group } from 'three';
import { ellipsePath, fillMesh, inset, strokeMesh } from '../../../../../core/plugins';
import type { RenderContext, ShapeDefinition, ShapeModel } from '../../../../../core/plugins';
import { ERROR_COLOR, POINT_COLOR, isErrorExit } from '../../exits/exitKind';
import { FINAL_KIND } from '../../kinds';

/**
 * Point de sortie (sujet 433) : disque noir Ø 14 dans un cercle Ø 24 (cible UML), taille fixe, sans texte ; arrivée
 * des transitions seulement (sujet 434). On peut en poser plusieurs : à l'export, ceux d'un même niveau ne font qu'un
 * `[*]` (sujet 436). Noire pour une sortie attendue, rouge pour une sortie en erreur (`exitKind.ts`) : la couleur suit
 * ce choix : pas de style à choisir (sujet 440). Dans draw.io, une double ellipse.
 */

const SIZE = 24;
const DOT = 14;

const outline = (shape: ShapeModel) => ellipsePath(shape.bounds);

function createFinal(shape: ShapeModel, _ctx: RenderContext): Group {
  const group = new Group();
  const color = new Color(isErrorExit(shape) ? ERROR_COLOR : POINT_COLOR);
  const ring = outline(shape);
  group.add(fillMesh(ring, new Color('#ffffff'), 1));
  const border = strokeMesh(ring, color, 1, { width: 1.5, closed: true });
  if (border) group.add(border);
  // Disque centré, à l'échelle de la forme si un fichier modifié l'a agrandie.
  const margin = (shape.bounds.width * (SIZE - DOT)) / SIZE / 2;
  group.add(fillMesh(ellipsePath(inset(shape.bounds, margin)), color, 1));
  return group;
}

export const definition: ShapeDefinition = {
  id: FINAL_KIND,
  outline,
  flat: { create: createFinal },
  resizable: false,
  styleable: false,
  plainText: true,
  palette: {
    name: 'Point de sortie',
    category: 'states',
    order: 4,
    keywords: ['final', 'sortie', 'end', 'fin'],
    style: `ellipse;shape=doubleEllipse;fillColor=#000000;strokeColor=#000000;html=1;aspect=fixed;spatial.kind=${FINAL_KIND};`,
    value: '',
    width: SIZE,
    height: SIZE,
    icon: '<circle cx="20" cy="14" r="9"/><circle cx="20" cy="14" r="5" fill="currentColor"/>',
  },
};
