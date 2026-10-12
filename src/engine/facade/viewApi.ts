import type { CameraState, ViewMode } from '../core/interaction/cameraState';
import type { Point } from '../core/model/types';
import type { ImageExportOptions } from '../core/domains/view/imageExport';
import type { EngineCore } from '../core/domains/EngineCore';

/** Caméra et vues (SPEC §9) : état, cadrages, vue de dessus / iso / 3D, volumes aplatis, mini-carte, image. */
export class ViewApi {
  constructor(private readonly core: EngineCore) {}

  state(): CameraState {
    return this.core.camera.getCameraState();
  }

  setState(state: CameraState): void {
    this.core.camera.setCameraState(state);
  }

  /**
   * Anime la caméra vers un état (instantané si les animations sont réduites). Toute autre entrée
   * l'interrompt. `blendLevels` : bascule 2D ↔ volume, en fondu enchaîné des deux rendus.
   */
  animateTo(target: CameraState, durationMs?: number, blendLevels?: boolean): void {
    this.core.camera.animateCameraTo(target, durationMs, blendLevels);
  }

  /**
   * Va à la page d'un élément et cadre dessus (diagnostics, liens). Les formes sont cadrées
   * sur leurs bornes, les arêtes sur leur tracé dessiné.
   */
  focus(pageId: string, elementId: string): void {
    this.core.camera.focusElement(pageId, elementId);
  }

  /** Vue par défaut du mode courant (orientation de référence, page entière), en animation. */
  reset(): void {
    this.core.camera.resetView();
  }

  /** Revient à l'orientation de référence du mode (nord en haut, ou l'orientation iso), autour du centre de l'écran. */
  resetRotation(): void {
    this.core.camera.resetRotation();
  }

  /**
   * Bascule vue globale ↔ 1:1 (touche Entrée). Depuis la vue globale, passe à 100 % autour
   * du point écran donné (ou du centre) ; depuis toute autre vue, revient à la vue globale.
   */
  toggleOverview(screen?: Point): void {
    this.core.camera.toggleOverview(screen);
  }

  mode(): ViewMode {
    return this.core.viewModes.getViewMode();
  }

  /** Bascule animée vers la vue de dessus, isométrique ou 3D ; le centre de l'écran ne bouge pas. */
  setMode(mode: ViewMode): void {
    this.core.viewModes.setViewMode(mode);
  }

  toggleMode(): void {
    this.core.viewModes.toggleViewMode();
  }

  /** Touche P : vers la 3D, ou retour au dernier mode 2D / iso. */
  toggle3d(): void {
    this.core.viewModes.toggle3d();
  }

  /**
   * Aplatit ou rétablit les volumes : rendu à plat, comme une épaisseur nulle, sans toucher à la
   * caméra ni aux réglages. Rien en 2D, où tout est déjà à plat (l'état y est seulement levé).
   */
  setFlattened(flattened: boolean): void {
    this.core.viewModes.setFlattened(flattened);
  }

  /** Touche V : sans effet en 2D. */
  toggleFlatten(): void {
    this.core.viewModes.toggleFlatten();
  }

  /**
   * Affiche la mini-carte dans un canvas fourni par l'UI (SPEC §10). Renvoie de quoi la détacher.
   * `size` : largeur en pixels CSS (la hauteur suit les proportions de la page).
   */
  attachMinimap(canvas: HTMLCanvasElement, size?: number): () => void {
    return this.core.minimap.attachMinimap(canvas, size);
  }

  /**
   * Image PNG de la page courante (ou de sa sélection) en vue de dessus, quelle que soit la vue affichée (sujet 431) ;
   * `undefined` s'il n'y a rien à exporter.
   */
  exportImage(options: ImageExportOptions): Promise<Blob | undefined> {
    return this.core.imageExport.exportPng(options);
  }
}
