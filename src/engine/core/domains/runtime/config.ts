import type { IsoViewParams } from '../../format/viewState';
import type { ControlSettings } from '../../interaction/controls';
import { DEFAULT_SETTINGS, mergeSettings, resolveReducedMotion } from '../../settings';
import type { Settings, SettingsPatch } from '../../settings';
import type { EngineCore } from '../EngineCore';
import type { EngineOptions } from '../types';

/**
 * Paramètres du moteur (SPEC §13) : valeurs en vigueur, modifications et ce qu'elles entraînent, préférence « réduire
 * les animations ».
 */
export class Config {
  settings: Settings;
  /** Préférence système « réduire les animations » (suivie en direct). */
  private readonly reducedMotionQuery: MediaQueryList | undefined;

  constructor(
    private readonly core: EngineCore,
    options: Pick<EngineOptions, 'background' | 'settings'>,
  ) {
    const initial = options.background
      ? mergeSettings(DEFAULT_SETTINGS, { background: { color: options.background } })
      : DEFAULT_SETTINGS;
    this.settings = mergeSettings(initial, options.settings);
    this.reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotionQuery?.addEventListener?.('change', this.onReducedMotionChange);
  }

  dispose(): void {
    this.reducedMotionQuery?.removeEventListener?.('change', this.onReducedMotionChange);
  }

  getSettings(): Settings {
    return structuredClone(this.settings);
  }

  updateSettings(patch: SettingsPatch): void {
    const previous = this.settings;
    this.settings = mergeSettings(previous, patch);
    this.core.controller.setSettings(this.effectiveControls());
    this.core.settingsChanged(this.settings, previous);
    this.core.events.emit('settingsChange', this.getSettings());
  }

  /**
   * Réglages iso propres à la page affichée, pris sans animer (la caméra de la page est appliquée ensuite) : seuls les
   * domaines inscrits à `EngineCore.pageSettingsAdopted` en tirent les conséquences, pas tous ceux d'un changement de
   * l'utilisateur (`updateSettings` animerait la caméra et garderait ces réglages pour la page quittée).
   */
  adoptPageIso(iso: IsoViewParams): void {
    const previous = this.settings;
    this.settings = mergeSettings(previous, { view: iso });
    this.core.pageSettingsAdopted(this.settings, previous);
    this.core.events.emit('settingsChange', this.getSettings());
  }

  reducedMotion(): boolean {
    return resolveReducedMotion(this.settings.accessibility.reducedMotion, this.reducedMotionQuery?.matches ?? false);
  }

  /** Contrôles effectifs : pas de glissade quand les animations sont réduites. */
  effectiveControls(): ControlSettings {
    const controls = this.settings.controls;
    return this.reducedMotion() ? { ...controls, decelerationMs: 0 } : controls;
  }

  private readonly onReducedMotionChange = (): void => {
    this.core.controller.setSettings(this.effectiveControls());
    this.core.highlight.syncAnimation();
    this.core.events.emit('settingsChange', this.getSettings());
  };
}
