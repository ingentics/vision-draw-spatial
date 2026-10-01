import { Box3, Color, OrthographicCamera, Scene, WebGLRenderer } from 'three';
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
  normalizeCameraState,
  rotateAround,
  sameView,
  screenToPage,
  zoomAt,
} from './interaction/camera';
import type { CameraState, Viewport } from './interaction/camera';
import { CameraController } from './interaction/controls';
import type { ControlSettings } from './interaction/controls';
import { NavigationHistory, findParents, usageKey } from './interaction/history';
import type { HistoryEntry, LinkUsage, ParentLink } from './interaction/history';
import { pickElement } from './interaction/pick';
import type { PickedElement } from './interaction/pick';
import { easing, embedIn, embeddedCamera, phase } from './interaction/transitions';
import type { DocumentModel, LinkModel, PageModel, Point, Rect } from './model/types';
import { selectionOutline } from './render/decorations';
import { disposeObject } from './render/meshes';
import { setPageOpacity } from './render/pageEffects';
import { buildPageScene } from './render/pageScene';
import type { PageScene } from './render/pageScene';
import { SceneManager } from './render/sceneManager';
import { createDefaultRegistry } from './render/registry';
import type { RendererRegistry } from './render/registry';
import { setPageTransform } from './render/space';
import { createTroikaTextFactory } from './render/troikaText';
import type { FontSet } from './render/troikaText';

/** Transition entre pages par un lien (SPEC §11.2, §13 `transition`). */
export interface TransitionSettings {
  enabled: boolean;
  durationMs: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/** Préchargement de la page cible d'un lien (SPEC §11.1, §13 `preload`). */
export interface PreloadSettings {
  onClick: boolean;
  onHover: boolean;
  hoverDelayMs: number;
}

export const DEFAULT_TRANSITION: TransitionSettings = { enabled: true, durationMs: 1000, easing: 'ease-in-out' };
export const DEFAULT_PRELOAD: PreloadSettings = { onClick: true, onHover: false, hoverDelayMs: 300 };

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
  registry?: RendererRegistry;
  background?: string;
  controls?: Partial<ControlSettings>;
  /** Nombre de scènes de pages gardées en mémoire (SPEC §13, `preload.maxCachedPages`). */
  maxCachedPages?: number;
  transition?: Partial<TransitionSettings>;
  preload?: Partial<PreloadSettings>;
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
  private readonly registry: RendererRegistry;
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
  private cameraState: CameraState = { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0 };
  private viewport: Viewport = { width: 1, height: 1 };
  /** Cadrage demandé avant que le canvas ait une taille réelle : appliqué à la première mesure. */
  private pendingFit: Rect | undefined;
  private frame = 0;
  private animation = 0;
  private disposed = false;

  private transitionSettings: TransitionSettings;
  private preloadSettings: PreloadSettings;
  private readonly openUrl: (href: string) => void;
  private selection: Selection | undefined;
  private selectionObject: ReturnType<typeof selectionOutline> | undefined;
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;
  /** Transition en cours : de quoi l'interrompre proprement. */
  private transition: { abort: () => void } | undefined;
  private readonly history = new NavigationHistory();
  private linkUsage: LinkUsage = {};

  constructor(options: EngineOptions) {
    this.canvas = options.canvas;
    this.registry = options.registry ?? createDefaultRegistry();
    this.transitionSettings = { ...DEFAULT_TRANSITION, ...options.transition };
    this.preloadSettings = { ...DEFAULT_PRELOAD, ...options.preload };
    this.openUrl = options.openUrl ?? defaultOpenUrl;
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene.background = new Color(options.background ?? '#ffffff');
    this.text = createTroikaTextFactory(options.fonts ?? {}, this.requestRender);
    this.scenes = new SceneManager(
      this.scene,
      (page) => buildPageScene(page, this.registry, { text: this.text }),
      options.maxCachedPages,
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
      },
      options.controls,
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
    this.history.replace(initialView?.history ?? []);
    this.linkUsage = { ...initialView?.linkUsage };
    this.pageCameras = new Map(
      Object.entries(initialView?.cameraByPage ?? {}).map(([id, camera]) => [id, normalizeCameraState(camera)]),
    );
    if (initialView?.pageId && initialView.camera) {
      this.pageCameras.set(initialView.pageId, normalizeCameraState(initialView.camera));
    }
    this.events.emit('load', document, fileId);
    const page = document.pages.find((p) => p.id === initialView?.pageId) ?? document.pages[0];
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
    this.animateCameraTo(
      fitBounds(bounds, this.viewport, { rotation: this.cameraState.rotation, padding: 80, maxZoom: 2 }),
    );
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
    return this.document?.pages.find((p) => p.id === this.currentPageId);
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
    const page = this.document?.pages.find((p) => p.id === pageId);
    if (!page) throw new Error(`Page inconnue : ${pageId}`);
    this.transition?.abort();
    cancelAnimationFrame(this.animation);
    this.animation = 0;
    if (this.currentPageId !== page.id) this.clearSelection();
    this.currentPageId = page.id;
    this.scenes.show(page);
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
    this.setCameraState(fitBounds(bounds, this.viewport));
  }

  setCameraState(state: CameraState): void {
    cancelAnimationFrame(this.animation);
    this.animation = 0;
    this.applyCamera(state);
  }

  /** Anime la caméra vers un état (instantané si `prefers-reduced-motion`). Toute autre entrée l'interrompt. */
  animateCameraTo(target: CameraState, durationMs = 250): void {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || durationMs <= 0) {
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
    return fitBounds(page.bounds, this.viewport, { rotation: this.cameraState.rotation, maxZoom: MAX_ZOOM });
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

  private applyCamera(state: CameraState): void {
    this.pendingFit = undefined;
    const previousZoom = this.cameraState.zoom;
    this.cameraState = normalizeCameraState(state);
    if (this.currentPageId) this.pageCameras.set(this.currentPageId, this.cameraState);
    // Contour de sélection d'épaisseur constante à l'écran.
    if (this.selection && this.cameraState.zoom !== previousZoom) this.updateSelectionOutline();
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

  // -------------------------------------------------------------------------
  // Sélection et liens (SPEC §11)

  getSelection(): Selection | undefined {
    return this.selection;
  }

  getTransitionSettings(): TransitionSettings {
    return { ...this.transitionSettings };
  }

  setTransitionSettings(patch: Partial<TransitionSettings>): void {
    this.transitionSettings = { ...this.transitionSettings, ...patch };
  }

  getPreloadSettings(): PreloadSettings {
    return { ...this.preloadSettings };
  }

  setPreloadSettings(patch: Partial<PreloadSettings>): void {
    this.preloadSettings = { ...this.preloadSettings, ...patch };
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
    });
  }

  select(picked: PickedElement | undefined): void {
    const page = this.getCurrentPage();
    this.selection = picked && page ? { pageId: page.id, picked } : undefined;
    this.updateSelectionOutline();
    this.events.emit('selectionChange', this.selection);
  }

  clearSelection(): void {
    if (!this.selection) return;
    this.select(undefined);
  }

  /** Construit en arrière-plan la page cible d'un lien, sans l'afficher (SPEC §11.1). */
  preloadLink(link: LinkModel | undefined): void {
    if (link?.type !== 'page' || link.pageId === this.currentPageId) return;
    const page = this.document?.pages.find((p) => p.id === link.pageId);
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
    const target = this.document?.pages.find((p) => p.id === link.pageId);
    if (!target || target.id === page.id) return;

    const frame = page.shapes.find((s) => s.id === elementId)?.bounds ?? this.drawnBounds(elementId);
    this.history.push({ pageId: page.id, elementId, frame, camera: this.cameraState, targetPageId: target.id });
    this.events.emit('historyChange', this.history.entries());
    const at = Date.now();
    this.linkUsage[usageKey(page.id, target.id)] = at;
    this.events.emit('linkUsed', page.id, target.id, at);

    this.runTransition({
      direction: 'in',
      outer: page,
      inner: target,
      frame,
      destination:
        this.pageCameras.get(target.id) ??
        fitBounds(target.bounds, this.viewport, { rotation: this.cameraState.rotation }),
    });
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
      const pageName = this.document.pages.find((p) => p.id === entry.pageId)?.name ?? entry.pageId;
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
    const outer = this.document?.pages.find((p) => p.id === pageId);
    if (!inner || !outer) return;
    const destination = camera ?? fitBounds(outer.bounds, this.viewport, { rotation: this.cameraState.rotation });
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

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!frame || !this.transitionSettings.enabled || reduceMotion || this.transitionSettings.durationMs <= 0) {
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
    innerScene.root.visible = true;
    setPageTransform(innerScene.root, embedding);
    const innerAlpha = (fade: number) => (direction === 'in' ? fade : 1 - fade);
    setPageOpacity(innerScene.root, innerAlpha(0));
    setPageOpacity(outerScene.root, 1 - innerAlpha(0));
    this.applyCamera(startCamera);

    const ease = easing(this.transitionSettings.easing);
    const duration = this.transitionSettings.durationMs;
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
      this.scenes.show(to);
      this.applyCamera(destination);
      this.events.emit('pageChange', to);
      finish();
    };
    this.animation = requestAnimationFrame(step);
  }

  private handleClick(screen: Point): void {
    const picked = this.pickAt(screen);
    this.select(picked);
    if (this.preloadSettings.onClick) this.preloadLink(picked?.element.link);
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
    if (link && this.preloadSettings.onHover) {
      this.hoverTimer = setTimeout(() => this.preloadLink(link), this.preloadSettings.hoverDelayMs);
    }
  }

  private describeLink(link: LinkModel): string {
    if (link.type === 'url') return `${link.href} (double-clic : ouvrir dans un nouvel onglet)`;
    const name = this.document?.pages.find((p) => p.id === link.pageId)?.name;
    return name ? `Double-clic : aller à « ${name} »` : `Lien vers une page absente (${link.pageId})`;
  }

  private sceneObject(elementId: string) {
    return this.scenes.current?.root.children.find((c) => c.userData.elementId === elementId);
  }

  private updateSelectionOutline(): void {
    if (this.selectionObject) {
      this.selectionObject.parent?.remove(this.selectionObject);
      disposeObject(this.selectionObject);
      this.selectionObject = undefined;
    }
    const selection = this.selection;
    const root = this.scenes.current?.root;
    if (selection && root && selection.pageId === this.currentPageId) {
      const { picked } = selection;
      const bounds = picked.type === 'shape' ? picked.element.bounds : this.drawnBounds(picked.element.id);
      if (bounds) {
        this.selectionObject = selectionOutline(bounds, this.cameraState.zoom);
        root.add(this.selectionObject);
      }
    }
    this.requestRender();
  }

  on<K extends EngineEvent>(event: K, handler: (...args: EngineEvents[K]) => void): () => void {
    return this.events.on(event, handler);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.animation);
    clearTimeout(this.hoverTimer);
    this.transition?.abort();
    this.resizeObserver.disconnect();
    this.controller.dispose();
    this.scenes.clear();
    this.text.dispose();
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
