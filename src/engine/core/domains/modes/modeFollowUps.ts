import { documentFromTree } from '../../format/parse';
import { writeDrawio } from '../../format/write';
import type { PageModel, Rect, ShapeModel } from '../../model/types';
import { freezeModel } from '../../model/freeze';
import { hasExactTextMeasure } from '../../render/textMeasure';
import { applyModeEdit } from '../../modes/modeEditWriter';
import { callMode } from '../../modes/modeCalls';
import type { ModeEdit } from '../../modes/modeEdit';
import type { PageModeDefinition } from '../../modes/types';
import type { EngineCore } from '../EngineCore';

/**
 * Remises en ordre par le mode de la page (sujets 255, 288, 302), sorties de `PageModes` (sujet 379) : après une
 * modification déjà écrite dans l'arbre (pose, texte, flèche créée ou rebranchée, suppression), et à l'ouverture du
 * document. Appels au mode protégés par l'hôte (`PageModes.guard`), arguments en lecture seule (`callMode`).
 */
export class ModeFollowUps {
  constructor(private readonly core: EngineCore) {}

  /**
   * Remise en ordre par le mode de la page, après une modification déjà écrite dans l'arbre, dans la même étape
   * d'annulation (sujet 288) : `run` reçoit la page relue de l'arbre. Vrai si l'arbre a changé (le modèle est alors à
   * relire) ; rien d'écrit si le mode lève une exception, ou si une de ses écritures échoue en route (sujet 302).
   */
  private followUp<F>(
    pageId: string,
    hook: string,
    entryOf: (mode: PageModeDefinition) => F | undefined,
    run: (entry: F, edit: ModeEdit, fresh: PageModel) => void,
  ): boolean {
    // Page modifiable seulement (sujet 302), comme une opération.
    const target = this.core.targets.editablePageById(pageId);
    const mode = target && this.core.modes.modeOf(target.page);
    const entry = mode && entryOf(mode);
    const pageTree = target?.pageTree;
    if (!mode || !entry || !pageTree || !this.core.file.xmlTree) return false;
    const read = documentFromTree(this.core.file.xmlTree).pages.find((p) => p.id === pageId);
    if (!read) return false;
    // Page de ce seul usage : gelée comme celles du document, le mode n'y écrit pas (sujet 324).
    const fresh = freezeModel(read);
    const context = this.core.pageModes.editContext();
    return this.core.pageModes.guard(mode, hook, false, () =>
      applyModeEdit(fresh, pageTree, mode, (edit) => run(entry, edit, fresh), context),
    );
  }

  /**
   * Formes posées sur la page (déplacées, redimensionnées, ajoutées, collées), déjà écrites dans l'arbre : le mode de
   * la page les remet en ordre (`gestures.placed`). `previous` : bornes d'avant d'une forme qui a bougé (déplacement,
   * redimensionnement), pour retrouver la page d'avant ; absent pour un ajout.
   */
  shapesPlaced(pageId: string, shapeIds: string[], previous?: (shape: ShapeModel) => Rect | undefined): boolean {
    if (shapeIds.length === 0) return false;
    return this.followUp(
      pageId,
      'gestures.placed',
      (mode) => mode.gestures?.placed,
      (placed, edit, fresh) => {
        const before = previous && {
          ...fresh,
          shapes: fresh.shapes.map((shape) => {
            const bounds = previous(shape);
            return bounds ? { ...shape, bounds } : shape;
          }),
        };
        callMode(placed, edit, shapeIds, before);
      },
    );
  }

  /** Texte d'un élément changé, déjà écrit : remise en ordre par le mode (`gestures.relabeled`, ex. table RDD élargie). */
  elementRelabeled(pageId: string, elementId: string): void {
    this.followUp(
      pageId,
      'gestures.relabeled',
      (mode) => mode.gestures?.relabeled,
      (relabeled, edit) => callMode(relabeled, edit, elementId),
    );
  }

  /** Bout d'une flèche rebranché, déjà écrit : remise en ordre par le mode (`edges.reconnected`, sujet 265). */
  edgeReconnected(pageId: string, edgeId: string, part?: string): void {
    this.followUp(
      pageId,
      'edges.reconnected',
      (mode) => mode.edges?.reconnected,
      (reconnected, edit) => callMode(reconnected, edit, edgeId, part),
    );
  }

  /** Flèche tirée depuis une forme, déjà écrite : le mode la reçoit (`edges.created`, ex. ajoutée au flux courant). */
  edgeCreated(pageId: string, edgeId: string, part?: string): void {
    const current = this.core.modeCurrents.getModeCurrent(pageId);
    this.followUp(
      pageId,
      'edges.created',
      (mode) => mode.edges?.created,
      (created, edit) => callMode(created, edit, edgeId, current, part),
    );
  }

  /** Éléments supprimés, déjà retirés de l'arbre : le mode remet ses données en ordre (`lifecycle.removed`, ex. rangs resserrés). */
  elementsRemoved(pageId: string): void {
    this.followUp(
      pageId,
      'lifecycle.removed',
      (mode) => mode.lifecycle?.removed,
      (removed, edit) => callMode(removed, edit),
    );
  }

  /**
   * Document ouvert, ou mesure exacte du texte arrivée : chaque page d'un mode est remise en ordre par
   * `lifecycle.opened` (sujet 255), en une étape d'annulation pour tout le document ; rien si rien ne change, si on ne
   * peut pas modifier ou tant que la mesure du texte n'est qu'approchée.
   */
  documentOpened(): void {
    const document = this.core.file.getDocument();
    const xmlTree = this.core.file.xmlTree;
    // Mesure approchée (polices pas encore chargées) : on attend la mesure exacte, sinon chaque ouverture décalerait les
    // tailles d'un fichier déjà ajusté.
    if (!document || !xmlTree || !hasExactTextMeasure()) return;
    const before = writeDrawio(xmlTree);
    const context = this.core.pageModes.editContext();
    const changed = document.pages
      .filter((page) => {
        const mode = this.core.modes.modeOf(page);
        const opened = mode?.lifecycle?.opened;
        const target = opened && this.core.targets.editablePageById(page.id);
        if (!mode || !opened || !target) return false;
        return this.core.pageModes.guard(mode, 'lifecycle.opened', false, () =>
          applyModeEdit(target.page, target.pageTree, mode, opened, context),
        );
      })
      .map((page) => page.id);
    if (changed.length === 0) return;
    this.core.edits.recordSnapshot('Ajustement du mode', before);
    this.core.file.documentChanged(changed);
  }
}
