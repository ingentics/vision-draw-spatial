import { PageEffectRegistry } from '../core/effects/registry';
import type { PageEffectDefinition } from '../core/effects/types';
import { usedTemplatesIn } from '../core/edit/palette';
import type { ShapeTemplate } from '../core/edit/palette';
import type { PageModel } from '../core/model/types';
import { shapesByMode } from '../core/modes/modeShapes';
import { PageModeRegistry } from '../core/modes/registry';
import type { PageModeDefinition } from '../core/modes/types';
import { groupShape } from '../core/shapes/group';
import { ShapeRegistry } from '../core/shapes/registry';
import { PALETTE_CATEGORIES } from './shapes/categories';

export { PALETTE_CATEGORIES };
import type { ShapeDefinition } from '../core/shapes/types';

/**
 * Racine de composition des plugins (sujet 286) : seul endroit qui connaît les dossiers de `plugins/`. Il les collecte
 * (un dossier = un plugin, qui exporte `definition`) et construit les registres par défaut, que la façade donne au
 * moteur quand on ne lui en passe pas. Le tronc (`core/`) n'importe jamais rien d'ici.
 */

/**
 * Formes (SPEC §8.3) : une par dossier `shapes/<catégorie>/<id>/index.ts`, ou
 * `shapes/<catégorie>/<famille>/<variante>/index.ts` pour une famille (code commun dans `<famille>/common/`). Les bases
 * qu'elles étendent (`shapes/generic/`) ne sont pas des formes.
 */
export const SHAPE_DEFINITIONS: ShapeDefinition[] = Object.values(
  import.meta.glob<ShapeDefinition>(['./shapes/*/*/index.ts', './shapes/*/*/*/index.ts', '!./shapes/generic/**'], {
    eager: true,
    import: 'definition',
  }),
);

/** Modes de page : un par dossier `modes/<id>/index.ts`. */
export const PAGE_MODE_DEFINITIONS: PageModeDefinition[] = Object.values(
  import.meta.glob<PageModeDefinition>('./modes/*/index.ts', { eager: true, import: 'definition' }),
);

/**
 * Formes propres aux modes : une par dossier `modes/<id>/shapes/<forme>/index.ts`. Le registre des formes les
 * enregistre (elles se dessinent sur toute page) ; le registre des modes les réserve à la palette du mode.
 */
export const MODE_SHAPE_DEFINITIONS: Map<string, ShapeDefinition[]> = shapesByMode(
  import.meta.glob<ShapeDefinition>('./modes/*/shapes/*/index.ts', { eager: true, import: 'definition' }),
);

/** Effets de page : un par dossier `effects/<id>/index.ts` ; le retirer = supprimer le dossier. */
export const PAGE_EFFECT_DEFINITIONS: PageEffectDefinition[] = Object.values(
  import.meta.glob<PageEffectDefinition>('./effects/*/index.ts', { eager: true, import: 'definition' }),
);

/** Registre des formes : les catégories de la palette, le groupe (forme du tronc), les formes de `shapes/` et des modes. */
export function createDefaultRegistry(): ShapeRegistry {
  const registry = new ShapeRegistry().register(groupShape);
  for (const category of PALETTE_CATEGORIES) registry.registerCategory(category);
  for (const definition of SHAPE_DEFINITIONS) registry.register(definition);
  for (const definitions of MODE_SHAPE_DEFINITIONS.values())
    for (const definition of definitions) registry.register(definition);
  return registry;
}

export function createDefaultModeRegistry(): PageModeRegistry {
  const registry = new PageModeRegistry();
  for (const definition of PAGE_MODE_DEFINITIONS)
    registry.register(definition, MODE_SHAPE_DEFINITIONS.get(definition.id));
  return registry;
}

export function createDefaultEffectRegistry(): PageEffectRegistry {
  const registry = new PageEffectRegistry();
  for (const definition of PAGE_EFFECT_DEFINITIONS) registry.register(definition);
  return registry;
}

/**
 * Registre des formes de la racine, pour les seules données ci-dessous (modèles de la palette) : jamais donné à un
 * moteur, qui construit les siens (sujet 304).
 */
const templatesRegistry = createDefaultRegistry();

/** Modèles de toutes les formes (y compris celles des modes), dans l'ordre d'affichage de la palette. */
export const SHAPE_TEMPLATES: ShapeTemplate[] = templatesRegistry.templates();

/** Modèles des formes présentes sur la page, d'après les formes par défaut (`usedTemplatesIn`). */
export function usedTemplates(page: Pick<PageModel, 'shapes'> | undefined): ShapeTemplate[] {
  return usedTemplatesIn(page, templatesRegistry);
}
