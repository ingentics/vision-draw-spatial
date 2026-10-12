import type { PageModePalette, ShapeTemplate } from '../core/edit/palette';
import type { PageModel } from '../core/model/types';
import type { ShapeRegistryView } from '../core/shapes/registry';
import type { ShapeLibrary, ShapeLibraryResult } from '../core/shapes/library/libraryFormat';
import type { LibraryShapeRef } from '../core/shapes/library/libraryStore';
import type { EngineCore } from '../core/domains/EngineCore';

/** Formes du moteur : registre en lecture seule, palette, bibliothèques de formes (sujets 529 à 531). */
export class ShapesApi {
  constructor(private readonly core: EngineCore) {}

  /** Formes du moteur, en lecture seule (panneau, aperçus ; sujets 290, 304). */
  registry(): ShapeRegistryView {
    return this.core.registry.view();
  }

  /** Palette d'une page : catégories et modèles proposés, d'après son mode et les formes du moteur. */
  paletteFor(page: PageModel | undefined): PageModePalette {
    return this.core.pageModes.palette(page);
  }

  /** Modèles des formes présentes sur la page (catégorie « Utilisées » de la palette). */
  usedTemplates(page: Pick<PageModel, 'shapes'> | undefined): ShapeTemplate[] {
    return this.core.registry.usedTemplates(page);
  }

  /**
   * Charge une bibliothèque de formes depuis son JSON (sujet 529, format `drawio-spatial/shapes`) : ses catégories
   * arrivent dans la palette, ses formes posées se dessinent. Un id déjà chargé est remplacé. Un JSON invalide ne
   * change rien et rend ses erreurs.
   */
  register(json: unknown): ShapeLibraryResult {
    return this.core.shapeLibraries.register(json);
  }

  /** Retire une bibliothèque de formes ; ses formes posées s'affichent non chargées. Faux si elle n'était pas chargée. */
  unregister(libraryId: string): boolean {
    return this.core.shapeLibraries.unregister(libraryId);
  }

  /**
   * Bibliothèques (sans `kind`) ou formes que l'hôte ne peut pas fournir (sujet 531, réponse à `shapesMissing`) :
   * dessinées introuvables et signalées dans les Diagnostics, jusqu'à ce que leur bibliothèque soit enregistrée.
   */
  markUnavailable(refs: readonly LibraryShapeRef[]): void {
    this.core.shapeLibraries.markUnavailable(refs);
  }

  /** Bibliothèque de formes chargée (métadonnées et `meta` compris), en lecture seule. */
  library(libraryId: string): ShapeLibrary | undefined {
    return this.core.shapeLibraries.library(libraryId);
  }

  libraries(): ShapeLibrary[] {
    return this.core.shapeLibraries.libraries();
  }
}
