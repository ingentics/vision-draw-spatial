import {
  defaultView,
  fitBounds,
  interpolateCamera,
  normalizeAngle,
  nextOverviewStep,
  normalizeCameraState,
  rotateAround,
  sameView,
  settleProjection,
  tiltFromElevation,
  zoomAt,
} from '../../interaction/camera';
import type { CameraLimits, CameraState, OverviewStep, ViewMode } from '../../interaction/camera';
import { unionOf } from '../../model/geometry';
import type { Point, Rect } from '../../model/types';
import type { Settings } from '../../settings';
import type { EngineCore } from '../EngineCore';

/** Caméra de la page affichée (SPEC §9) : état, animations, cadrages, vue globale, orientation de référence. */
export class ViewCamera {
  state: CameraState = { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0, tilt: 0 };
  animation = 0;
  /** Dernière étape jouée par la touche Entrée avec une sélection, et la vue visée. */
  private overviewStep: { step: OverviewStep; view: CameraState } | undefined;
  private limitsCache: { camera: Settings['camera']; limits: CameraLimits } | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Bornes de la caméra de ce moteur (paramètres « Caméra »). */
  get limits(): CameraLimits {
    const camera = this.core.settings.camera;
    if (this.limitsCache?.camera !== camera) {
      this.limitsCache = {
        camera,
        limits: {
          minZoom: camera.minZoom,
          maxZoom: camera.maxZoom,
          minZoom3d: camera.minZoom3d,
          maxZoom3d: camera.maxZoom3d,
          maxTilt3d: (camera.maxTilt3dDeg * Math.PI) / 180,
          fov: (camera.fovDeg * Math.PI) / 180,
        },
      };
    }
    return this.limitsCache.limits;
  }

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
        limits: this.limits,
      }),
    );
  }

  getCameraState(): CameraState {
    return structuredClone(this.state);
  }

  /** Cadre les bornes, dans l'orientation courante ou celle donnée (ex. arrivée sur une page). */
  fitToBounds(bounds: Rect, orientation = this.orientation()): void {
    if (!this.core.display.isMeasured()) {
      this.core.display.pendingFit = bounds;
      return;
    }
    this.setCameraState(fitBounds(bounds, this.core.display.viewport, { ...orientation, limits: this.limits }));
  }

  setCameraState(state: CameraState): void {
    cancelAnimationFrame(this.animation);
    this.animation = 0;
    this.core.levels.endLevelBlend();
    this.applyCamera(settleProjection(normalizeCameraState(state, this.limits), this.limits));
  }

  /** `onDone` : appelé une fois la vue arrivée (jamais si l'animation est interrompue par une autre). */
  animateCameraTo(
    target: CameraState,
    durationMs = this.core.settings.camera.animationMs,
    blendLevels = false,
    onDone?: () => void,
  ): void {
    this.core.levels.endLevelBlend();
    if (this.core.config.reducedMotion() || durationMs <= 0) {
      this.setCameraState(target);
      onDone?.();
      return;
    }
    cancelAnimationFrame(this.animation);
    if (blendLevels && this.core.settings.view.isoVolume && !this.core.viewModes.flattened)
      this.core.levels.levelBlend = {};
    const from = this.state;
    const to = normalizeCameraState(target, this.limits);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Ease-in-out cubique.
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.applyCamera(interpolateCamera(from, to, eased));
      this.animation = t < 1 ? requestAnimationFrame(step) : 0;
      if (t < 1) return;
      this.core.levels.endLevelBlend();
      onDone?.();
    };
    this.animation = requestAnimationFrame(step);
  }

  getOverviewState(): CameraState | undefined {
    const page = this.core.pages.getCurrentPage();
    if (!page) return undefined;
    return fitBounds(page.bounds, this.core.display.viewport, {
      ...this.orientation(),
      maxZoom: this.core.settings.camera.maxZoom,
      limits: this.limits,
    });
  }

  /** Cadrage de la sélection de la page affichée (boîte englobante, comme « aller à l'élément »). */
  private getSelectionState(): CameraState | undefined {
    const selection = this.core.selection.current;
    if (!selection || selection.pageId !== this.core.pages.currentPageId) return undefined;
    const bounds = unionOf(
      selection.items.flatMap((item) => {
        const rect = item.type === 'shape' ? item.element.bounds : this.core.sceneView.drawnBounds(item.element.id);
        return rect ? [rect] : [];
      }),
    );
    if (!bounds) return undefined;
    return fitBounds(bounds, this.core.display.viewport, {
      ...this.orientation(),
      padding: this.core.settings.camera.focusPadding,
      maxZoom: this.core.settings.camera.focusMaxZoom,
      limits: this.limits,
    });
  }

  /** Touche Entrée : globale ↔ 1:1 sans sélection ; avec sélection, cycle sélection → 1:1 → globale (ticket 242). */
  toggleOverview(screen?: Point): void {
    const overview = this.getOverviewState();
    if (!overview) return;
    const viewport = this.core.display.viewport;
    const selection = this.getSelectionState();
    // Appuis rapprochés : pendant l'animation, la vue est déjà celle de l'étape jouée.
    const current = this.animation && this.overviewStep ? this.overviewStep.view : this.state;
    const anchor = screen ?? { x: viewport.width / 2, y: viewport.height / 2 };
    const actual = zoomAt(current, viewport, anchor, 1 / current.zoom, this.limits);
    if (!selection) {
      this.overviewStep = undefined;
      this.animateCameraTo(sameView(current, overview, viewport) ? actual : overview);
      return;
    }
    const next = nextOverviewStep(current, { selection, actual, global: overview }, this.overviewStep, viewport);
    this.overviewStep = { step: next.step, view: normalizeCameraState(next.view, this.limits) };
    this.animateCameraTo(next.view);
  }

  applyCamera(state: CameraState): void {
    this.core.display.pendingFit = undefined;
    const previousZoom = this.state.zoom;
    const previousLevel = this.core.levels.requestedLevel();
    // Pendant une transition, la page courante est l'extérieure : la destination est déjà ramenée à ses modes permis.
    this.state = normalizeCameraState(
      this.core.canInteract() ? this.core.viewModes.constrain(state) : state,
      this.limits,
    );
    // Changement de niveau (mode, ou fin d'une bascule vers la 2D) : la page passe au rendu de ce
    // niveau (même scène si tout est à plat).
    let sceneChanged = false;
    if (this.core.levels.requestedLevel() !== previousLevel && this.core.canInteract()) {
      const page = this.core.pages.getCurrentPage();
      if (page) {
        this.core.scenes.show(page);
        this.core.minimap.invalidate();
        sceneChanged = true;
      }
    }
    if (this.core.pages.currentPageId) {
      this.core.pages.pageCameras.set(this.core.pages.currentPageId, this.state);
      if (this.core.canInteract())
        this.core.pages.pageIso.set(this.core.pages.currentPageId, this.core.viewModes.isoParams());
    }
    this.core.minimap.requestDraw();
    // Contour de sélection d'épaisseur constante à l'écran ; la sélection est transférée à la scène
    // du nouveau niveau quand on change de vue (2D ↔ iso / 3D).
    if (this.core.selection.current && (sceneChanged || this.state.zoom !== previousZoom)) this.core.highlight.update();
    if (this.core.links.linkZonesShown && (sceneChanged || this.state.zoom !== previousZoom))
      this.core.links.updateLinkZones();
    this.core.rendering.applyProjection();
    this.core.levels.applyHeightScale();
    this.core.labelEditor.relocateLabelEdit();
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
    if (!page || !this.core.canInteract()) return;
    const { mode } = this.state;
    this.animateCameraTo(
      defaultView(page.bounds, this.core.display.viewport, mode, this.isoTilt(), this.isoAzimuth(), this.limits),
    );
  }

  resetRotation(): void {
    const center = { x: this.core.display.viewport.width / 2, y: this.core.display.viewport.height / 2 };
    const delta = normalizeAngle(this.getReferenceRotation() - this.state.rotation);
    this.animateCameraTo(rotateAround(this.state, this.core.display.viewport, center, delta));
  }
}
