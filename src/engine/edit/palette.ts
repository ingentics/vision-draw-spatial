import type { Point, Rect } from '../model/types';

/**
 * Palette de formes (SPEC §14.1) : uniquement des formes que le moteur sait dessiner,
 * avec les styles et tailles par défaut de draw.io (même rendu à la réouverture dans draw.io).
 */
export interface ShapeTemplate {
  id: string;
  name: string;
  /** Catégorie de la palette (`PALETTE_CATEGORIES`). */
  category: PaletteCategoryId;
  /** Mots-clés de la recherche, en plus du nom et de la catégorie. */
  keywords: string[];
  style: string;
  value: string;
  width: number;
  height: number;
}

export type PaletteCategoryId = 'general' | 'architecture';

export interface PaletteCategory {
  id: PaletteCategoryId;
  name: string;
}

/** Catégories de la palette, dans l'ordre d'affichage. */
export const PALETTE_CATEGORIES: PaletteCategory[] = [
  { id: 'general', name: 'Général' },
  { id: 'architecture', name: 'Architecture' },
];

export const SHAPE_TEMPLATES: ShapeTemplate[] = [
  {
    id: 'rectangle',
    name: 'Rectangle',
    category: 'general',
    keywords: ['rect', 'carré', 'boîte', 'square', 'box'],
    style: 'rounded=0;whiteSpace=wrap;html=1;',
    value: '',
    width: 120,
    height: 60,
  },
  {
    id: 'rounded',
    name: 'Rectangle arrondi',
    category: 'general',
    keywords: ['rect', 'arrondi', 'rounded', 'boîte', 'box'],
    style: 'rounded=1;whiteSpace=wrap;html=1;',
    value: '',
    width: 120,
    height: 60,
  },
  {
    id: 'ellipse',
    name: 'Ellipse',
    category: 'general',
    keywords: ['ovale', 'oval'],
    style: 'ellipse;whiteSpace=wrap;html=1;',
    value: '',
    width: 120,
    height: 80,
  },
  {
    id: 'circle',
    name: 'Cercle',
    category: 'general',
    keywords: ['rond', 'circle'],
    style: 'ellipse;whiteSpace=wrap;html=1;aspect=fixed;',
    value: '',
    width: 80,
    height: 80,
  },
  {
    id: 'database',
    name: 'Base de données',
    category: 'architecture',
    keywords: ['bdd', 'database', 'db', 'sql', 'stockage', 'storage', 'cylindre', 'cylinder'],
    style: 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=8;',
    value: '',
    width: 60,
    height: 80,
  },
  {
    id: 'queue',
    name: 'File (queue)',
    category: 'architecture',
    keywords: ['queue', 'message', 'kafka', 'bus', 'cylindre', 'cylinder'],
    // Cylindre couché (bout visible à droite) : le bout garde sa taille quand on l'allonge.
    style: 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=8;direction=south;',
    value: '',
    width: 100,
    height: 30,
  },
  {
    id: 'cache',
    name: 'Cache distribué',
    category: 'architecture',
    keywords: ['cache', 'redis', 'datastore', 'stockage', 'storage'],
    style: 'shape=datastore;whiteSpace=wrap;html=1;',
    value: '',
    width: 60,
    height: 60,
  },
  {
    id: 'rhombus',
    name: 'Losange',
    category: 'general',
    keywords: ['rhombus', 'diamond', 'décision', 'condition'],
    style: 'rhombus;whiteSpace=wrap;html=1;',
    value: '',
    width: 80,
    height: 80,
  },
  {
    id: 'text',
    name: 'Texte',
    category: 'general',
    keywords: ['label', 'texte', 'text', 'étiquette'],
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

/** Texte comparable pour la recherche : minuscules, sans accents. */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Formes trouvées par la recherche de la palette : chaque mot de la requête (casse et accents ignorés) doit
 * apparaître dans le nom, un mot-clé ou le nom de la catégorie. Requête vide = toutes les formes.
 */
export function searchTemplates(templates: ShapeTemplate[], query: string): ShapeTemplate[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return templates;
  return templates.filter((template) => {
    const category = PALETTE_CATEGORIES.find((c) => c.id === template.category)?.name ?? '';
    const haystack = normalize([template.name, category, ...template.keywords].join(' '));
    return words.every((word) => haystack.includes(word));
  });
}
