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
    if (this.core.links.linkZonesShown !== held.followLink) {
      this.core.links.linkZonesShown = held.followLink;
      this.core.links.updateLinkZones();
    }
    this.emitModeHint();
  }

  getModeHint(): ModeHint | undefined {
    if (this.heldKeys.followLink) return 'navigation';
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
