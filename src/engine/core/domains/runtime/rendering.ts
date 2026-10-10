import { Color, OrthographicCamera, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { Object3D } from 'three';
import { gridSizeOf } from '../../format/cellEdits';
import { applyCameraState, applyPerspectiveState } from '../../interaction/cameraProjection';
import type { Grid, GridOptions } from '../../render/grid';
import { orientBillboards } from '../../render/billboard';
import type { PageScene } from '../../render/pageScene';
import type { EngineCore } from '../EngineCore';
import { createGrid } from '../../render/grid';

/** Rendu WebGL : scène Three.js, caméras, fond et grille, image à la demande (fondu enchaîné 2D ↔ volume compris). */
export class Rendering {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  /**
   * Couche dessinée par-dessus tout, profondeur remise à zéro (couche d'un mode, sujets 461, 467) : rien de la page ne
   * la recouvre, quel que soit l'ordre de dessin de ses objets. Posée par `PageOverlays`.
   */
  private readonly overlay = new Scene();
  private readonly camera = new OrthographicCamera();
  /** Caméra de la vue 3D (et des bascules vers / depuis la 3D). */
  private readonly perspectiveCamera = new PerspectiveCamera();
  /** Fond de la vue et grille (SPEC §9.5). */
  private readonly grid: Grid;
  private frame = 0;

  constructor(private readonly core: EngineCore) {
    // Stencil : trous du voile de sélection autour des flèches (render/veil).
    this.renderer = new WebGLRenderer({ canvas: core.canvas, antialias: true, stencil: true });
    // Compteurs remis à zéro à chaque image, pas à chaque passe : le fondu enchaîné en fait deux (draw calls des
    // Diagnostics, sujet 298).
    this.renderer.info.autoReset = false;
    this.scene.background = new Color(core.settings.background.color);
    this.grid = createGrid(this.gridOptions());
    this.scene.add(this.grid.mesh);
  }

  /** Fin du moteur : plus d'image demandée, ressources WebGL libérées. */
  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.grid.dispose();
    // Pas de forceContextLoss : le même canvas peut être repris par un nouveau moteur
    // (double montage de React en dev). Le contexte est libéré avec le canvas.
    this.renderer.dispose();
  }

  /**
   * Grille de la page courante : pas de la page draw.io (`gridSize`) si demandé et défini, sinon celui des paramètres.
   */
  private gridOptions(): GridOptions {
    const background = this.core.settings.background;
    const tree =
      background.gridFromPage && this.core.pages.currentPageId
        ? this.core.file.pageTreeOf(this.core.pages.currentPageId)
        : undefined;
    const pageCell = tree && tree.encoding !== 'unreadable' ? gridSizeOf(tree) : 0;
    return {
      visible: background.grid,
      background: background.color,
      color: background.gridColor,
      cell: pageCell > 0 ? pageCell : background.gridSize,
      majorEvery: background.majorEvery,
      minorStrength: background.minorStrength,
    };
  }

  /** Paramètres changés : couleur de fond et grille. */
  settingsChanged(): void {
    this.syncBackground();
  }

  syncBackground(): void {
    (this.scene.background as Color).set(this.core.settings.background.color);
    this.grid.setOptions(this.gridOptions());
    this.requestRender();
  }

  /**
   * Fondu enchaîné 2D ↔ volume en deux passes : la page à plat (avec le fond), puis les volumes
   * par-dessus, profondeur remise à zéro. Les blocs s'occultent entre eux, mais des blocs presque
   * aplatis ne masquent pas les traits et labels de la page à plat.
   */
  private renderBlend(flat: PageScene, volume: PageScene): void {
    const camera = this.activeCamera();
    const background = this.scene.background;
    const gridVisible = this.grid.mesh.visible;
    volume.root.visible = false;
    flat.root.visible = true;
    this.renderer.render(this.scene, camera);
    flat.root.visible = false;
    volume.root.visible = true;
    this.grid.mesh.visible = false;
    this.scene.background = null;
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.scene, camera);
    this.renderer.autoClear = true;
    this.scene.background = background;
    this.grid.mesh.visible = gridVisible;
    flat.root.visible = true;
  }

  /** Objets dessinés par-dessus tout (un seul porteur à la fois) ; undefined les retire. */
  setOverlay(object: Object3D | undefined): void {
    this.overlay.clear();
    if (object) this.overlay.add(object);
    this.requestRender();
  }

  /** Couche par-dessus l'image déjà rendue : couleurs gardées, profondeur effacée. */
  private renderOverlay(): void {
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.overlay, this.activeCamera());
    this.renderer.autoClear = true;
  }

  /** Caméra du rendu : en perspective quand l'état a un champ de vision (3D, bascules). */
  private activeCamera(): OrthographicCamera | PerspectiveCamera {
    return this.core.camera.state.fov === undefined ? this.camera : this.perspectiveCamera;
  }

  applyProjection(): void {
    if (this.core.camera.state.fov === undefined)
      applyCameraState(this.camera, this.core.camera.state, this.core.display.viewport);
    else
      applyPerspectiveState(
        this.perspectiveCamera,
        this.core.camera.state,
        this.core.display.viewport,
        this.core.camera.limits,
      );
    // Le plan du fond couvre tout ce que la caméra peut voir.
    this.grid.follow(this.core.camera.state.center, 2 * this.activeCamera().far);
  }

  /** Rendu à la demande : une image par frame au plus, seulement quand quelque chose a changé. */
  readonly requestRender = (): void => {
    if (this.frame || this.core.disposed) return;
    this.frame = requestAnimationFrame((now) => {
      this.frame = 0;
      const metrics = this.core.metrics;
      const start = metrics.sampling ? performance.now() : 0;
      this.renderer.info.reset();
      // Silhouettes debout (Actor) face à la caméra de cette image.
      orientBillboards(this.scene, this.activeCamera());
      // Estompage de ce qui est hors du courant du mode de la page (ex. hors du flux courant).
      this.core.modeCurrents.applyModeFocus();
      // Couche d'un mode reposée sur une scène reconstruite, et son image animée.
      this.core.overlays.sync(now);
      const blend = this.core.levels.levelBlend;
      if (blend?.flat && blend.volume) this.renderBlend(blend.flat, blend.volume);
      else this.renderer.render(this.scene, this.activeCamera());
      if (this.overlay.children.length > 0) this.renderOverlay();
      if (metrics.sampling) metrics.frameRendered(start, performance.now());
    });
  };
}
