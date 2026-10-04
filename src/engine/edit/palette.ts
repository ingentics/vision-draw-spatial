import type { PageModel, Point, Rect, ShapeModel } from '../model/types';
import { defaultShapeRegistry } from '../shapes/registry';
import type { PaletteCategoryId, ShapeTemplate } from '../shapes/types';

export type { PaletteCategoryId, ShapeTemplate };

/**
 * Palette de formes (SPEC §14.1) : uniquement des formes que le moteur sait dessiner, avec les styles et tailles par
 * défaut de draw.io (même rendu à la réouverture dans draw.io). Chaque forme déclare ses modèles dans sa définition
 * (`shapes/<forme>/`) ; la palette les rassemble.
 */

export interface PaletteCategory {
  id: PaletteCategoryId;
  name: string;
}

/** Catégories de la palette, dans l'ordre d'affichage. */
export const PALETTE_CATEGORIES: PaletteCategory[] = [
  { id: 'geometry', name: 'Géométrie' },
  { id: 'general', name: 'Général' },
  { id: 'architecture', name: 'Architecture' },
];

/** Modèles de la palette, dans l'ordre d'affichage. */
export const SHAPE_TEMPLATES: ShapeTemplate[] = defaultShapeRegistry.templates();

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

/**
 * Modèle de la palette d'une forme, d'après sa définition (la variante qu'elle est) : une forme d'un fichier ouvert
 * est reconnue comme une forme posée depuis la palette. `undefined` : aucun modèle.
 */
export function templateOfShape(shape: ShapeModel): ShapeTemplate | undefined {
  return defaultShapeRegistry.templateOf(shape);
}

/** Modèles des formes présentes sur la page, une fois chacun, dans l'ordre de la palette. */
export function usedTemplates(page: Pick<PageModel, 'shapes'> | undefined): ShapeTemplate[] {
  if (!page) return [];
  const used = new Set<string>();
  for (const shape of page.shapes) {
    const template = templateOfShape(shape);
    if (template) used.add(template.id);
  }
  return SHAPE_TEMPLATES.filter((template) => used.has(template.id));
}
