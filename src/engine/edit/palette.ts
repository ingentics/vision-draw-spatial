import type { Point, Rect } from '../model/types';

/**
 * Palette de formes (SPEC §14.1) : uniquement des formes que le moteur sait dessiner,
 * avec les styles et tailles par défaut de draw.io (même rendu à la réouverture dans draw.io).
 */
export interface ShapeTemplate {
  id: string;
  name: string;
  style: string;
  value: string;
  width: number;
  height: number;
}

export const SHAPE_TEMPLATES: ShapeTemplate[] = [
  { id: 'rectangle', name: 'Rectangle', style: 'rounded=0;whiteSpace=wrap;html=1;', value: '', width: 120, height: 60 },
  {
    id: 'rounded',
    name: 'Rectangle arrondi',
    style: 'rounded=1;whiteSpace=wrap;html=1;',
    value: '',
    width: 120,
    height: 60,
  },
  { id: 'ellipse', name: 'Ellipse', style: 'ellipse;whiteSpace=wrap;html=1;', value: '', width: 120, height: 80 },
  {
    id: 'circle',
    name: 'Cercle',
    style: 'ellipse;whiteSpace=wrap;html=1;aspect=fixed;',
    value: '',
    width: 80,
    height: 80,
  },
  {
    id: 'database',
    name: 'Base de données',
    style: 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=8;',
    value: '',
    width: 60,
    height: 80,
  },
  {
    id: 'queue',
    name: 'File (queue)',
    // Cylindre couché (bout visible à droite) : le bout garde sa taille quand on l'allonge.
    style: 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=8;direction=south;',
    value: '',
    width: 100,
    height: 30,
  },
  {
    id: 'cache',
    name: 'Cache distribué',
    style: 'shape=datastore;whiteSpace=wrap;html=1;',
    value: '',
    width: 60,
    height: 60,
  },
  { id: 'rhombus', name: 'Losange', style: 'rhombus;whiteSpace=wrap;html=1;', value: '', width: 80, height: 80 },
  {
    id: 'text',
    name: 'Texte',
    style: 'text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;',
    value: 'Texte',
    width: 60,
    height: 30,
  },
];

/**
 * Emprise d'une forme déposée : centrée sur le point de dépôt (au sol), coin haut-gauche
 * aimanté à la grille (`gridSize` ≤ 0 : arrondi au pixel).
 */
export function dropBounds(template: Pick<ShapeTemplate, 'width' | 'height'>, at: Point, gridSize: number): Rect {
  const step = gridSize > 0 ? gridSize : 1;
  const snap = (value: number) => Math.round(value / step) * step;
  return {
    x: snap(at.x - template.width / 2),
    y: snap(at.y - template.height / 2),
    width: template.width,
    height: template.height,
  };
}
