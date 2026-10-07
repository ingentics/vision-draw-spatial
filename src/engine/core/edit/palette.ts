import type { PageModel, Point, Rect } from '../model/types';
import type { ShapeRegistry } from '../shapes/registry';
import type { PaletteCategory, PaletteCategoryId, ShapeTemplate } from '../shapes/types';

export type { PaletteCategory, PaletteCategoryId, ShapeTemplate };

/**
 * Palette de formes (SPEC §14.1) : uniquement des formes que le moteur sait dessiner, avec les styles et tailles par
 * défaut de draw.io (même rendu à la réouverture dans draw.io). Chaque forme déclare ses modèles dans sa définition
 * (`shapes/<forme>/`) ; la palette les rassemble.
 */

/** Contenu de la palette d'une page : catégories non vides, dans l'ordre, et formes proposées. */
export interface PageModePalette {
  categories: PaletteCategory[];
  templates: ShapeTemplate[];
}

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
 * apparaître dans le nom, un mot-clé ou le nom de la catégorie (`categories` : celles de la page). Requête vide =
 * toutes les formes.
 */
export function searchTemplates(
  templates: ShapeTemplate[],
  query: string,
  categories: readonly PaletteCategory[],
): ShapeTemplate[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return templates;
  return templates.filter((template) => {
    const category = categories.find((c) => c.id === template.category)?.name ?? '';
    const haystack = normalize([template.name, category, ...template.keywords].join(' '));
    return words.every((word) => haystack.includes(word));
  });
}

/**
 * Modèles des formes présentes sur la page, une fois chacun, dans l'ordre de la palette : une forme d'un fichier ouvert
 * est reconnue comme une forme posée depuis la palette (`ShapeRegistry.templateOf`, la variante qu'elle est).
 */
export function usedTemplatesIn(page: Pick<PageModel, 'shapes'> | undefined, registry: ShapeRegistry): ShapeTemplate[] {
  if (!page) return [];
  const used = new Set<string>();
  for (const shape of page.shapes) {
    const template = registry.templateOf(shape);
    if (template) used.add(template.id);
  }
  return registry.templates().filter((template) => used.has(template.id));
}
