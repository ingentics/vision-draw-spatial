import type { DocumentModel } from '../../model/types';
import type { ShapeLibrary, ShapeLibraryResult } from '../../shapes/library/libraryFormat';
import type { LibraryShapeRef } from '../../shapes/library/libraryStore';
import type { EngineCore } from '../EngineCore';

/** Forme de bibliothèque posée dans le document et non chargée, signalée à l'hôte (`shapesMissing`, sujet 531). */
export interface MissingLibraryShape {
  library: string;
  kind: string;
}

/**
 * Bibliothèques de formes du moteur (sujets 529 à 531) : chargées, remplacées, retirées ou déclarées introuvables par
 * l'hôte (le registre des formes les garde), et formes non chargées du document signalées à l'hôte, une fois chacune.
 */
export class ShapeLibraries {
  /**
   * Paires `<bibliothèque>:<forme>` déjà vues dans le document depuis son ouverture, chargées ou signalées : aucune
   * n'est signalée deux fois (ni après un `unregister`, ni après un refus de l'hôte).
   */
  private readonly seen = new Set<string>();

  constructor(private readonly core: EngineCore) {}

  /** Enregistre (ou remplace, même id) la bibliothèque d'un JSON ; ses erreurs de lecture sinon, rien n'étant changé. */
  register(json: unknown): ShapeLibraryResult {
    const result = this.core.registry.registerLibrary(json);
    if (result.ok) this.changed();
    return result;
  }

  /** Retire une bibliothèque : ses formes posées redeviennent non chargées. Faux si elle n'était pas chargée. */
  unregister(libraryId: string): boolean {
    const removed = this.core.registry.unregisterLibrary(libraryId);
    if (removed) this.changed();
    return removed;
  }

  /** Bibliothèques (sans `kind`) ou formes que l'hôte ne peut pas fournir : dessinées introuvables. */
  markUnavailable(refs: readonly LibraryShapeRef[]): void {
    if (this.core.registry.markLibraryShapesUnavailable(refs)) this.changed();
  }

  library(libraryId: string): ShapeLibrary | undefined {
    return this.core.registry.library(libraryId);
  }

  libraries(): ShapeLibrary[] {
    return this.core.registry.libraries();
  }

  resetDocument(): void {
    this.seen.clear();
  }

  /**
   * Document ouvert ou modifié (collage, annuler…) : les formes de bibliothèque non chargées encore jamais vues sont
   * signalées à l'hôte, en une liste.
   */
  documentShown(document: DocumentModel): void {
    const missing: MissingLibraryShape[] = [];
    for (const page of document.pages)
      for (const shape of page.shapes) {
        const status = this.core.registry.libraryStatus(shape);
        if (!status) continue;
        const key = `${status.library}:${status.kind}`;
        if (this.seen.has(key)) continue;
        this.seen.add(key);
        if (status.state === 'unloaded') missing.push({ library: status.library, kind: status.kind });
      }
    if (missing.length > 0) this.core.events.emit('shapesMissing', missing);
  }

  /** Formes changées : Diagnostics recalculés, scènes redessinées, palette à relire par l'appli. */
  private changed(): void {
    this.core.file.shapesChanged();
    this.core.levels.rebuildScenes();
    this.core.events.emit('shapeLibrariesChange');
  }
}
