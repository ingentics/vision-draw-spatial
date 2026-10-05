import type { PageModel, Point, Rect, ShapeModel } from '../model/types';
import type { MinimapMapping } from '../shapes/types';
import { screenToPage } from './camera';
import type { CameraState, Viewport } from './camera';

/**
 * Mini-carte (SPEC §10) : en bas à droite, toujours en vue de dessus et nord en haut, quel que
 * soit le mode de la vue principale. Emprise de la vue, clic/glisser pour déplacer la caméra.
 * Dessinée en Canvas 2D, indépendamment du rendu WebGL. Chaque forme est dessinée par le niveau
 * `minimap` de sa définition (repli : son contour), voir `shapes/`.
 */

export interface MinimapLayout {
  /** Taille du canvas de la mini-carte, en pixels CSS. */
  width: number;
  height: number;
  /** Pixels mini-carte par pixel de page. */
  scale: number;
  /** Position (mini-carte) de l'origine de la page. */
  offset: Point;
}

const PADDING = 8;
const MIN_HEIGHT = 70;

/**
 * Disposition : largeur fixe (`size`), hauteur selon les proportions de la page (bornée),
 * page centrée avec une marge.
 */
export function minimapLayout(bounds: Rect, size: number): MinimapLayout {
  const width = size;
  const aspect = bounds.width > 0 ? bounds.height / bounds.width : 0.75;
  const height = Math.round(Math.min(size, Math.max(MIN_HEIGHT, (size - 2 * PADDING) * aspect + 2 * PADDING)));
  const available = { width: width - 2 * PADDING, height: height - 2 * PADDING };
  const scale =
    bounds.width > 0 || bounds.height > 0
      ? Math.min(available.width / Math.max(bounds.width, 1e-6), available.height / Math.max(bounds.height, 1e-6))
      : 1;
  const offset = {
    x: width / 2 - (bounds.x + bounds.width / 2) * scale,
    y: height / 2 - (bounds.y + bounds.height / 2) * scale,
  };
  return { width, height, scale, offset };
}

export function pageToMinimap(layout: MinimapLayout, p: Point): Point {
  return { x: layout.offset.x + p.x * layout.scale, y: layout.offset.y + p.y * layout.scale };
}

export function minimapToPage(layout: MinimapLayout, p: Point): Point {
  return { x: (p.x - layout.offset.x) / layout.scale, y: (p.y - layout.offset.y) / layout.scale };
}

/**
 * Emprise de la vue principale au sol : les quatre coins de l'écran projetés sur la page.
 * Rectangle en vue de dessus ; en iso (caméra orthographique inclinée), rectangle tourné et allongé.
 */
export function viewFootprint(camera: CameraState, viewport: Viewport): Point[] {
  return [
    { x: 0, y: 0 },
    { x: viewport.width, y: 0 },
    { x: viewport.width, y: viewport.height },
    { x: 0, y: viewport.height },
  ].map((corner) => screenToPage(camera, viewport, corner));
}

export interface MinimapSource {
  getPage(): PageModel | undefined;
  getCamera(): CameraState;
  getViewport(): Viewport;
  /** Couleur du fond de la vue (blanc par défaut). */
  getBackground?(): string;
  /** Couleur d'accent (cadre de la vue), #rrggbb. */
  getAccent?(): string;
  /** Couleurs du fond de carte (#rrggbb) : flèches, contour des formes, formes non supportées. */
  getColors?(): { edge: string; outline: string; placeholder: string };
  /** Tracé dessiné d'une arête (coordonnées page). */
  getEdgeRoute(edgeId: string): Point[] | undefined;
  /** Dessin d'une forme : niveau `minimap` de sa définition, repli sur son contour. */
  paintShape(context: CanvasRenderingContext2D, shape: ShapeModel, map: MinimapMapping): void;
  /** Recentre la vue principale sur un point de la page. */
  centerOn(point: Point): void;
}

/** Couleur du cadre de la vue par défaut ; son remplissage en est une version transparente. */
const FOOTPRINT_STROKE = '#1a73e8';
const BACKGROUND = '#ffffff';
/** Trait des flèches par défaut (paramètre `minimap.edgeColor`). */
const EDGE_STROKE = '#80868b';

export class Minimap {
  private layout: MinimapLayout | undefined;
  private base: HTMLCanvasElement | undefined;
  private basePageId: string | undefined;
  private dragging: number | undefined;
  private frame = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly source: MinimapSource,
    private size = 200,
  ) {
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'pointer';
  }

  setSize(size: number): void {
    this.size = size;
    this.invalidate();
  }

  /** Le contenu de la page a changé (autre page, autre fichier) : redessiner le fond. */
  invalidate(): void {
    this.basePageId = undefined;
    this.requestDraw();
  }

  /** La caméra a bougé : redessiner l'emprise (le fond est en cache). */
  requestDraw(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.draw();
    });
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
  }

  /** Dessin immédiat (tests, captures). */
  draw(): void {
    const page = this.source.getPage();
    const context = this.canvas.getContext('2d');
    if (!context) return;
    const dpr = window.devicePixelRatio || 1;

    if (!page) {
      context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }
    if (this.basePageId !== page.id || !this.base || !this.layout) {
      this.layout = minimapLayout(page.bounds, this.size);
      this.canvas.style.width = `${this.layout.width}px`;
      this.canvas.style.height = `${this.layout.height}px`;
      this.canvas.width = Math.round(this.layout.width * dpr);
      this.canvas.height = Math.round(this.layout.height * dpr);
      this.base = this.renderBase(page, this.layout, dpr);
      this.basePageId = page.id;
    }

    const layout = this.layout;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.drawImage(this.base, 0, 0);

    // Emprise de la vue principale.
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const footprint = viewFootprint(this.source.getCamera(), this.source.getViewport()).map((p) =>
      pageToMinimap(layout, p),
    );
    context.beginPath();
    footprint.forEach((p, i) => (i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y)));
    context.closePath();
    const accent = this.source.getAccent?.() ?? FOOTPRINT_STROKE;
    context.globalAlpha = 0.1;
    context.fillStyle = accent;
    context.fill();
    context.globalAlpha = 1;
    context.lineWidth = 1.5;
    context.strokeStyle = accent;
    context.stroke();
  }

  /** Fond de la mini-carte : formes simplifiées (remplissage + contour fin) et arêtes en traits. */
  private renderBase(page: PageModel, layout: MinimapLayout, dpr: number): HTMLCanvasElement {
    const base = document.createElement('canvas');
    base.width = Math.round(layout.width * dpr);
    base.height = Math.round(layout.height * dpr);
    const context = base.getContext('2d')!;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = this.source.getBackground?.() ?? BACKGROUND;
    context.fillRect(0, 0, layout.width, layout.height);

    const hidden = new Set(page.layers.filter((l) => !l.visible).map((l) => l.id));
    const colors = this.source.getColors?.();
    const map: MinimapMapping = { toMinimap: (p) => pageToMinimap(layout, p), scale: layout.scale, colors };
    const edgeColor = colors?.edge ?? EDGE_STROKE;
    const elements = [
      ...page.shapes.map((shape) => ({ element: shape, draw: () => this.source.paintShape(context, shape, map) })),
      ...page.edges.map((edge) => ({ element: edge, draw: () => this.drawEdge(context, layout, edge.id, edgeColor) })),
    ];
    elements
      .filter(({ element }) => element.visible && !hidden.has(element.layerId))
      .sort((a, b) => a.element.z - b.element.z)
      .forEach(({ draw }) => draw());
    return base;
  }

  private drawEdge(context: CanvasRenderingContext2D, layout: MinimapLayout, edgeId: string, color: string): void {
    const route = this.source.getEdgeRoute(edgeId);
    if (!route || route.length < 2) return;
    context.beginPath();
    route.forEach((p, i) => {
      const m = pageToMinimap(layout, p);
      if (i === 0) context.moveTo(m.x, m.y);
      else context.lineTo(m.x, m.y);
    });
    context.lineWidth = 0.75;
    context.strokeStyle = color;
    context.stroke();
  }

  // -------------------------------------------------------------------------
  // Clic et glisser : recentre la vue principale

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    this.dragging = event.pointerId;
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointeur synthétique : le glisser marche sans capture.
    }
    this.navigate(event);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.dragging === event.pointerId) this.navigate(event);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.dragging !== event.pointerId) return;
    this.dragging = undefined;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
  };

  private navigate(event: PointerEvent): void {
    if (!this.layout) return;
    const rect = this.canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    this.source.centerOn(minimapToPage(this.layout, point));
  }
}
