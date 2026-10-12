import type { EditLock, KeepInView, PageOverlay } from '../core/modes/pageTakeover';
import type { PageTakeover } from '../core/modes/pageTakeover';
import type { EngineCore } from '../core/domains/EngineCore';

/** Prise en main de la page par un mode (sujet 467) : exactement `PageTakeover`, remis aux modes de l'appli à la place du moteur entier. */
export class TakeoverApi implements PageTakeover {
  constructor(private readonly core: EngineCore) {}

  /**
   * Verrouille l'édition de la page affichée pour `owner` (même en lecture seule) : sélection vidée, rien ne se modifie
   * (pages, annuler et rétablir compris), la caméra reste libre ; les entrées peuvent être capturées
   * (`EditLock.captureInput`). Rendu par `release`, au changement de page ou de document, ou à l'arrêt du moteur
   * (`released` est alors appelé) ; signalé par `editLockChange`.
   */
  lockEditing(owner: object, released?: () => void): EditLock | undefined {
    return this.core.editLocks.lock(owner, released);
  }

  /** Pose la couche de `owner` sur la page affichée : voile, éléments gardés, objets dessinés par le mode. */
  setOverlay(owner: object, overlay: PageOverlay): void {
    this.core.overlays.set(owner, overlay);
  }

  clearOverlay(owner: object): void {
    this.core.overlays.clear(owner);
  }

  /** La forme sort de la vue : la caméra glisse pour la cadrer, avec les formes `around`. */
  keepInView(shapeId: string, options?: KeepInView): void {
    this.core.camera.keepInView(shapeId, options);
  }

  /** Choisit le courant du mode d'une page (ex. bouton « suivant » de la barre) ; ignoré s'il n'est pas valable. */
  setModeCurrent(value: string, pageId?: string): void {
    this.core.modeCurrents.setModeCurrent(value, pageId);
  }
}
