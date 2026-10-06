import {
  defaultView,
  fitBounds,
  interpolateCamera,
  normalizeAngle,
  normalizeCameraState,
  rotateAround,
  sameView,
  settleProjection,
  tiltFromElevation,
  zoomAt,
} from '../../interaction/camera';
import type { CameraState, ViewMode } from '../../interaction/camera';
import type { Point, Rect } from '../../model/types';
import type { EngineCore } from '../EngineCore';

/** Caméra de la page affichée (SPEC §9) : état, animations, cadrages, vue globale, orientation de référence. */
export class ViewCamera {
  state: CameraState = { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0, tilt: 0 };
  animation = 0;

  constructor(private readonly core: EngineCore) {}

  focusElement(pageId: string, elementId: string): void {
    if (this.core.pages.currentPageId !== pageId) this.core.pages.goToPage(pageId);
    const page = this.core.pages.getCurrentPage();
    if (!page) return;
    const bounds =
      page.shapes.find((s) => s.id === elementId)?.bounds ?? this.core.sceneView.drawnBounds(elementId) ?? page.bounds;
    this.animateCameraTo(
      fitBounds(bounds, this.core.display.viewport, {
        ...this.orientation(),
        padding: this.core.settings.camera.focusPadding,
        maxZoom: this.core.settings.camera.focusMaxZoom,
      }),
    );
  }

  getCameraState(): CameraState {
    return structuredClone(this.state);
  }

  fitToBounds(bounds: Rect): void {
    if (!this.core.display.isMeasured()) {
      this.core.display.pendingFit = bounds;
      return;
    }
    this.setCameraState(fitBounds(bounds, this.core.display.viewport, this.orientation()));
  }

  setCameraState(state: CameraState): void {
    cancelAnimationFrame(this.animation);
    this.animation = 0;
    this.core.levels.endLevelBlend();
    this.applyCamera(settleProjection(normalizeCameraState(state)));
  }

  animateCameraTo(target: CameraState, durationMs = this.core.settings.camera.animationMs, blendLevels = false): void {
    this.core.levels.endLevelBlend();
    if (this.core.config.reducedMotion() || durationMs <= 0) {
      this.setCameraState(target);
      return;
    }
    cancelAnimationFrame(this.animation);
    if (blendLevels && this.core.settings.view.isoVolume && !this.core.viewModes.flattened)
      this.core.levels.levelBlend = {};
    const from = this.state;
    const to = normalizeCameraState(target);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Ease-in-out cubique.
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.applyCamera(interpolateCamera(from, to, eased));
      this.animation = t < 1 ? requestAnimationFrame(step) : 0;
      if (t >= 1) this.core.levels.endLevelBlend();
    };
    this.animation = requestAnimationFrame(step);
  }

  getOverviewState(): CameraState | undefined {
    const page = this.core.pages.getCurrentPage();
    if (!page) return undefined;
    return fitBounds(page.bounds, this.core.display.viewport, {
      ...this.orientation(),
      maxZoom: this.core.settings.camera.maxZoom,
    });
  }

  toggleOverview(screen?: Point): void {
    const overview = this.getOverviewState();
    if (!overview) return;
    const current = this.state;
    if (sameView(current, overview, this.core.display.viewport)) {
      const anchor = screen ?? { x: this.core.display.viewport.width / 2, y: this.core.display.viewport.height / 2 };
      this.animateCameraTo(zoomAt(current, this.core.display.viewport, anchor, 1 / current.zoom));
    } else {
      this.animateCameraTo(overview);
    }
  }

  applyCamera(state: CameraState): void {
    this.core.display.pendingFit = undefined;
    const previousZoom = this.state.zoom;
    const previousLevel = this.core.levels.requestedLevel();
    this.state = normalizeCameraState(state);
    // Changement de niveau (mode, ou fin d'une bascule vers la 2D) : la page passe au rendu de ce
    // niveau (même scène si tout est à plat).
    let sceneChanged = false;
    if (this.core.levels.requestedLevel() !== previousLevel && !this.core.transition) {
      const page = this.core.pages.getCurrentPage();
      if (page) {
        this.core.scenes.show(page);
        this.core.minimap.invalidate();
        sceneChanged = true;
      }
    }
    if (this.core.pages.currentPageId) {
      this.core.pages.pageCameras.set(this.core.pages.currentPageId, this.state);
      if (!this.core.transition)
        this.core.pages.pageIso.set(this.core.pages.currentPageId, this.core.viewModes.isoParams());
    }
    this.core.minimap.requestDraw();
    // Contour de sélection d'épaisseur constante à l'écran ; la sélection est transférée à la scène
    // du nouveau niveau quand on change de vue (2D ↔ iso / 3D).
    if (this.core.selection && (sceneChanged || this.state.zoom !== previousZoom)) this.core.updateSelectionOutline();
    if (this.core.linkZonesShown && (sceneChanged || this.state.zoom !== previousZoom)) this.core.updateLinkZones();
    this.core.rendering.applyProjection();
    this.core.levels.applyHeightScale();
    this.core.relocateLabelEdit();
    this.core.events.emit('cameraChange', this.getCameraState());
    this.core.rendering.requestRender();
  }

  isoTilt(): number {
    return tiltFromElevation(this.core.settings.view.isoAngleDeg);
  }

  isoAzimuth(): number {
    return (this.core.settings.view.isoAzimuthDeg * Math.PI) / 180;
  }

  getReferenceRotation(): number {
    return this.state.mode === 'top' ? 0 : normalizeAngle(this.isoAzimuth());
  }

  /** Orientation courante (mode, rotation, inclinaison), conservée par les cadrages. */
  orientation(): { rotation: number; tilt: number; mode: ViewMode } {
    return { rotation: this.state.rotation, tilt: this.state.tilt, mode: this.state.mode };
  }

  resetView(): void {
    const page = this.core.pages.getCurrentPage();
    if (!page || this.core.transition) return;
    const { mode } = this.state;
    this.animateCameraTo(defaultView(page.bounds, this.core.display.viewport, mode, this.isoTilt(), this.isoAzimuth()));
  }

  resetRotation(): void {
    const center = { x: this.core.display.viewport.width / 2, y: this.core.display.viewport.height / 2 };
    const delta = normalizeAngle(this.getReferenceRotation() - this.state.rotation);
    this.animateCameraTo(rotateAround(this.state, this.core.display.viewport, center, delta));
  }
}
