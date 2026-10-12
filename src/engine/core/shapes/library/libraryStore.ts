import { setStyleKey } from '../../format/style';
import { freezePlain } from '../../model/freeze';
import type { ReadonlyShapeModel as ShapeModel } from '../../model/readonly';
import { SPATIAL } from '../../spatial';
import type { PaletteCategory, ShapeDefinition, ShapeTemplate } from '../types';
import { readShapeLibrary } from './libraryFormat';
import type { LibraryShape, ShapeLibrary, ShapeLibraryResult } from './libraryFormat';

/**
 * Bibliothèques de formes chargées dans un registre (sujets 529, 530) : leurs formes, leurs modèles de palette, et les
 * bibliothèques ou formes que l'hôte a déclarées introuvables. Partagé par les copies d'un registre (`reportingTo`…).
 */

/** État d'une forme posée depuis une bibliothèque (`spatial.library`). */
export type LibraryShapeState = 'loaded' | 'unloaded' | 'unavailable';

export interface LibraryShapeStatus {
  library: string;
  kind: string;
  state: LibraryShapeState;
}

/** Forme d'une bibliothèque, ou toute la bibliothèque sans `kind`, que l'hôte n'a pas pu fournir (sujet 531). */
export interface LibraryShapeRef {
  library: string;
  kind?: string;
}

/**
 * Ce que les plugins fournissent pour dessiner les bibliothèques (racine de composition) : le tronc ne dessine aucune
 * forme, il ne sait que les ranger.
 */
export interface ShapeLibraryKit {
  /**
   * Définition d'une forme de bibliothèque (son `id` : celui du modèle de palette, `<bibliothèque>:<forme>`) ; `icon` :
   * celle de la palette (contenu SVG du cadre `0 0 40 28`), pour l'aperçu du panneau.
   */
  build(id: string, shape: LibraryShape, icon: string): ShapeDefinition;
  /** Forme posée dont la bibliothèque n'est pas chargée, ou déclarée introuvable. */
  unloaded(state: Exclude<LibraryShapeState, 'loaded'>): ShapeDefinition;
}

interface LoadedLibrary {
  library: ShapeLibrary;
  definitions: Map<string, ShapeDefinition>;
  templates: ShapeTemplate[];
  categories: PaletteCategory[];
}

/**
 * Catégorie « Autres » de la palette (sujet 538) : celle des formes de bibliothèque sans catégorie, toutes
 * bibliothèques confondues. Comme toute catégorie, la palette la cache tant qu'aucune de ses formes n'y est proposée.
 */
export const OTHER_CATEGORY: PaletteCategory = freezePlain({ id: 'other', name: 'Autres', order: 1000 });

/** Id d'une catégorie ou d'un modèle de bibliothèque : propre à elle, jamais en conflit avec une forme intégrée. */
const libraryKey = (library: string, id: string) => `${library}:${id}`;

/**
 * Valeur d'un attribut spatial, du style ou de l'objet. Appelé pour toute forme résolue : une forme construite à la
 * main (aperçu, test) peut n'avoir ni style ni attributs.
 */
function spatialOf(shape: ShapeModel, key: string): string | undefined {
  const { style, attributes } = shape as Partial<Pick<ShapeModel, 'style' | 'attributes'>>;
  return (style?.[key] ?? attributes?.[key])?.trim() || undefined;
}

/** Bibliothèque et forme d'une forme posée depuis une bibliothèque ; undefined pour une autre forme. */
export function libraryRefOf(shape: ShapeModel): { library: string; kind: string } | undefined {
  const library = spatialOf(shape, SPATIAL.library);
  return library === undefined ? undefined : { library, kind: spatialOf(shape, SPATIAL.kind) ?? '' };
}

export class ShapeLibraryStore {
  private kit: ShapeLibraryKit | undefined;
  private unloadedShapes: Record<Exclude<LibraryShapeState, 'loaded'>, ShapeDefinition> | undefined;
  private readonly loaded = new Map<string, LoadedLibrary>();
  /** Introuvables : `<bibliothèque>` (toute la bibliothèque) ou `<bibliothèque>:<forme>`. */
  private readonly unavailable = new Set<string>();

  /** Dessin des bibliothèques ; sans lui, une forme de bibliothèque se résout comme une autre (`spatial.kind`). */
  useKit(kit: ShapeLibraryKit): void {
    this.kit = kit;
    this.unloadedShapes = { unloaded: kit.unloaded('unloaded'), unavailable: kit.unloaded('unavailable') };
  }

  /**
   * Enregistre la bibliothèque d'un JSON, ou la remplace si son id est déjà chargé (pas de version : la dernière
   * l'emporte). Elle n'est plus introuvable. Sans dessin des bibliothèques (`useKit`), rien n'est enregistré.
   */
  register(json: unknown): ShapeLibraryResult {
    const kit = this.kit;
    if (!kit) return { ok: false, errors: ['bibliothèques de formes non gérées par ce registre'] };
    const result = readShapeLibrary(json);
    if (!result.ok) return result;
    const { library } = result;
    const definitions = new Map<string, ShapeDefinition>();
    const templates: ShapeTemplate[] = [];
    for (const [order, shape] of library.shapes.entries()) {
      const template = freezePlain(templateOf(library.id, libraryKey(library.id, shape.id), shape, order));
      definitions.set(shape.id, freezePlain(kit.build(template.id, shape, template.icon)));
      templates.push(template);
    }
    const categories = library.categories.map((category) =>
      freezePlain({ id: libraryKey(library.id, category.id), name: category.name, order: category.order }),
    );
    this.loaded.set(library.id, { library, definitions, templates, categories });
    for (const key of [...this.unavailable])
      if (key === library.id || key.startsWith(libraryKey(library.id, ''))) this.unavailable.delete(key);
    return result;
  }

  /** Retire une bibliothèque ; faux si elle n'était pas chargée. Ses formes posées redeviennent non chargées. */
  unregister(libraryId: string): boolean {
    return this.loaded.delete(libraryId);
  }

  /** Déclare des bibliothèques ou des formes introuvables ; vrai si une forme a changé d'état. */
  markUnavailable(refs: readonly LibraryShapeRef[]): boolean {
    const before = this.unavailable.size;
    for (const ref of refs)
      this.unavailable.add(ref.kind === undefined ? ref.library : libraryKey(ref.library, ref.kind));
    return this.unavailable.size !== before;
  }

  library(libraryId: string): ShapeLibrary | undefined {
    return this.loaded.get(libraryId)?.library;
  }

  libraries(): ShapeLibrary[] {
    return [...this.loaded.values()].map((entry) => entry.library);
  }

  /** Modèles de palette des bibliothèques, dans l'ordre des bibliothèques puis de leurs formes. */
  templates(): ShapeTemplate[] {
    return [...this.loaded.values()].flatMap((entry) => entry.templates);
  }

  /** Catégories des bibliothèques, et « Autres » (sujet 538) dès qu'une bibliothèque est chargée. */
  categories(): PaletteCategory[] {
    const categories = [...this.loaded.values()].flatMap((entry) => entry.categories);
    return this.loaded.size > 0 ? [...categories, OTHER_CATEGORY] : categories;
  }

  /** État d'une forme posée depuis une bibliothèque ; undefined pour une autre forme ou sans dessin des bibliothèques. */
  status(shape: ShapeModel): LibraryShapeStatus | undefined {
    const ref = this.kit && libraryRefOf(shape);
    if (!ref) return undefined;
    const state: LibraryShapeState = this.loaded.get(ref.library)?.definitions.has(ref.kind)
      ? 'loaded'
      : this.unavailable.has(ref.library) || this.unavailable.has(libraryKey(ref.library, ref.kind))
        ? 'unavailable'
        : 'unloaded';
    return { ...ref, state };
  }

  /** Définition d'une forme de bibliothèque (la sienne, ou celle d'une forme non chargée) ; undefined pour une autre. */
  resolve(shape: ShapeModel): ShapeDefinition | undefined {
    const status = this.status(shape);
    if (!status) return undefined;
    if (status.state === 'loaded') return this.loaded.get(status.library)!.definitions.get(status.kind);
    return this.unloadedShapes![status.state];
  }

  /** Modèle de palette d'une forme chargée ; undefined pour une autre. */
  templateOf(shape: ShapeModel): ShapeTemplate | undefined {
    const status = this.status(shape);
    if (status?.state !== 'loaded') return undefined;
    const id = libraryKey(status.library, status.kind);
    return this.loaded.get(status.library)!.templates.find((template) => template.id === id);
  }
}

/**
 * Modèle de palette d'une forme : son style porte la bibliothèque et la forme (`spatial.library`, `spatial.kind`),
 * qu'un style du JSON ne peut pas remplacer.
 */
function templateOf(libraryId: string, id: string, shape: LibraryShape, order: number): ShapeTemplate {
  let style = setStyleKey(setStyleKey(shape.style, SPATIAL.library, undefined), SPATIAL.kind, undefined);
  style = setStyleKey(style, SPATIAL.library, libraryId);
  style = setStyleKey(style, SPATIAL.kind, shape.id);
  return {
    id,
    name: shape.name,
    category: shape.category === undefined ? OTHER_CATEGORY.id : libraryKey(libraryId, shape.category),
    order,
    keywords: shape.keywords,
    ...(shape.description === undefined ? {} : { description: shape.description }),
    style,
    value: shape.value,
    width: shape.width,
    height: shape.height,
    icon: iconOf(shape),
    library: libraryId,
    ...(shape.modes ? { modes: shape.modes } : {}),
  };
}

/** Marge de l'icône tirée du contour dans le cadre `0 0 40 28` de la palette. */
const ICON_MARGIN = 4;

/**
 * Icône de la palette : les tracés du JSON, sinon le contour et les tracés intérieurs ramenés dans le cadre. Aussi
 * l'aperçu d'une proposition Metamorph (sujet 538).
 */
export function iconOf(shape: LibraryShape): string {
  if (shape.icon) return shape.icon.map((d) => `<path d="${d}"/>`).join('');
  const at = (p: { x: number; y: number }) =>
    `${+(ICON_MARGIN + p.x * (40 - 2 * ICON_MARGIN)).toFixed(2)} ${+(ICON_MARGIN + p.y * (28 - 2 * ICON_MARGIN)).toFixed(2)}`;
  const path = (points: { x: number; y: number }[], closed: boolean) =>
    `<path d="M${points.map(at).join('L')}${closed ? 'Z' : ''}"/>`;
  return [path(shape.render.outline, true), ...shape.render.details.map((d) => path(d.path, d.closed))].join('');
}
