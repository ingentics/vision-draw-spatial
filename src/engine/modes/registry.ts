import type { DocumentModel, ParseWarning, PageModel } from '../model/types';
import { SPATIAL } from '../spatial';
import type { ModeProperty, PageDressing, PageModeDefinition } from './types';

/** Portée d'un réglage déclaré : la page, une flèche, une forme. */
export type ModeScope = 'page' | 'edge' | 'shape';

/**
 * Registre des modes de page (sujet 69) : ajouter un mode = déposer son dossier `modes/<id>/` (`PAGE_MODE_DEFINITIONS`).
 * Le moteur et l'appli ne posent leurs questions qu'à lui : mode d'une page, habillage, réglages, incohérences.
 */
export class PageModeRegistry {
  private readonly definitions = new Map<string, PageModeDefinition>();

  /** Un mode de même `id` déjà enregistré est remplacé. */
  register(definition: PageModeDefinition): this {
    this.definitions.set(definition.id, definition);
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

  /** Réglages déclarés par le mode de la page pour une portée. */
  properties(page: PageModel, scope: ModeScope): ModeProperty[] {
    const mode = this.modeOf(page);
    if (!mode) return [];
    return (
      (scope === 'page' ? mode.pageProperties : scope === 'edge' ? mode.edgeProperties : mode.shapeProperties) ?? []
    );
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

/** Modes de page : un par dossier `modes/<id>/index.ts` (qui exporte `definition`), collectés tout seuls. */
export const PAGE_MODE_DEFINITIONS: PageModeDefinition[] = Object.values(
  import.meta.glob<PageModeDefinition>('./*/index.ts', { eager: true, import: 'definition' }),
);

export function createDefaultModeRegistry(): PageModeRegistry {
  const registry = new PageModeRegistry();
  for (const definition of PAGE_MODE_DEFINITIONS) registry.register(definition);
  return registry;
}

/** Registre par défaut, partagé par l'appli (panneau) et le moteur quand on ne lui en donne pas. */
export const defaultModeRegistry = createDefaultModeRegistry();
