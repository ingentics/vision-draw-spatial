import { PALETTE_CATEGORIES, SHAPE_TEMPLATES } from '../edit/palette';
import type { PageModePalette } from '../edit/palette';
import type { PageEffectDefinition } from '../effects/types';
import type { ViewMode } from '../interaction/cameraMath';
import type { DocumentModel, ParseWarning, PageModel } from '../model/types';
import type { PaletteCategory, ShapeDefinition, ShapeTemplate } from '../shapes/types';
import { SPATIAL } from '../spatial';
import { MODE_SHAPE_DEFINITIONS } from './modeShapes';
import type { ModeProperty, PageDressing, PageModeDefinition } from './types';

/** Modes d'affichage, dans l'ordre des boutons. */
const VIEW_MODES: ViewMode[] = ['top', 'iso', '3d'];

/** Portée d'un réglage déclaré : la page, une flèche, une forme. */
export type ModeScope = 'page' | 'edge' | 'shape';

/**
 * Registre des modes de page (sujet 69) : ajouter un mode = déposer son dossier `modes/<id>/` (`PAGE_MODE_DEFINITIONS`).
 * Le moteur et l'appli ne posent leurs questions qu'à lui : mode d'une page, habillage, réglages, incohérences.
 */
export class PageModeRegistry {
  private readonly definitions = new Map<string, PageModeDefinition>();
  /** Ids des formes propres à chaque mode (`modes/<id>/shapes/`), réservées à la palette de ses pages. */
  private readonly shapeIds = new Map<string, string[]>();

  /**
   * Un mode de même `id` déjà enregistré est remplacé. `shapes` : ses formes propres (enregistrées à part dans le
   * registre des formes, qui les dessine sur toute page).
   */
  register(definition: PageModeDefinition, shapes: ShapeDefinition[] = []): this {
    this.definitions.set(definition.id, definition);
    this.shapeIds.set(
      definition.id,
      shapes.map((shape) => shape.id),
    );
    return this;
  }

  /** Modes enregistrés, par nom. */
  list(): PageModeDefinition[] {
    return [...this.definitions.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  get(id: string): PageModeDefinition | undefined {
    return this.definitions.get(id);
  }

  /** Identifiant du mode écrit sur la page (`spatial.mode`), connu ou non ; undefined = page normale. */
  modeId(page: PageModel): string | undefined {
    return page.attributes[SPATIAL.mode]?.trim() || undefined;
  }

  /** Mode de la page ; undefined pour une page normale ou un mode inconnu. */
  modeOf(page: PageModel): PageModeDefinition | undefined {
    const id = this.modeId(page);
    return id === undefined ? undefined : this.definitions.get(id);
  }

  /** Habillage du rendu de la page par son mode (rien pour une page normale). */
  dressing(page: PageModel): PageDressing | undefined {
    return this.modeOf(page)?.dressing?.(page);
  }

  /**
   * L'effet est-il actif sur la page ? Son mode le permet (sujet 143 ; oui pour une page normale ou un mode qui ne dit
   * rien) et permet l'un des modes d'affichage de l'effet (sujet 196).
   */
  allowsEffect(page: PageModel, effect: Pick<PageEffectDefinition, 'id' | 'viewModes'>): boolean {
    if (!(this.modeOf(page)?.allowsEffect?.(effect.id) ?? true)) return false;
    return !effect.viewModes || effect.viewModes.some((mode) => this.allowsViewMode(page, mode));
  }

  /** Le mode de la page permet-il ce mode d'affichage (sujet 178) ? Oui pour une page normale ou sans `viewModes`. */
  allowsViewMode(page: PageModel, mode: ViewMode): boolean {
    const allowed = this.modeOf(page)?.viewModes;
    return !allowed || allowed.length === 0 || allowed.includes(mode);
  }

  /** Mode d'affichage de la page pour celui demandé : lui s'il est permis, sinon le premier permis par le mode. */
  viewModeFor(page: PageModel, mode: ViewMode): ViewMode {
    if (this.allowsViewMode(page, mode)) return mode;
    return VIEW_MODES.find((m) => this.modeOf(page)!.viewModes!.includes(m))!;
  }

  /**
   * Palette d'une page (sujet 178) : sur une page normale, les formes générales ; sur une page d'un mode, sa liste
   * blanche (`shapes`) ou, à défaut, les formes générales et celles du mode. Les formes d'un autre mode n'y sont
   * jamais. Catégories : celles de la palette et du mode, par rang, sans les vides.
   */
  paletteFor(
    page: PageModel | undefined,
    templates: ShapeTemplate[] = SHAPE_TEMPLATES,
    categories: PaletteCategory[] = PALETTE_CATEGORIES,
  ): PageModePalette {
    const mode = page && this.modeOf(page);
    const own = new Set(mode ? this.shapeIds.get(mode.id) : []);
    const others = new Set([...this.shapeIds.values()].flat().filter((id) => !own.has(id)));
    const offered = mode?.shapes ? new Set(mode.shapes) : undefined;
    const shown = templates.filter((template) => (offered ? offered.has(template.id) : !others.has(template.id)));
    const used = new Set(shown.map((template) => template.category));
    return {
      categories: [...categories, ...(mode?.paletteCategories ?? [])]
        .filter((category) => used.has(category.id))
        .sort((a, b) => a.order - b.order),
      templates: shown,
    };
  }

  /** Réglages déclarés par le mode de la page pour une portée. */
  properties(page: PageModel, scope: ModeScope, part?: string): ModeProperty[] {
    const mode = this.modeOf(page);
    if (!mode) return [];
    const all =
      (scope === 'page' ? mode.pageProperties : scope === 'edge' ? mode.edgeProperties : mode.shapeProperties) ?? [];
    // Partie sélectionnée (sujet 249) : ses réglages seulement ; sinon, ceux de la forme.
    return scope === 'shape' ? all.filter((property) => (property.part === true) === (part !== undefined)) : all;
  }

  /** Attributs à retirer des éléments collés : ceux de tous les modes (ils dorment sur une page d'un autre mode). */
  pasteKeys(): string[] {
    return [...new Set([...this.definitions.values()].flatMap((mode) => mode.pasteKeys ?? []))];
  }

  /** Avertissements des pages en mode (mode inconnu, données remises en ordre), pour le panneau Diagnostics. */
  warnings(document: DocumentModel): ParseWarning[] {
    return document.pages.flatMap((page) => {
      const id = this.modeId(page);
      if (id === undefined) return [];
      const mode = this.definitions.get(id);
      if (!mode) return [{ pageId: page.id, message: `Mode de page inconnu : ${id}` }];
      return (mode.check?.(page) ?? []).map((issue) => ({ pageId: page.id, ...issue }));
    });
  }
}

/**
 * Modes de page : un par dossier `modes/<id>/index.ts` (qui exporte `definition`), collectés tout seuls ; leurs formes
 * propres dans `modes/<id>/shapes/` (`MODE_SHAPE_DEFINITIONS`).
 */
export const PAGE_MODE_DEFINITIONS: PageModeDefinition[] = Object.values(
  import.meta.glob<PageModeDefinition>('./*/index.ts', { eager: true, import: 'definition' }),
);

export function createDefaultModeRegistry(): PageModeRegistry {
  const registry = new PageModeRegistry();
  for (const definition of PAGE_MODE_DEFINITIONS)
    registry.register(definition, MODE_SHAPE_DEFINITIONS.get(definition.id));
  return registry;
}

/** Registre par défaut, partagé par l'appli (panneau) et le moteur quand on ne lui en donne pas. */
export const defaultModeRegistry = createDefaultModeRegistry();
