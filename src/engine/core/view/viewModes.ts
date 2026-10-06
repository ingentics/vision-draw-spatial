import type { IsoViewParams } from '../../format/viewState';
import { withViewMode } from '../../interaction/camera';
import type { ViewMode } from '../../interaction/camera';
import { mergeSettings } from '../../settings';
import type { EngineCore } from '../EngineCore';

/** Modes de vue (SPEC §9.1) : dessus, iso, 3D, volumes aplatis, réglages iso propres à chaque page. */
export class ViewModes {
  /** Dernier mode hors 3D, où revient la touche P. */
  private lastFlatMode: 'top' | 'iso' = 'top';
  /** Volumes aplatis à la demande (touche V, iso et 3D) : état passager, non enregistré. */
  flattened = false;

  constructor(private readonly core: EngineCore) {}

  getViewMode(): ViewMode {
    return this.core.camera.state.mode;
  }

  setViewMode(mode: ViewMode): void {
    if (this.core.transition) return;
    if (this.core.camera.state.mode !== '3d') this.lastFlatMode = this.core.camera.state.mode;
    // Entre la 2D (à plat) et l'iso / la 3D (volumes) : fondu enchaîné des deux rendus.
    const crossesFlat = (this.core.camera.state.mode === 'top') !== (mode === 'top');
    this.core.camera.animateCameraTo(
      withViewMode(this.core.camera.state, mode, this.core.camera.isoTilt(), this.core.camera.isoAzimuth()),
      this.core.settings.view.switchDurationMs,
      crossesFlat,
    );
  }

  toggleViewMode(): void {
    this.setViewMode(this.core.camera.state.mode === 'iso' ? 'top' : 'iso');
  }

  /** Touche P : vers la 3D, ou retour au dernier mode 2D / iso. */
  toggle3d(): void {
    this.setViewMode(this.core.camera.state.mode === '3d' ? this.lastFlatMode : '3d');
  }

  isFlattened(): boolean {
    return this.flattened;
  }

  setFlattened(flattened: boolean): void {
    if (flattened === this.flattened || this.core.transition) return;
    if (flattened && this.core.camera.state.mode === 'top') return;
    this.core.levels.endLevelBlend();
    const previousLevel = this.core.levels.requestedLevel();
    this.flattened = flattened;
    const page = this.core.pages.getCurrentPage();
    if (page && this.core.levels.requestedLevel() !== previousLevel) {
      this.core.scenes.show(page);
      this.core.levels.applyHeightScale();
      this.core.highlight.update();
      if (this.core.linkZonesShown) this.core.updateLinkZones();
      this.core.minimap.invalidate();
      this.core.rendering.requestRender();
    }
    this.core.events.emit('flattenChange', flattened);
  }

  toggleFlatten(): void {
    if (this.core.camera.state.mode === 'top') return;
    this.setFlattened(!this.flattened);
  }

  /** Réglages iso en vigueur (enregistrés par page). */
  isoParams(): IsoViewParams {
    const { isoAngleDeg, isoAzimuthDeg, isoVolume, isoDepth } = this.core.settings.view;
    return { isoAngleDeg, isoAzimuthDeg, isoVolume, isoDepth };
  }

  /**
   * Reprend les réglages iso enregistrés pour une page (fichier ou dernière visite), sans animer :
   * la caméra de la page est appliquée juste après. L'UI les reçoit par `settingsChange`.
   */
  applyPageIso(pageId: string): void {
    const iso = this.core.pages.pageIso.get(pageId);
    const view = this.core.settings.view;
    if (
      !iso ||
      (view.isoAngleDeg === iso.isoAngleDeg &&
        view.isoAzimuthDeg === iso.isoAzimuthDeg &&
        view.isoVolume === iso.isoVolume &&
        view.isoDepth === iso.isoDepth)
    ) {
      return;
    }
    this.core.config.settings = mergeSettings(this.core.settings, { view: iso });
    if (view.isoVolume !== this.core.settings.view.isoVolume || view.isoDepth !== this.core.settings.view.isoDepth) {
      this.core.scenes.clear();
    }
    this.core.events.emit('settingsChange', this.core.config.getSettings());
  }
}
