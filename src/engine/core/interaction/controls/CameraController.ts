import { ControlContext } from './context';
import { Drift } from './drift';
import type { CameraHost } from './host';
import { KeyboardControls } from './keyboard';
import { PointerControls } from './pointer';
import { DEFAULT_CONTROLS } from './settings';
import type { ControlSettings } from './settings';

/** Contrôles de navigation du canvas (SPEC §9.2) : souris, clavier et glissade de la vue, branchés sur un hôte. */
export class CameraController {
  private readonly ctx: ControlContext;
  private readonly drift: Drift;
  private readonly pointer: PointerControls;
  private readonly keyboard: KeyboardControls;

  constructor(element: HTMLElement, host: CameraHost, settings: Partial<ControlSettings> = {}) {
    this.ctx = new ControlContext(element, host, { ...DEFAULT_CONTROLS, ...settings });
    // Rend le canvas focalisable, pour sortir le focus d'un champ (ex. liste de fichiers) au clic.
    if (element.tabIndex < 0) element.tabIndex = 0;
    element.style.touchAction = 'none';
    element.style.outline = 'none';

    this.drift = new Drift(this.ctx);
    this.pointer = new PointerControls(this.ctx, this.drift);
    this.keyboard = new KeyboardControls(this.ctx, this.drift);
    this.pointer.attach();
    this.keyboard.attach();
  }

  getSettings(): ControlSettings {
    return { ...this.ctx.settings };
  }

  setSettings(patch: Partial<ControlSettings>): void {
    const settings = this.ctx.settings;
    const keyChanged = (name: 'followLinkKey' | 'multiSelectKey') =>
      patch[name] !== undefined && patch[name] !== settings[name];
    if (keyChanged('followLinkKey') || keyChanged('multiSelectKey'))
      this.keyboard.setHeld({ followLink: false, multiSelect: false });
    this.ctx.settings = { ...settings, ...patch, shortcuts: { ...settings.shortcuts, ...patch.shortcuts } };
  }

  /** Ignore les entrées (ex. pendant une transition, SPEC §11.2). */
  setEnabled(enabled: boolean): void {
    this.ctx.enabled = enabled;
    if (!enabled) this.keyboard.release();
  }

  dispose(): void {
    this.drift.dispose();
    this.pointer.detach();
    this.keyboard.detach();
  }
}
