import { Box3, Color, Mesh, OrthographicCamera, Scene, WebGLRenderer } from 'three';
import type { MeshBasicMaterial, Object3D } from 'three';
import { collectUnsupported } from './diagnostics/unsupportedStyles';
import type { UnsupportedReport } from './diagnostics/unsupportedStyles';
import { Emitter } from './events';
import { isNavigableLink } from './format/link';
import { parseDrawio } from './format/parse';
import {
  applyCameraState,
  fitBounds,
  interpolateCamera,
  MAX_ZOOM,
  normalizeAngle,
  normalizeCameraState,
  rotateAround,
  sameView,
  screenAxes,
  screenToPage,
  tiltFromElevation,
  withViewMode,
  zoomAt,
} from './interaction/camera';
import type { CameraState, Viewport } from './interaction/camera';
import { CameraController } from './interaction/controls';
import type { ControlSettings } from './interaction/controls';
import { NavigationHistory, findParents, usageKey } from './interaction/history';
import type { HistoryEntry, LinkUsage, ParentLink } from './interaction/history';
import { buildGraphPage, cardId, GRAPH_PAGE_ID } from './graph/graphPage';
import type { GraphLayout } from './graph/graphPage';
import { buildGraphScene } from './graph/graphScene';
import { Minimap } from './interaction/minimap';
import { pickElement } from './interaction/pick';
import type { PickedElement } from './interaction/pick';
import { easing, embedIn, embeddedCamera, phase } from './interaction/transitions';
import type { DocumentModel, LinkModel, PageModel, Point, Rect } from './model/types';
import { selectionOutline } from './render/decorations';
import { createVeil, liftAboveVeil } from './render/highlight';
import { disposeObject } from './render/meshes';
import { setPageOpacity } from './render/pageEffects';
import { buildPageScene, effectiveLevel } from './render/pageScene';
import type { PageScene } from './render/pageScene';
import { SceneManager } from './render/sceneManager';
import { createDefaultRegistry } from './render/shapes/registry';
import type { ShapeRegistry } from './render/shapes/registry';
import type { SceneLevel } from './render/shapes/types';
import { setPageTransform } from './render/space';
import { createTroikaTextFactory } from './render/troikaText';
import { DEFAULT_SETTINGS, mergeSettings, resolveReducedMotion } from './settings';
import type { PreloadSettings, Settings, SettingsPatch, TransitionSettings, ViewSettings } from './settings';
import type { FontSet } from './render/troikaText';

export type { PreloadSettings, Settings, SettingsPatch, TransitionSettings, ViewSettings } from './settings';

export interface Selection {
  pageId: string;
  picked: PickedElement;
}

/** Ouvre une URL externe (SPEC §11.4) : nouvel onglet, sans accès retour à cette page. */
function defaultOpenUrl(href: string): void {
  window.open(href, '_blank', 'noopener,noreferrer');
}

/** Pixels écran de tolérance pour attraper une arête. */
const EDGE_PICK_TOLERANCE = 6;

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  fonts?: FontSet;
  /** Pour ajouter ou surcharger des renderers de formes. */
  registry?: ShapeRegistry;
  background?: string;
  /** Paramètres (SPEC §13) ; ensuite modifiables par `updateSettings`. */
  settings?: SettingsPatch;
  /** Ouverture des liens URL (par défaut : nouvel onglet du navigateur). */
  openUrl?: (href: string) => void;
}

/** Vue à restaurer au chargement (SPEC §5.3) : dernière page active et caméras par page. */
export interface InitialView {
  pageId?: string;
  /** Caméra de la page `pageId` (prioritaire sur `cameraByPage`). */
  camera?: CameraState;
  cameraByPage?: Record<string, CameraState>;
  /** Pile de navigation à restaurer (SPEC §11.3). */
  history?: HistoryEntry[];
  /** Dernière utilisation des liens du fichier, pour trier les pages parentes. */
  linkUsage?: LinkUsage;
}

/** Ce que ferait « Retour » depuis la page courante. */
export type BackTarget =
  | { kind: 'history'; entry: HistoryEntry; pageName: string }
  | { kind: 'parent'; parent: ParentLink }
  | { kind: 'choose'; parents: ParentLink[] }
  | { kind: 'none' };

export type EngineEvents = {
  load: [document: DocumentModel, fileId: string];
  pageChange: [page: PageModel];
  cameraChange: [state: CameraState];
  selectionChange: [selection: Selection | undefined];
  /** Transition vers une page par un lien : début et fin (entrées ignorées entre les deux). */
  transitionStart: [fromPageId: string, toPageId: string];
  transitionEnd: [pageId: string];
  /** Les paramètres ont changé (à persister / refléter dans l'UI). */
  settingsChange: [settings: Settings];
  /** Touche M : l'UI affiche ou masque la mini-carte. */
  minimapToggle: [];
  /** La pile de navigation a changé (à persister). */
  historyChange: [entries: HistoryEntry[]];
  /** Un lien entre pages vient d'être suivi (à persister pour trier les parents). */
  linkUsed: [fromPageId: string, toPageId: string, at: number];
  /** « Retour » sans historique et plusieurs parents possibles : à l'UI de proposer le choix. */
  backChoice: [parents: ParentLink[]];
};
export type EngineEvent = keyof EngineEvents;

/** Façade publique du moteur (SPEC §4.3). Aucune dépendance à React. */
export class Engine {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera();
  private readonly registry: ShapeRegistry;
  private readonly text: ReturnType<typeof createTroikaTextFactory>;
  private readonly events = new Emitter<EngineEvents>();
  private readonly resizeObserver: ResizeObserver;
  private readonly controller: CameraController;

  private document: DocumentModel | undefined;
  private unsupportedReport: UnsupportedReport | undefined;
  private fileId: string | undefined;
  private readonly scenes: SceneManager;
  private currentPageId: string | undefined;
  /** Dernière caméra de chaque page visitée (SPEC §9.4). */
  private pageCameras = new Map<string, CameraState>();
  private cameraState: CameraState = { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0, tilt: 0 };
  private settings: Settings;
  /** Préférence système « réduire les animations » (suivie en direct). */
  private readonly reducedMotionQuery: MediaQueryList | undefined;
  private viewport: Viewport = { width: 1, height: 1 };
  /** Cadrage demandé avant que le canvas ait une taille réelle : appliqué à la première mesure. */
  private pendingFit: Rect | undefined;
  private frame = 0;
  private animation = 0;
  private disposed = false;

  private readonly openUrl: (href: string) => void;
  private selection: Selection | undefined;
  private selectionObject: ReturnType<typeof selectionOutline> | undefined;
  /** Contour animé : décalage des tirets (pixels écran) et boucle d'animation. */
  private selectionPhase = 0;
  /** Voile de mise en valeur de la sélection, et de quoi l'annuler. */
  private veil: { key: string; object: Object3D; restore: () => void } | undefined;
  private selectionAnimation = 0;
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;
  /** Transition en cours : de quoi l'interrompre proprement. */
  private transition: { abort: () => void } | undefined;
  private readonly history = new NavigationHistory();
  /** Hauteur courante des volumes iso (0 à 1, suit l'inclinaison). */
  private heightScale = 1;
  /** Vue graphe du document (SPEC §12), construite à la première demande. */
  private graph: { page: PageModel; layout: GraphLayout } | undefined;
  /** Dernière page du document affichée (pour revenir du graphe). */
  private lastDocumentPageId: string | undefined;
  private minimap: Minimap | undefined;
  private linkUsage: LinkUsage = {};

  constructor(options: EngineOptions) {
    this.canvas = options.canvas;
    this.registry = options.registry ?? createDefaultRegistry();
    this.settings = mergeSettings(DEFAULT_SETTINGS, options.settings);
    this.reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotionQuery?.addEventListener?.('change', this.onReducedMotionChange);
    if (this.settings.view.defaultMode === 'iso') {
      this.cameraState = withViewMode(this.cameraState, 'iso', this.isoTilt(), this.isoAzimuth());
    }
    this.openUrl = options.openUrl ?? defaultOpenUrl;
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene.background = new Color(options.background ?? '#ffffff');
    this.text = createTroikaTextFactory(options.fonts ?? {}, this.requestRender);
    this.scenes = new SceneManager(
      this.scene,
      (page, level) =>
        page.id === GRAPH_PAGE_ID && this.graph && this.document
          ? buildGraphScene(page, this.graph.layout, this.document, this.registry, this.renderContext(), level)
          : buildPageScene(page, this.registry, this.renderContext(), level),
      this.settings.preload.maxCachedPages,
      (page) => effectiveLevel(page, this.registry, this.requestedLevel()),
    );

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.resize();

    this.controller = new CameraController(
      this.canvas,
      {
        getCameraState: () => this.cameraState,
        setCameraState: (state) => this.setCameraState(state),
        getViewport: () => this.viewport,
        toggleOverview: (screen) => this.toggleOverview(screen),
        click: (screen) => this.handleClick(screen),
        doubleClick: (screen) => this.handleDoubleClick(screen),
        hover: (screen) => this.handleHover(screen),
        back: () => this.back(),
        toggleViewMode: () => this.toggleViewMode(),
        toggleMinimap: () => this.events.emit('minimapToggle'),
        toggleGraph: () => this.toggleGraph(),
      },
      this.effectiveControls(),
    );
  }

  async load(xml: string, fileId: string, initialView?: InitialView): Promise<void> {
    const document = parseDrawio(xml);
    this.document = document;
    this.fileId = fileId;
    this.unsupportedReport = collectUnsupported(document, this.registry);
    this.transition?.abort();
    this.clearSelection();
    this.scenes.clear();
    this.currentPageId = undefined;
    this.graph = undefined;
    this.lastDocumentPageId = undefined;
    this.history.replace(initialView?.history ?? []);
    this.linkUsage = { ...initialView?.linkUsage };
    this.pageCameras = new Map(
      Object.entries(initialView?.cameraByPage ?? {}).map(([id, camera]) => [id, normalizeCameraState(camera)]),
    );
    if (initialView?.pageId && initialView.camera) {
      this.pageCameras.set(initialView.pageId, normalizeCameraState(initialView.camera));
    }
    this.events.emit('load', document, fileId);
    const page = (initialView?.pageId && this.pageById(initialView.pageId)) || document.pages[0];
    if (!page) {
      this.scenes.hideAll();
      this.requestRender();
      return;
    }
    this.goToPage(page.id);
  }

  getDocument(): DocumentModel | undefined {
    return this.document;
  }

  /** Éléments non supportés du document chargé, triés par fréquence (SPEC §8.4). */
  getUnsupportedReport(): UnsupportedReport | undefined {
    return this.unsupportedReport;
  }

  /**
   * Va à la page d'un élément et cadre dessus (diagnostics, liens). Les formes sont cadrées
   * sur leurs bornes, les arêtes sur leur tracé dessiné.
   */
  focusElement(pageId: string, elementId: string): void {
    if (this.currentPageId !== pageId) this.goToPage(pageId);
    const page = this.getCurrentPage();
    if (!page) return;
    const bounds = page.shapes.find((s) => s.id === elementId)?.bounds ?? this.drawnBounds(elementId) ?? page.bounds;
    this.animateCameraTo(fitBounds(bounds, this.viewport, { ...this.orientation(), padding: 80, maxZoom: 2 }));
  }

  /** Emprise dessinée d'un élément de la page courante, en coordonnées page. */
  private drawnBounds(elementId: string): Rect | undefined {
    const object = this.sceneObject(elementId);
    if (!object) return undefined;
    const box = new Box3().setFromObject(object);
    if (box.isEmpty()) return undefined;
    // Monde → page : X = x, Z = y.
    return { x: box.min.x, y: box.min.z, width: box.max.x - box.min.x, height: box.max.z - box.min.z };
  }

  getFileId(): string | undefined {
    return this.fileId;
  }

  getCurrentPage(): PageModel | undefined {
    return this.currentPageId ? this.pageById(this.currentPageId) : undefined;
  }

  /** Scène de la page courante (lecture seule : diagnostics, tests). */
  getPageScene(): PageScene | undefined {
    return this.scenes.current;
  }

  /** Pages dont la scène est construite, de la moins à la plus récemment affichée. */
  getCachedPageIds(): string[] {
    return this.scenes.cachedIds();
  }

  /** Dernière caméra de chaque page visitée (à persister, SPEC §5.1 `cameraByPage`). */
  getPageCameras(): Record<string, CameraState> {
    return structuredClone(Object.fromEntries(this.pageCameras));
  }

  /**
   * Affiche une page (SPEC §9.4) : sa scène est reprise du cache si elle a déjà été construite,
   * et sa caméra est celle de la dernière visite (sinon la page entière est cadrée).
   */
  goToPage(pageId: string): void {
    const page = this.pageById(pageId);
    if (!page) throw new Error(`Page inconnue : ${pageId}`);
    this.transition?.abort();
    cancelAnimationFrame(this.animation);
    this.animation = 0;
    if (this.currentPageId !== page.id) this.clearSelection();
    this.currentPageId = page.id;
    if (page.id !== GRAPH_PAGE_ID) this.lastDocumentPageId = page.id;
    this.scenes.show(page);
    this.applyHeightScale();
    this.minimap?.invalidate();
    const camera = this.pageCameras.get(page.id);
    if (camera) this.setCameraState(camera);
    else this.fitToBounds(page.bounds);
    this.requestRender();
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
    this.setCameraState(fitBounds(bounds, this.viewport, { tilt: this.cameraState.tilt }));
  }

  setCameraState(state: CameraState): void {
    cancelAnimationFrame(this.animation);
    this.animation = 0;
    this.applyCamera(state);
  }

  /** Anime la caméra vers un état (instantané si les animations sont réduites). Toute autre entrée l'interrompt. */
  animateCameraTo(target: CameraState, durationMs = 250): void {
    if (this.reducedMotion() || durationMs <= 0) {
      this.setCameraState(target);
      return;
    }
    cancelAnimationFrame(this.animation);
    const from = this.cameraState;
    const to = normalizeCameraState(target);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Ease-in-out cubique.
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.applyCamera(interpolateCamera(from, to, eased));
      this.animation = t < 1 ? requestAnimationFrame(step) : 0;
    };
    this.animation = requestAnimationFrame(step);
  }

  /**
   * Vue globale de la page courante, dans l'orientation actuelle. Contrairement au cadrage
   * d'ouverture, elle n'est pas plafonnée à 100 % : un petit schéma remplit l'écran,
   * sinon la bascule globale ↔ 1:1 n'aurait aucun effet.
   */
  getOverviewState(): CameraState | undefined {
    const page = this.getCurrentPage();
    if (!page) return undefined;
    return fitBounds(page.bounds, this.viewport, { ...this.orientation(), maxZoom: MAX_ZOOM });
  }

  /**
   * Bascule vue globale ↔ 1:1 (touche Entrée). Depuis la vue globale, passe à 100 % autour
   * du point écran donné (ou du centre) ; depuis toute autre vue, revient à la vue globale.
   */
  toggleOverview(screen?: Point): void {
    const overview = this.getOverviewState();
    if (!overview) return;
    const current = this.cameraState;
    if (sameView(current, overview, this.viewport)) {
      const anchor = screen ?? { x: this.viewport.width / 2, y: this.viewport.height / 2 };
      this.animateCameraTo(zoomAt(current, this.viewport, anchor, 1 / current.zoom));
    } else {
      this.animateCameraTo(overview);
    }
  }

  /** Page du document, ou la page générée de la vue graphe. */
  private pageById(id: string): PageModel | undefined {
    if (id === GRAPH_PAGE_ID) return this.getGraphPage();
    return this.document?.pages.find((p) => p.id === id);
  }

  /** Niveau de rendu demandé par le mode de vue (repli à plat si les formes n'en ont pas). */
  private requestedLevel(): SceneLevel {
    return this.cameraState.mode === 'iso' && this.settings.view.isoVolume ? 'iso' : 'flat';
  }

  private renderContext() {
    return { text: this.text, volume: { depth: this.settings.view.isoDepth } };
  }

  /**
   * Volumes iso : la hauteur des blocs suit l'inclinaison (ils « poussent » pendant la bascule
   * 2D → iso, et s'aplatissent si l'on remonte vers la vue de dessus).
   */
  /**
   * Éléments tournés face à l'écran (`userData.billboard`, ex. arêtes verticales des volumes) :
   * rotation autour de la verticale égale à celle de la vue.
   */
  private orientBillboards(): void {
    const scene = this.scenes.current;
    if (!scene || scene.level !== 'iso') return;
    const rotation = this.cameraState.rotation;
    if (scene.root.userData.billboardRotation === rotation) return;
    scene.root.userData.billboardRotation = rotation;
    scene.root.traverse((object) => {
      if (object.userData.billboard) object.rotation.z = rotation;
    });
  }

  private applyHeightScale(): void {
    this.orientBillboards();
    const scene = this.scenes.current;
    if (!scene || scene.level !== 'iso' || this.transition) return;
    const scale = Math.min(1, Math.max(0, this.cameraState.tilt / Math.max(this.isoTilt(), 1e-6)));
    this.heightScale = scale;
    setPageTransform(scene.root, undefined, scale);
  }

  /** Les volumes ont changé (activés, épaisseur) : on reconstruit les scènes. */
  private rebuildScenes(): void {
    this.scenes.clear();
    const page = this.getCurrentPage();
    if (page) this.scenes.show(page);
    this.applyHeightScale();
    this.updateSelectionOutline();
    this.minimap?.invalidate();
    this.requestRender();
  }

  private applyCamera(state: CameraState): void {
    this.pendingFit = undefined;
    const previousZoom = this.cameraState.zoom;
    const previousMode = this.cameraState.mode;
    this.cameraState = normalizeCameraState(state);
    // Changement de mode : la page passe au rendu de ce niveau (même scène si tout est à plat).
    if (this.cameraState.mode !== previousMode && !this.transition) {
      const page = this.getCurrentPage();
      if (page) {
        this.scenes.show(page);
        this.minimap?.invalidate();
      }
    }
    if (this.currentPageId) this.pageCameras.set(this.currentPageId, this.cameraState);
    this.minimap?.requestDraw();
    // Contour de sélection d'épaisseur constante à l'écran.
    if (this.selection && this.cameraState.zoom !== previousZoom) this.updateSelectionOutline();
    applyCameraState(this.camera, this.cameraState, this.viewport);
    this.applyHeightScale();
    this.events.emit('cameraChange', this.getCameraState());
    this.requestRender();
  }

  // -------------------------------------------------------------------------
  // Modes de vue (SPEC §9.1)

  getViewMode(): 'top' | 'iso' {
    return this.cameraState.mode;
  }

  /** Bascule animée vers la vue de dessus ou la vue isométrique ; le centre de l'écran ne bouge pas. */
  setViewMode(mode: 'top' | 'iso'): void {
    if (this.transition) return;
    this.animateCameraTo(
      withViewMode(this.cameraState, mode, this.isoTilt(), this.isoAzimuth()),
      this.settings.view.switchDurationMs,
    );
  }

  toggleViewMode(): void {
    this.setViewMode(this.cameraState.mode === 'iso' ? 'top' : 'iso');
  }

  getViewSettings(): ViewSettings {
    return { ...this.settings.view };
  }

  setViewSettings(patch: Partial<ViewSettings>): void {
    this.updateSettings({ view: patch });
  }

  private isoTilt(): number {
    return tiltFromElevation(this.settings.view.isoAngleDeg);
  }

  private isoAzimuth(): number {
    return (this.settings.view.isoAzimuthDeg * Math.PI) / 180;
  }

  /** Orientation de référence du mode courant : 0 en vue de dessus, l'azimut iso en isométrie. */
  getReferenceRotation(): number {
    return this.cameraState.mode === 'iso' ? normalizeAngle(this.isoAzimuth()) : 0;
  }

  /** Orientation courante (rotation + inclinaison), conservée par les cadrages. */
  private orientation(): { rotation: number; tilt: number } {
    return { rotation: this.cameraState.rotation, tilt: this.cameraState.tilt };
  }

  // -------------------------------------------------------------------------
  // Vue graphe (SPEC §12)

  /** Page générée de la vue graphe (cartes des pages, flèches des liens). */
  getGraphPage(): PageModel | undefined {
    if (!this.document) return undefined;
    this.graph ??= buildGraphPage(this.document);
    return this.graph.page;
  }

  isGraphView(): boolean {
    return this.currentPageId === GRAPH_PAGE_ID;
  }

  /**
   * Affiche la vue graphe. Depuis une page : la page rétrécit dans sa carte (transition inverse
   * d'un lien), puis on recule jusqu'à la vue d'ensemble du graphe (ou sa dernière vue).
   */
  showGraph(): void {
    const graph = this.getGraphPage();
    const page = this.getCurrentPage();
    if (!graph || !page || page.id === GRAPH_PAGE_ID || this.transition) return;
    const card = graph.shapes.find((s) => s.id === cardId(page.id));
    this.runTransition({
      direction: 'out',
      outer: graph,
      inner: page,
      frame: card?.bounds,
      destination: this.pageCameras.get(GRAPH_PAGE_ID) ?? fitBounds(graph.bounds, this.viewport, this.orientation()),
    });
  }

  /** Touche G : graphe ↔ dernière page affichée (en plongeant dans sa carte). */
  toggleGraph(): void {
    if (!this.isGraphView()) {
      this.showGraph();
      return;
    }
    const target = this.lastDocumentPageId ?? this.document?.pages[0]?.id;
    if (target) this.followLink(cardId(target));
  }

  /**
   * Affiche la mini-carte dans un canvas fourni par l'UI (SPEC §10). Renvoie de quoi la détacher.
   * `size` : largeur en pixels CSS (la hauteur suit les proportions de la page).
   */
  attachMinimap(canvas: HTMLCanvasElement, size = 200): () => void {
    this.minimap?.dispose();
    const minimap = new Minimap(
      canvas,
      {
        getPage: () => this.getCurrentPage(),
        getCamera: () => this.cameraState,
        getViewport: () => this.viewport,
        getEdgeRoute: (id) => this.sceneObject(id)?.userData.route as Point[] | undefined,
        paintShape: (context, shape, map) => this.registry.minimapPainter(shape)?.(context, shape, map),
        centerOn: (point) => {
          if (!this.transition) this.setCameraState({ ...this.cameraState, center: point });
        },
      },
      size,
    );
    this.minimap = minimap;
    minimap.invalidate();
    return () => {
      minimap.dispose();
      if (this.minimap === minimap) this.minimap = undefined;
    };
  }

  /** Revient à l'orientation de référence du mode (nord en haut, ou l'orientation iso), autour du centre de l'écran. */
  resetRotation(): void {
    const center = { x: this.viewport.width / 2, y: this.viewport.height / 2 };
    const delta = normalizeAngle(this.getReferenceRotation() - this.cameraState.rotation);
    this.animateCameraTo(rotateAround(this.cameraState, this.viewport, center, delta), 300);
  }

  getControls(): ControlSettings {
    return structuredClone(this.settings.controls);
  }

  setControls(patch: Partial<ControlSettings>): void {
    this.updateSettings({ controls: patch });
  }

  // -------------------------------------------------------------------------
  // Paramètres (SPEC §13)

  getSettings(): Settings {
    return structuredClone(this.settings);
  }

  /**
   * Modifie des paramètres, section par section ; tout s'applique immédiatement : contrôles,
   * transitions, préchargement, taille du cache, et en iso l'élévation / l'orientation (animées,
   * en gardant l'écart de rotation choisi par l'utilisateur).
   */
  updateSettings(patch: SettingsPatch): void {
    const previous = this.settings;
    this.settings = mergeSettings(previous, patch);
    this.controller.setSettings(this.effectiveControls());
    this.scenes.setMaxCached(this.settings.preload.maxCachedPages);
    this.syncSelectionAnimation();
    this.updateSelectionOutline();
    if (
      this.settings.view.isoVolume !== previous.view.isoVolume ||
      this.settings.view.isoDepth !== previous.view.isoDepth
    ) {
      this.rebuildScenes();
    }

    const view = this.settings.view;
    const isoChanged =
      view.isoAngleDeg !== previous.view.isoAngleDeg || view.isoAzimuthDeg !== previous.view.isoAzimuthDeg;
    if (isoChanged && this.cameraState.mode === 'iso' && !this.transition) {
      const azimuthDelta = ((view.isoAzimuthDeg - previous.view.isoAzimuthDeg) * Math.PI) / 180;
      const target = {
        ...this.cameraState,
        tilt: this.isoTilt(),
        rotation: normalizeAngle(this.cameraState.rotation + azimuthDelta),
      };
      if (!sameView(target, this.cameraState, this.viewport)) this.animateCameraTo(target, view.switchDurationMs);
    }
    this.events.emit('settingsChange', this.getSettings());
  }

  /** Animations réduites : réglage d'accessibilité, ou préférence système si « système ». */
  reducedMotion(): boolean {
    return resolveReducedMotion(this.settings.accessibility.reducedMotion, this.reducedMotionQuery?.matches ?? false);
  }

  /** Contrôles effectifs : pas de glissade quand les animations sont réduites. */
  private effectiveControls(): ControlSettings {
    const controls = this.settings.controls;
    return this.reducedMotion() ? { ...controls, decelerationMs: 0 } : controls;
  }

  private readonly onReducedMotionChange = (): void => {
    this.controller.setSettings(this.effectiveControls());
    this.syncSelectionAnimation();
    this.events.emit('settingsChange', this.getSettings());
  };

  // -------------------------------------------------------------------------
  // Sélection et liens (SPEC §11)

  getSelection(): Selection | undefined {
    return this.selection;
  }

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

  isTransitioning(): boolean {
    return this.transition !== undefined;
  }

  /** Élément de la page courante sous un point écran. */
  pickAt(screen: Point): PickedElement | undefined {
    const page = this.getCurrentPage();
    if (!page) return undefined;
    const point = screenToPage(this.cameraState, this.viewport, screen);
    return pickElement(page, point, {
      edgeTolerance: EDGE_PICK_TOLERANCE / this.cameraState.zoom,
      edgeRoute: (id) => this.sceneObject(id)?.userData.route as Point[] | undefined,
      heightOf: (id) => this.elementTop(id),
      pointAtHeight: (height) => this.groundPointAtHeight(screen, height),
    });
  }

  select(picked: PickedElement | undefined): void {
    const page = this.getCurrentPage();
    this.selection = picked && page ? { pageId: page.id, picked } : undefined;
    this.updateSelectionOutline();
    this.syncSelectionAnimation();
    this.events.emit('selectionChange', this.selection);
  }

  clearSelection(): void {
    if (!this.selection) return;
    this.select(undefined);
  }

  /** Construit en arrière-plan la page cible d'un lien, sans l'afficher (SPEC §11.1). */
  preloadLink(link: LinkModel | undefined): void {
    if (link?.type !== 'page' || link.pageId === this.currentPageId) return;
    const page = this.pageById(link.pageId);
    if (page) this.scenes.prebuild(page);
  }

  /**
   * Suit le lien d'un élément de la page courante : transition vers la page cible, ou ouverture
   * de l'URL dans un nouvel onglet. Sans effet si l'élément n'a pas de lien exploitable.
   */
  followLink(elementId: string): void {
    const page = this.getCurrentPage();
    const element = page && [...page.shapes, ...page.edges].find((e) => e.id === elementId);
    const link = element?.link;
    if (!page || !element || !isNavigableLink(link) || this.transition) return;
    if (link.type === 'url') {
      this.openUrl(link.href);
      return;
    }
    const target = this.pageById(link.pageId);
    if (!target || target.id === page.id) return;

    const frame = page.shapes.find((s) => s.id === elementId)?.bounds ?? this.drawnBounds(elementId);
    this.history.push({ pageId: page.id, elementId, frame, camera: this.cameraState, targetPageId: target.id });
    this.events.emit('historyChange', this.history.entries());
    // L'usage ne compte que pour les vrais liens du document (pas les cartes de la vue graphe).
    if (page.id !== GRAPH_PAGE_ID) {
      const at = Date.now();
      this.linkUsage[usageKey(page.id, target.id)] = at;
      this.events.emit('linkUsed', page.id, target.id, at);
    }

    this.runTransition({
      direction: 'in',
      outer: page,
      inner: target,
      frame,
      destination: this.pageCameras.get(target.id) ?? fitBounds(target.bounds, this.viewport, this.orientation()),
    });
  }

  /** Dernière utilisation des liens entre pages du fichier (à persister). */
  getLinkUsage(): LinkUsage {
    return { ...this.linkUsage };
  }

  /** Pile de navigation (de la plus ancienne à la plus récente entrée). */
  getHistory(): HistoryEntry[] {
    return this.history.entries();
  }

  /**
   * Destination de « Retour » (SPEC §11.3) : le haut de la pile si elle mène à la page courante ;
   * sinon les pages parentes (liens vers la page courante), la plus récemment utilisée d'abord.
   */
  getBackTarget(): BackTarget {
    const page = this.getCurrentPage();
    if (!page || !this.document) return { kind: 'none' };
    const entry = this.history.peek();
    if (entry && entry.targetPageId === page.id) {
      const pageName = this.pageById(entry.pageId)?.name ?? entry.pageId;
      return { kind: 'history', entry, pageName };
    }
    const parents = findParents(this.document, page.id, this.linkUsage);
    if (parents.length === 1) return { kind: 'parent', parent: parents[0]! };
    if (parents.length > 1) return { kind: 'choose', parents };
    return { kind: 'none' };
  }

  /**
   * Retour : dépile et revient exactement à la vue d'origine, par la transition inverse
   * (la page courante rétrécit dans la forme d'où l'on venait). Sans historique : un seul parent
   * → on y va ; plusieurs → événement `backChoice` (l'UI propose la liste, puis `backTo`).
   */
  back(): void {
    if (this.transition) return;
    const target = this.getBackTarget();
    if (target.kind === 'history') {
      this.history.pop();
      this.events.emit('historyChange', this.history.entries());
      this.returnTo(target.entry.pageId, target.entry.frame, target.entry.camera);
    } else if (target.kind === 'parent') {
      this.backTo(target.parent.pageId);
    } else if (target.kind === 'choose') {
      this.events.emit('backChoice', target.parents);
    }
  }

  /** Remonte vers une page parente choisie (sortie par la forme qui porte le lien). */
  backTo(parentPageId: string): void {
    const page = this.getCurrentPage();
    if (!page || !this.document || this.transition) return;
    const parent = findParents(this.document, page.id, this.linkUsage).find((p) => p.pageId === parentPageId);
    if (!parent) return;
    // La pile ne mène plus à la page courante : on repart d'une pile vide.
    this.history.clear();
    this.events.emit('historyChange', []);
    this.returnTo(parent.pageId, parent.frame, this.pageCameras.get(parent.pageId));
  }

  private returnTo(pageId: string, frame: Rect | undefined, camera: CameraState | undefined): void {
    const inner = this.getCurrentPage();
    const outer = this.pageById(pageId);
    if (!inner || !outer) return;
    const destination = camera ?? fitBounds(outer.bounds, this.viewport, this.orientation());
    this.runTransition({ direction: 'out', outer, inner, frame, destination });
  }

  /**
   * Transition « zoom + fondu » (SPEC §11.2), dans les deux sens, en un seul trajet de caméra.
   * La page intérieure (`inner`) est posée dans la forme (`frame`) de la page extérieure (`outer`).
   * - `in` : on part de la page extérieure et on plonge jusqu'à la vue `destination` de l'intérieure ;
   * - `out` : on part de la page intérieure (même image, exprimée dans le repère extérieur) et on
   *   recule jusqu'à la vue `destination` de l'extérieure, la page intérieure rétrécissant dans la forme.
   * Fondu croisé entre 25 % et 75 %. Entrées ignorées pendant la transition.
   */
  private runTransition(options: {
    direction: 'in' | 'out';
    outer: PageModel;
    inner: PageModel;
    frame: Rect | undefined;
    destination: CameraState;
  }): void {
    const { direction, outer, inner, frame, destination } = options;
    const from = this.getCurrentPage();
    const to = direction === 'in' ? inner : outer;
    if (!from || this.transition) return;

    if (
      !frame ||
      !this.settings.transition.enabled ||
      this.reducedMotion() ||
      this.settings.transition.durationMs <= 0
    ) {
      if (direction === 'in') this.pageCameras.set(outer.id, this.cameraState);
      this.pageCameras.set(to.id, destination);
      this.goToPage(to.id);
      return;
    }

    cancelAnimationFrame(this.animation);
    this.animation = 0;
    this.clearSelection();
    const embedding = embedIn(inner.bounds, frame);
    const outerScene = this.scenes.prebuild(outer);
    const innerScene = this.scenes.prebuild(inner);

    // Caméras de départ et d'arrivée, exprimées dans le repère de la page extérieure.
    const startCamera = direction === 'in' ? this.cameraState : embeddedCamera(this.cameraState, embedding);
    const endCamera = direction === 'in' ? embeddedCamera(destination, embedding) : destination;
    const outerCameraBefore = direction === 'in' ? this.cameraState : undefined;

    // Pendant la transition, la page courante est l'extérieure ; l'intérieure est posée dans la forme.
    this.currentPageId = outer.id;
    this.scenes.show(outer);
    this.minimap?.invalidate();
    innerScene.root.visible = true;
    setPageTransform(innerScene.root, embedding);
    const innerAlpha = (fade: number) => (direction === 'in' ? fade : 1 - fade);
    setPageOpacity(innerScene.root, innerAlpha(0));
    setPageOpacity(outerScene.root, 1 - innerAlpha(0));
    this.applyCamera(startCamera);

    const ease = easing(this.settings.transition.easing);
    const duration = this.settings.transition.durationMs;
    const FADE_START = 0.25;
    const FADE_END = 0.75;

    this.controller.setEnabled(false);
    this.events.emit('transitionStart', from.id, to.id);

    const restore = () => {
      setPageOpacity(outerScene.root, 1);
      setPageOpacity(innerScene.root, 1);
      setPageTransform(innerScene.root, undefined);
    };
    const finish = () => {
      this.transition = undefined;
      this.animation = 0;
      this.controller.setEnabled(true);
      this.events.emit('transitionEnd', this.currentPageId ?? to.id);
    };
    this.transition = {
      abort: () => {
        // On reste sur la page extérieure, à la vue courante.
        cancelAnimationFrame(this.animation);
        restore();
        this.scenes.show(outer);
        finish();
      },
    };

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      if (t < 1) {
        this.applyCamera(interpolateCamera(startCamera, endCamera, ease(t)));
        const fade = phase(t, FADE_START, FADE_END);
        setPageOpacity(innerScene.root, innerAlpha(fade));
        setPageOpacity(outerScene.root, 1 - innerAlpha(fade));
        this.animation = requestAnimationFrame(step);
        return;
      }
      // Arrivée : même image à l'écran, sur la page de destination sans transformation.
      restore();
      if (outerCameraBefore) this.pageCameras.set(outer.id, outerCameraBefore);
      this.currentPageId = to.id;
      if (to.id !== GRAPH_PAGE_ID) this.lastDocumentPageId = to.id;
      this.scenes.show(to);
      this.minimap?.invalidate();
      this.applyCamera(destination);
      this.events.emit('pageChange', to);
      finish();
    };
    this.animation = requestAnimationFrame(step);
  }

  private handleClick(screen: Point): void {
    const picked = this.pickAt(screen);
    this.select(picked);
    if (this.settings.preload.onClick) this.preloadLink(picked?.element.link);
  }

  private handleDoubleClick(screen: Point): void {
    const picked = this.pickAt(screen);
    if (picked && isNavigableLink(picked.element.link)) this.followLink(picked.element.id);
  }

  /** Survol : curseur main et infobulle sur les éléments liés ; préchargement optionnel. */
  private handleHover(screen: Point | undefined): void {
    const picked = screen ? this.pickAt(screen) : undefined;
    const link = isNavigableLink(picked?.element.link) ? picked?.element.link : undefined;
    if (!this.canvas.style.cursor.startsWith('grab')) this.canvas.style.cursor = link ? 'pointer' : '';
    this.canvas.title = link ? this.describeLink(link) : '';
    clearTimeout(this.hoverTimer);
    if (link && this.settings.preload.onHover) {
      this.hoverTimer = setTimeout(() => this.preloadLink(link), this.settings.preload.hoverDelayMs);
    }
  }

  private describeLink(link: LinkModel): string {
    if (link.type === 'url') return `${link.href} (double-clic : ouvrir dans un nouvel onglet)`;
    const name = this.pageById(link.pageId)?.name;
    return name ? `Double-clic : aller à « ${name} »` : `Lien vers une page absente (${link.pageId})`;
  }

  /** Hauteur du dessus d'un élément (volume iso), mise à l'échelle de la bascule ; 0 à plat. */
  private elementTop(elementId: string): number {
    const top = (this.sceneObject(elementId)?.userData.top as number | undefined) ?? 0;
    return this.scenes.current?.level === 'iso' ? top * this.heightScale : 0;
  }

  /**
   * Point de la page visé par un point écran, sur le plan horizontal à `height` au-dessus du sol :
   * le rayon de vue y arrive plus près de la caméra, de height · tan(inclinaison).
   */
  private groundPointAtHeight(screen: Point, height: number): Point {
    const ground = screenToPage(this.cameraState, this.viewport, screen);
    const shift = height * Math.tan(this.cameraState.tilt);
    const { down } = screenAxes(this.cameraState.rotation);
    return { x: ground.x + shift * down.x, y: ground.y + shift * down.y };
  }

  private sceneObject(elementId: string) {
    return this.scenes.current?.root.children.find((c) => c.userData.elementId === elementId);
  }

  /**
   * Contour de sélection animé (paramètre `selection`) : les tirets défilent lentement tant qu'il y a
   * une sélection ; arrêté sans sélection, si désactivé, ou si les animations sont réduites.
   */
  private syncSelectionAnimation(): void {
    const run =
      this.selection !== undefined &&
      this.settings.selection.style === 'outline' &&
      this.settings.selection.animated &&
      !this.reducedMotion();
    if (!run) {
      cancelAnimationFrame(this.selectionAnimation);
      this.selectionAnimation = 0;
      if (this.selectionPhase !== 0) {
        this.selectionPhase = 0;
        this.updateSelectionOutline();
      }
      return;
    }
    if (this.selectionAnimation) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // Phase décroissante : les tirets avancent dans le sens du contour.
      this.selectionPhase -= this.settings.selection.speed * dt;
      this.updateSelectionOutline();
      this.selectionAnimation = requestAnimationFrame(tick);
    };
    this.selectionAnimation = requestAnimationFrame(tick);
  }

  /**
   * Mise en valeur de la sélection (paramètre `selection.style`) : voile d'ombre sur le reste de la
   * page (défaut), ou contour bleu pointillé (éventuellement animé).
   */
  private updateSelectionOutline(): void {
    if (this.selectionObject) {
      this.selectionObject.parent?.remove(this.selectionObject);
      disposeObject(this.selectionObject);
      this.selectionObject = undefined;
    }
    const selection = this.selection;
    const root = this.scenes.current?.root;
    const visible = selection && root && selection.pageId === this.currentPageId ? selection : undefined;

    // Voile : gardé tant que la même sélection est affichée dans la même scène.
    const veilKey =
      visible && root && this.settings.selection.style === 'veil'
        ? `${root.uuid}:${visible.picked.element.id}:${this.settings.selection.veilOpacity}`
        : undefined;
    if (this.veil?.key !== veilKey) {
      this.clearVeil();
      const page = this.getCurrentPage();
      if (veilKey && visible && root && page) {
        const id = visible.picked.element.id;
        const object = createVeil(page.bounds, this.settings.selection.veilOpacity);
        root.add(object);
        const lifted = root.children.filter((c) => c.userData.elementId === id || c.userData.highlightWith === id);
        this.veil = { key: veilKey, object, restore: liftAboveVeil(lifted) };
      }
    }

    if (visible && root && this.settings.selection.style === 'outline') {
      const { picked } = visible;
      const bounds = picked.type === 'shape' ? picked.element.bounds : this.drawnBounds(picked.element.id);
      if (bounds) {
        this.selectionObject = selectionOutline(bounds, this.cameraState.zoom, this.selectionPhase);
        // Posé sur le dessus d'un volume, et toujours visible (pas caché par les blocs).
        this.selectionObject.position.z = ((this.sceneObject(picked.element.id)?.userData.top as number) ?? 0) + 0.2;
        this.selectionObject.traverse((o) => {
          if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
        });
        root.add(this.selectionObject);
      }
    }
    this.requestRender();
  }

  private clearVeil(): void {
    if (!this.veil) return;
    this.veil.restore();
    this.veil.object.removeFromParent();
    disposeObject(this.veil.object);
    this.veil = undefined;
  }

  on<K extends EngineEvent>(event: K, handler: (...args: EngineEvents[K]) => void): () => void {
    return this.events.on(event, handler);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.animation);
    cancelAnimationFrame(this.selectionAnimation);
    clearTimeout(this.hoverTimer);
    this.transition?.abort();
    this.resizeObserver.disconnect();
    this.controller.dispose();
    this.reducedMotionQuery?.removeEventListener?.('change', this.onReducedMotionChange);
    this.minimap?.dispose();
    this.scenes.clear();
    this.text.dispose();
    // Pas de forceContextLoss : le même canvas peut être repris par un nouveau moteur
    // (double montage de React en dev). Le contexte est libéré avec le canvas.
    this.renderer.dispose();
    this.events.clear();
  }

  // -------------------------------------------------------------------------

  private resize(): void {
    // Taille exacte (clientWidth/clientHeight arrondissent, ce qui décale le zoom au curseur).
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    if (width === this.viewport.width && height === this.viewport.height) return;
    this.viewport = { width, height };
    this.renderer.setSize(width, height, false);
    if (this.pendingFit && this.isMeasured()) {
      this.setCameraState(fitBounds(this.pendingFit, this.viewport, { tilt: this.cameraState.tilt }));
      return;
    }
    applyCameraState(this.camera, this.cameraState, this.viewport);
    this.minimap?.requestDraw();
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
