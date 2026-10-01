import { Color, OrthographicCamera, Scene, WebGLRenderer } from 'three';
import { Emitter } from './events';
import { parseDrawio } from './format/parse';
import { applyCameraState, fitBounds, normalizeCameraState, rotateAround } from './interaction/camera';
import type { CameraState, Viewport } from './interaction/camera';
import { CameraController } from './interaction/controls';
import type { ControlSettings } from './interaction/controls';
import type { DocumentModel, PageModel, Rect } from './model/types';
import { buildPageScene } from './render/pageScene';
import type { PageScene } from './render/pageScene';
import { createDefaultRegistry } from './render/registry';
import type { RendererRegistry } from './render/registry';
import { createTroikaTextFactory } from './render/troikaText';
import type { FontSet } from './render/troikaText';

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  fonts?: FontSet;
  /** Pour ajouter ou surcharger des renderers de formes. */
  registry?: RendererRegistry;
  background?: string;
  controls?: Partial<ControlSettings>;
}

/** Vue à restaurer au chargement (SPEC §5.3) : dernière page active et sa caméra. */
export interface InitialView {
  pageId?: string;
  camera?: CameraState;
}

export type EngineEvents = {
  load: [document: DocumentModel, fileId: string];
  pageChange: [page: PageModel];
  cameraChange: [state: CameraState];
};
export type EngineEvent = keyof EngineEvents;

/** Façade publique du moteur (SPEC §4.3). Aucune dépendance à React. */
export class Engine {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera();
  private readonly registry: RendererRegistry;
  private readonly text: ReturnType<typeof createTroikaTextFactory>;
  private readonly events = new Emitter<EngineEvents>();
  private readonly resizeObserver: ResizeObserver;
  private readonly controller: CameraController;

  private document: DocumentModel | undefined;
  private fileId: string | undefined;
  private pageScene: PageScene | undefined;
  private cameraState: CameraState = { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0 };
  private viewport: Viewport = { width: 1, height: 1 };
  /** Cadrage demandé avant que le canvas ait une taille réelle : appliqué à la première mesure. */
  private pendingFit: Rect | undefined;
  private frame = 0;
  private disposed = false;

  constructor(options: EngineOptions) {
    this.canvas = options.canvas;
    this.registry = options.registry ?? createDefaultRegistry();
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene.background = new Color(options.background ?? '#ffffff');
    this.text = createTroikaTextFactory(options.fonts ?? {}, this.requestRender);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.resize();

    this.controller = new CameraController(
      this.canvas,
      {
        getCameraState: () => this.cameraState,
        setCameraState: (state) => this.setCameraState(state),
        getViewport: () => this.viewport,
      },
      options.controls,
    );
  }

  async load(xml: string, fileId: string, initialView?: InitialView): Promise<void> {
    const document = parseDrawio(xml);
    this.document = document;
    this.fileId = fileId;
    this.events.emit('load', document, fileId);
    const page = document.pages.find((p) => p.id === initialView?.pageId) ?? document.pages[0];
    if (!page) {
      this.showPage(undefined);
      return;
    }
    this.goToPage(page.id);
    if (initialView?.camera && page.id === initialView.pageId) this.setCameraState(initialView.camera);
  }

  getDocument(): DocumentModel | undefined {
    return this.document;
  }

  getFileId(): string | undefined {
    return this.fileId;
  }

  getCurrentPage(): PageModel | undefined {
    return this.document?.pages.find((p) => p.id === this.pageScene?.pageId);
  }

  /** Scène de la page courante (lecture seule : diagnostics, tests). */
  getPageScene(): PageScene | undefined {
    return this.pageScene;
  }

  goToPage(pageId: string): void {
    const page = this.document?.pages.find((p) => p.id === pageId);
    if (!page) throw new Error(`Page inconnue : ${pageId}`);
    this.showPage(page);
    this.fitToBounds(page.bounds);
    this.events.emit('pageChange', page);
  }

  getCameraState(): CameraState {
    return structuredClone(this.cameraState);
  }

  /** Cadre une emprise de la page courante (sans dépasser 100 %). */
  fitToBounds(bounds: Rect): void {
    if (!this.isMeasured()) {
      this.pendingFit = bounds;
      return;
    }
    this.setCameraState(fitBounds(bounds, this.viewport));
  }

  setCameraState(state: CameraState): void {
    this.pendingFit = undefined;
    this.cameraState = normalizeCameraState(state);
    applyCameraState(this.camera, this.cameraState, this.viewport);
    this.events.emit('cameraChange', this.getCameraState());
    this.requestRender();
  }

  /** Remet le nord en haut, en gardant le point au centre de l'écran. */
  resetRotation(): void {
    const center = { x: this.viewport.width / 2, y: this.viewport.height / 2 };
    this.setCameraState(rotateAround(this.cameraState, this.viewport, center, -this.cameraState.rotation));
  }

  getControls(): ControlSettings {
    return this.controller.getSettings();
  }

  setControls(patch: Partial<ControlSettings>): void {
    this.controller.setSettings(patch);
  }

  on<K extends EngineEvent>(event: K, handler: (...args: EngineEvents[K]) => void): () => void {
    return this.events.on(event, handler);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controller.dispose();
    this.showPage(undefined);
    this.text.dispose();
    this.renderer.dispose();
    this.events.clear();
  }

  // -------------------------------------------------------------------------

  private showPage(page: PageModel | undefined): void {
    if (this.pageScene) {
      this.scene.remove(this.pageScene.root);
      this.pageScene.dispose();
      this.pageScene = undefined;
    }
    if (page) {
      this.pageScene = buildPageScene(page, this.registry, { text: this.text });
      this.scene.add(this.pageScene.root);
    }
    this.requestRender();
  }

  private resize(): void {
    // Taille exacte (clientWidth/clientHeight arrondissent, ce qui décale le zoom au curseur).
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    if (width === this.viewport.width && height === this.viewport.height) return;
    this.viewport = { width, height };
    this.renderer.setSize(width, height, false);
    if (this.pendingFit && this.isMeasured()) {
      this.setCameraState(fitBounds(this.pendingFit, this.viewport));
      return;
    }
    applyCameraState(this.camera, this.cameraState, this.viewport);
    this.requestRender();
  }

  /** Un canvas masqué ou pas encore mis en page mesure 0 (ramené à 1). */
  private isMeasured(): boolean {
    return this.viewport.width > 1 && this.viewport.height > 1;
  }

  /** Rendu à la demande : une image par frame au plus, seulement quand quelque chose a changé. */
  private readonly requestRender = (): void => {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.renderer.render(this.scene, this.camera);
    });
  };
}
