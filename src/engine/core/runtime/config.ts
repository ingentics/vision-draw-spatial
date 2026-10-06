import { setCameraLimits, normalizeAngle, sameView } from '../../interaction/camera';
import type { ControlSettings } from '../../interaction/controls';
import { DEFAULT_SETTINGS, mergeSettings, resolveReducedMotion } from '../../settings';
import type { PreloadSettings, Settings, SettingsPatch, TransitionSettings, ViewSettings } from '../../settings';
import type { EngineCore } from '../EngineCore';
import type { EngineOptions } from '../types';

/** Paramètres du moteur (SPEC §13) : valeurs en vigueur, modifications et ce qu'elles entraînent, préférence « réduire les animations ». */
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
    this.applyCameraLimits();
    this.reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotionQuery?.addEventListener?.('change', this.onReducedMotionChange);
  }

  dispose(): void {
    this.reducedMotionQuery?.removeEventListener?.('change', this.onReducedMotionChange);
  }

  getViewSettings(): ViewSettings {
    return { ...this.settings.view };
  }

  setViewSettings(patch: Partial<ViewSettings>): void {
    this.updateSettings({ view: patch });
  }

  getControls(): ControlSettings {
    return structuredClone(this.settings.controls);
  }

  setControls(patch: Partial<ControlSettings>): void {
    this.updateSettings({ controls: patch });
  }

  getSettings(): Settings {
    return structuredClone(this.settings);
  }

  updateSettings(patch: SettingsPatch): void {
    const previous = this.settings;
    this.settings = mergeSettings(previous, patch);
    this.core.controller.setSettings(this.effectiveControls());
    this.core.scenes.setMaxCached(this.settings.preload.maxCachedPages);
    this.core.edits.undoStack.setLimit(this.settings.edit.undoLimit);
    this.core.highlight.syncAnimation();
    this.core.highlight.update();
    const changed = <K extends keyof Settings>(section: K) =>
      JSON.stringify(this.settings[section]) !== JSON.stringify(previous[section]);
    if (changed('camera')) this.applyCameraLimits();
    if (changed('graph') || this.settings.selection.accentColor !== previous.selection.accentColor)
      this.core.graph.invalidate();
    if (
      this.settings.view.isoVolume !== previous.view.isoVolume ||
      this.settings.view.isoDepth !== previous.view.isoDepth ||
      this.settings.view.shadeLight !== previous.view.shadeLight ||
      this.settings.view.shadeDark !== previous.view.shadeDark ||
      this.settings.view.facadeTags !== previous.view.facadeTags ||
      // Fonds de labels « default » = couleur du fond.
      this.settings.background.color !== previous.background.color ||
      this.settings.selection.accentColor !== previous.selection.accentColor ||
      changed('shapes') ||
      changed('graph') ||
      changed('effects')
    ) {
      this.core.levels.rebuildScenes();
    }
    if (changed('camera') && !this.core.transition && !this.core.camera.animation)
      this.core.camera.setCameraState(this.core.camera.state);
    if (
      this.settings.minimap.edgeColor !== previous.minimap.edgeColor ||
      this.settings.minimap.outlineColor !== previous.minimap.outlineColor
    )
      this.core.minimap.invalidate();
    else if (this.settings.selection.accentColor !== previous.selection.accentColor) this.core.minimap.requestDraw();
    this.core.rendering.syncBackground();

    const view = this.settings.view;
    if (this.core.pages.currentPageId && !this.core.transition)
      this.core.pages.pageIso.set(this.core.pages.currentPageId, this.core.viewModes.isoParams());
    const isoChanged =
      view.isoAngleDeg !== previous.view.isoAngleDeg || view.isoAzimuthDeg !== previous.view.isoAzimuthDeg;
    if (isoChanged && this.core.camera.state.mode === 'iso' && !this.core.transition) {
      // Orientation absolue quand l'azimut change ; sinon la rotation faite à la souris est gardée.
      const azimuthChanged = view.isoAzimuthDeg !== previous.view.isoAzimuthDeg;
      const rotation = azimuthChanged ? normalizeAngle(this.core.camera.isoAzimuth()) : this.core.camera.state.rotation;
      const target = { ...this.core.camera.state, tilt: this.core.camera.isoTilt(), rotation };
      if (!sameView(target, this.core.camera.state, this.core.display.viewport))
        this.core.camera.animateCameraTo(target, view.switchDurationMs);
    }
    this.core.events.emit('settingsChange', this.getSettings());
  }

  /** Bornes de la caméra (zoom, inclinaison et champ de vision de la 3D) : paramètres « Caméra ». */
  private applyCameraLimits(): void {
    const camera = this.settings.camera;
    setCameraLimits({
      minZoom: camera.minZoom,
      maxZoom: camera.maxZoom,
      minZoom3d: camera.minZoom3d,
      maxZoom3d: camera.maxZoom3d,
      maxTilt3d: (camera.maxTilt3dDeg * Math.PI) / 180,
      fov: (camera.fovDeg * Math.PI) / 180,
    });
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

  getTransitionSettings(): TransitionSettings {
    return { ...this.settings.transition };
  }

  setTransitionSettings(patch: Partial<TransitionSettings>): void {
    this.updateSettings({ transition: patch });
  }

  getPreloadSettings(): PreloadSettings {
    return { ...this.settings.preload };
  }

  setPreloadSettings(patch: Partial<PreloadSettings>): void {
    this.updateSettings({ preload: patch });
  }
}
