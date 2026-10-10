import type { EditLock, InputCapture } from '../../modes/pageTakeover';
import type { Point } from '../../model/types';
import type { EngineCore } from '../EngineCore';

/**
 * Entrées capturées par le détenteur du verrou d'édition (sujet 467, brique de la prise en main de la page) : un clic
 * ne sélectionne rien, il est rendu au détenteur avec l'élément visé (celui de la couche d'abord, sinon celui de la
 * page) ; le survol ne montre que la main sur ce qui réagit ; les touches vont au détenteur, celles qu'il ne prend pas
 * à la vue. Finie quand le verrou est rendu. Chaque appel au détenteur est protégé.
 */
export class InputCaptures {
  private captured: { lock: EditLock; capture: InputCapture } | undefined;
  /** Le survol a mis la main : à retirer à la fin de la capture. */
  private pointer = false;

  constructor(private readonly core: EngineCore) {}

  /** Des entrées sont-elles capturées ? */
  get active(): boolean {
    return this.captured !== undefined;
  }

  /** Capture les entrées pour le détenteur du verrou `lock` (appelé par `EditLock.captureInput`). */
  begin(lock: EditLock, capture: InputCapture): void {
    this.captured = { lock, capture };
  }

  /** Fin de la capture (verrou rendu) : le curseur posé par le survol est retiré. */
  end(): void {
    this.captured = undefined;
    if (!this.pointer) return;
    this.pointer = false;
    if (this.core.canvas.style.cursor === 'pointer') this.core.canvas.style.cursor = '';
  }

  /**
   * Clic pendant la capture : rendu au détenteur, rien n'est sélectionné ; `repeated` : second clic d'un double-clic,
   * ignoré (il ne compte pas comme un autre choix). Vrai si les entrées sont capturées.
   */
  click(screen: Point, repeated = false): boolean {
    const captured = this.captured;
    if (!captured) return false;
    const elementId = repeated ? undefined : this.targetAt(screen);
    const { click } = captured.capture;
    if (elementId !== undefined && click) this.guard('clic', undefined, () => click(elementId));
    return true;
  }

  /**
   * Survol pendant la capture : main sur un élément qui réagit au clic ; le reste du survol (commentaires, parties)
   * suit son cours. Rend vrai si la main est posée.
   */
  hover(screen: Point | undefined): boolean {
    const captured = this.captured;
    if (!captured) return false;
    const elementId = screen && this.targetAt(screen);
    const { clickable } = captured.capture;
    const over =
      elementId !== undefined && clickable !== undefined && this.guard('survol', false, () => clickable(elementId));
    this.pointer = over;
    return over;
  }

  /** Touche pendant la capture (sans ⌘, Ctrl ni Alt) : vrai si le détenteur la prend. */
  key(key: string): boolean {
    const handler = this.captured?.capture.key;
    return handler !== undefined && this.guard('touche', false, () => handler(key));
  }

  /** Élément sous le point écran : celui que vise la couche du détenteur, sinon celui de la page. */
  private targetAt(screen: Point): string | undefined {
    return this.core.overlays.hit(screen) ?? this.core.picking.pickAt(screen)?.element.id;
  }

  private guard<T>(hook: string, fallback: T, run: () => T): T {
    const pageId = this.captured?.lock.pageId ?? '';
    return this.core.pageModes.guardPage(pageId, `entrées capturées, ${hook}`, fallback, run);
  }
}
