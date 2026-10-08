import type { HeldKeys } from '../../interaction/controls';
import type { ModeHint } from '../types';
import type { EngineCore } from '../EngineCore';

/** Touches de modification maintenues (suivre un lien, sélection multiple) et mode d'interaction signalé à l'UI. */
export class ModifierKeys {
  private heldKeys: HeldKeys = { followLink: false, multiSelect: false };
  private modeHint: ModeHint | undefined;

  constructor(private readonly core: EngineCore) {}

  /**
   * Touches de modification maintenues : zones liées en évidence (touche pour suivre un lien), et
   * mode d'interaction signalé à l'UI (`modeHint`).
   */
  setHeldKeys(held: HeldKeys): void {
    this.heldKeys = held;
    this.refresh();
  }

  /** Page courante changée : la touche maintenue vaut ou non mode navigation sur la nouvelle page. */
  refresh(): void {
    this.core.links.setLinkZonesShown(this.followsLinks());
    this.emitModeHint();
  }

  /**
   * Touche pour suivre un lien maintenue, hors de la vue graphe (sujet 364) : ses nœuds s'ouvrent au double-clic, pas
   * de mode navigation. La touche reste connue : maintenue pendant une plongée, le mode s'active à l'arrivée.
   */
  private followsLinks(): boolean {
    return this.heldKeys.followLink && !this.core.graph.isGraphView();
  }

  getModeHint(): ModeHint | undefined {
    if (this.followsLinks()) return 'navigation';
    if (this.heldKeys.multiSelect && this.core.selection.current) return 'multiSelect';
    return undefined;
  }

  emitModeHint(): void {
    const hint = this.getModeHint();
    if (hint === this.modeHint) return;
    this.modeHint = hint;
    this.core.events.emit('modeHint', hint);
  }
}
