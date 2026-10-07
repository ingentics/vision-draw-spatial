import type { IsoViewParams } from '../../format/viewState';
import { normalizeAngle, sameView, withViewMode } from '../../interaction/camera';
import type { CameraState, ViewMode } from '../../interaction/camera';
import type { Settings } from '../../settings';
import type { EngineCore } from '../EngineCore';

/** Modes de vue (SPEC §9.1) : dessus, iso, 3D, volumes aplatis, réglages iso propres à chaque page. */
export class ViewModes {
  /** Dernier mode hors 3D, où revient la touche P. */
  private lastFlatMode: 'top' | 'iso' = 'top';
  /** Volumes aplatis à la demande (touche V, iso et 3D) : état passager, non enregistré. */
  flattened = false;
  /**
   * Mode choisi par l'utilisateur : celui de la dernière vue d'une page qui permet tous les modes. Une page dont le
   * mode en restreint (sujet 178) n'y touche pas : en la quittant, on retrouve ce mode.
   */
  private chosenMode: ViewMode | undefined;

  constructor(private readonly core: EngineCore) {}

  /**
   * Paramètres changés : réglages iso gardés pour la page affichée ; en iso, la vue suit la nouvelle élévation et la
   * nouvelle orientation (animées).
   */
  settingsChanged(settings: Settings, previous: Settings): void {
    if (!this.core.canInteract()) return;
    this.core.pages.rememberIso();
    const { view } = settings;
    const camera = this.core.camera;
    const isoChanged =
      view.isoAngleDeg !== previous.view.isoAngleDeg || view.isoAzimuthDeg !== previous.view.isoAzimuthDeg;
    if (!isoChanged || camera.state.mode !== 'iso') return;
    // Orientation absolue quand l'azimut change ; sinon la rotation faite à la souris est gardée.
    const azimuthChanged = view.isoAzimuthDeg !== previous.view.isoAzimuthDeg;
    const rotation = azimuthChanged ? normalizeAngle(camera.isoAzimuth()) : camera.state.rotation;
    const target = { ...camera.state, tilt: camera.isoTilt(), rotation };
    if (!sameView(target, camera.state, this.core.display.viewport))
      camera.animateCameraTo(target, view.switchDurationMs);
  }

  getViewMode(): ViewMode {
    return this.core.camera.state.mode;
  }

  /** Le mode de la page affichée permet-il ce mode d'affichage ? */
  allows(mode: ViewMode, pageId = this.core.pages.currentPageId): boolean {
    const page = pageId === undefined ? undefined : this.core.pages.pageById(pageId);
    return !page || this.core.modes.allowsViewMode(page, mode);
  }

  /**
   * Vue d'une page dans un mode d'affichage qu'elle permet (sujet 178) : même vue sinon, passée au premier mode
   * permis. Retient le mode choisi quand la page permet tous les modes.
   */
  constrain(state: CameraState, pageId = this.core.pages.currentPageId): CameraState {
    const page = pageId === undefined ? undefined : this.core.pages.pageById(pageId);
    if (!page) return state;
    const mode = this.core.modes.viewModeFor(page, state.mode);
    if (mode === state.mode) {
      if (!this.core.modes.modeOf(page)?.viewModes) this.chosenMode = mode;
      return state;
    }
    return withViewMode(
      state,
      mode,
      this.core.camera.isoTilt(),
      this.core.camera.isoAzimuth(),
      this.core.camera.limits,
    );
  }

  /**
   * Orientation d'arrivée sur une page sans vue mémorisée : celle de la vue courante, dans le mode choisi par
   * l'utilisateur (on sort peut-être d'une page qui l'avait restreint).
   */
  arrivalOrientation(): { rotation: number; tilt: number; mode: ViewMode } {
    const { mode, rotation, tilt } = withViewMode(
      this.core.camera.state,
      this.chosenMode ?? this.core.camera.state.mode,
      this.core.camera.isoTilt(),
      this.core.camera.isoAzimuth(),
      this.core.camera.limits,
    );
    return { mode, rotation, tilt };
  }

  /** Passe la vue au premier mode permis si celui en vigueur ne l'est plus (ex. page passée dans un mode). */
  enforce(): void {
    if (this.allows(this.core.camera.state.mode)) return;
    const page = this.core.pages.getCurrentPage();
    if (page) this.animateTo(this.core.modes.viewModeFor(page, this.core.camera.state.mode));
  }

  /** Mode d'affichage demandé par l'utilisateur (boutons, touches) : sans effet s'il n'est pas permis sur la page. */
  setViewMode(mode: ViewMode): void {
    if (!this.core.canInteract() || !this.allows(mode)) return;
    this.animateTo(mode);
  }

  private animateTo(mode: ViewMode): void {
    if (this.core.camera.state.mode !== '3d') this.lastFlatMode = this.core.camera.state.mode;
    // Entre la 2D (à plat) et l'iso / la 3D (volumes) : fondu enchaîné des deux rendus.
    const crossesFlat = (this.core.camera.state.mode === 'top') !== (mode === 'top');
    this.core.camera.animateCameraTo(
      withViewMode(
        this.core.camera.state,
        mode,
        this.core.camera.isoTilt(),
        this.core.camera.isoAzimuth(),
        this.core.camera.limits,
      ),
      this.core.settings.view.switchDurationMs,
      crossesFlat,
    );
  }

  toggleViewMode(): void {
    this.setViewMode(this.core.camera.state.mode === 'iso' ? 'top' : 'iso');
  }

  toggle3d(): void {
    const back = this.allows(this.lastFlatMode) ? this.lastFlatMode : this.lastFlatMode === 'top' ? 'iso' : 'top';
    this.setViewMode(this.core.camera.state.mode === '3d' ? back : '3d');
  }

  isFlattened(): boolean {
    return this.flattened;
  }

  setFlattened(flattened: boolean): void {
    if (flattened === this.flattened || !this.core.canInteract()) return;
    if (flattened && this.core.camera.state.mode === 'top') return;
    this.core.levels.endLevelBlend();
    const previousLevel = this.core.levels.requestedLevel();
    this.flattened = flattened;
    const page = this.core.pages.getCurrentPage();
    if (page && this.core.levels.requestedLevel() !== previousLevel) {
      this.core.scenes.show(page);
      this.core.levels.applyHeightScale();
      this.core.highlight.update();
      if (this.core.links.linkZonesShown) this.core.links.updateLinkZones();
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
    this.core.config.adoptPageIso(iso);
    if (view.isoVolume !== this.core.settings.view.isoVolume || view.isoDepth !== this.core.settings.view.isoDepth) {
      this.core.scenes.clear();
    }
    this.core.events.emit('settingsChange', this.core.config.getSettings());
  }
}
