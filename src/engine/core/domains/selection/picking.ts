import { Matrix4 } from 'three';
import { connectableShapes } from '../../edit/edgeEnds';
import { screenToPage } from '../../interaction/cameraProjection';
import { pickElement, distanceToPolyline } from '../../interaction/pick';
import type { PickedElement } from '../../interaction/pick';
import type { EdgeModel, Point, Rect, ShapeModel } from '../../model/types';
import type { EngineCore } from '../EngineCore';
import { distance, insidePolygon, rectPath, segmentProjection } from '../../model/geometry';
import { drawnGlyphQuads, drawnTextBox } from '../../render/drawnText';

/**
 * Élément le plus proche d'un point écran, à `tolerance` pixels au plus (poignées, points d'ancrage) ; à distance égale,
 * le premier. `screenOf` place l'élément à l'écran ; `bias` ajoute des pixels à sa distance (départage, ex. une poignée
 * en transparence passe après une vraie).
 */
export function nearestOnScreen<T>(
  items: Iterable<T>,
  screenOf: (item: T) => Point,
  screen: Point,
  tolerance: number,
  bias?: (item: T) => number,
): T | undefined {
  let best: { item: T; distance: number } | undefined;
  for (const item of items) {
    const d = distance(screenOf(item), screen) + (bias?.(item) ?? 0);
    if (d <= tolerance && (!best || d < best.distance)) best = { item, distance: d };
  }
  return best?.item;
}

/** Ce qui est sous un point de l'écran : formes, flèches, textes de flèche (projection : `ScreenProjection`). */
export class Picking {
  /** Contours des formes pour le clic (`shapeOutline`). */
  private readonly outlines = new WeakMap<
    ShapeModel,
    { bounds: Rect; style: Record<string, string>; outline: Point[] | undefined }
  >();

  constructor(private readonly core: EngineCore) {}

  pickAt(screen: Point): PickedElement | undefined {
    const page = this.core.pages.getCurrentPage();
    if (!page) return undefined;
    // Texte d'une flèche, même placé loin d'elle : la flèche.
    const text = this.edgeTextAt(screen);
    if (text) return { type: 'edge', element: text.edge };
    const point = screenToPage(this.core.camera.state, this.core.display.viewport, screen);
    return pickElement(page, point, {
      edgeTolerance: this.core.settings.edit.edgePickTolerance / this.core.camera.state.zoom,
      edgeRoute: (id) => {
        const data = this.core.sceneView.sceneObject(id)?.userData;
        return (data?.path ?? data?.route) as Point[] | undefined;
      },
      // Flèche coupée : seuls ses tronçons se cliquent, sauf sélectionnée (son tracé complet).
      edgePieces: (id) =>
        this.core.selection.current?.items.some((item) => item.element.id === id)
          ? undefined
          : (this.core.sceneView.sceneObject(id)?.userData.splitPaths as Point[][] | undefined),
      heightOf: (id) => this.core.sceneView.elementTop(id),
      baseOf: (id) => this.core.sceneView.volumeBase(id),
      pointAtHeight: (height) => this.core.projection.groundPointAtHeight(screen, height),
      contains: (shape, p) => this.core.registry.contains(shape, p, () => this.shapeOutline(shape)),
      pickable: (shape) => this.core.registry.isPickable(shape),
      hitBounds: (shape) => this.core.registry.hitBounds(shape),
      standingHit: (shape) => this.standingHit(shape, screen),
    });
  }

  /**
   * Silhouette debout (acteur en iso / 3D) sous un point écran : une pièce pleine (la tête…), ou un trait du corps à la
   * tolérance de clic des flèches, tels qu'ils font face à la caméra. Renvoie la hauteur touchée ; `undefined` si la
   * forme n'est pas une silhouette debout.
   */
  private standingHit(shape: ShapeModel, screen: Point): { at: number | undefined } | undefined {
    const standing = this.core.projection.standingPlane(shape.id);
    if (!standing) return undefined;
    const { figure, toScreen } = standing;
    const { parts, strokes, sign } = figure;
    // Pancarte tenue devant le corps : prise sur toute sa surface, plus près de la caméra que le corps.
    if (sign) {
      if (insidePolygon(rectPath(sign).map(toScreen), screen))
        return { at: toScreen({ x: 0, y: sign.y + sign.height }).height };
    }
    for (const part of parts) {
      if (!insidePolygon(part.map(toScreen), screen)) continue;
      const ys = part.map((p) => p.y);
      return { at: toScreen({ x: 0, y: (Math.min(...ys) + Math.max(...ys)) / 2 }).height };
    }
    const tolerance = this.core.settings.edit.edgePickTolerance;
    let best: { distance: number; height: number } | undefined;
    for (const line of [...strokes, ...parts.map((part) => [...part, part[0]!])]) {
      const points = line.map(toScreen);
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]!;
        const b = points[i]!;
        const { t, point } = segmentProjection(screen, a, b);
        const gap = distance(screen, point);
        if (gap <= tolerance && (!best || gap < best.distance))
          best = { distance: gap, height: a.height + (b.height - a.height) * t };
      }
    }
    return { at: best?.height };
  }

  /** Contour d'une forme (sa définition), mémorisé tant que ses bornes et son style ne changent pas. */
  private shapeOutline(shape: ShapeModel): Point[] | undefined {
    const cached = this.outlines.get(shape);
    if (cached && cached.bounds === shape.bounds && cached.style === shape.style) return cached.outline;
    const outline = this.core.registry.outline(shape);
    this.outlines.set(shape, { bounds: shape.bounds, style: shape.style, outline });
    return outline;
  }

  /**
   * Forme sous un point écran à laquelle on peut attacher une flèche (les flèches sont ignorées) ; `accepts` : règle du
   * mode de la page (ex. liaisons permises du mode RDD).
   */
  shapeAt(screen: Point, accepts?: (shape: ShapeModel) => boolean): ShapeModel | undefined {
    const page = this.core.pages.getCurrentPage();
    if (!page) return undefined;
    const connectable = new Set(connectableShapes(page, this.core.registry).map((s) => s.id));
    const picked = pickElement(
      { ...page, shapes: page.shapes.filter((s) => connectable.has(s.id) && (!accepts || accepts(s))), edges: [] },
      screenToPage(this.core.camera.state, this.core.display.viewport, screen),
      {
        edgeTolerance: 0,
        edgeRoute: () => undefined,
        heightOf: (id) => this.core.sceneView.elementTop(id),
        baseOf: (id) => this.core.sceneView.volumeBase(id),
        pointAtHeight: (height) => this.core.projection.groundPointAtHeight(screen, height),
        contains: (shape, p) => this.core.registry.contains(shape, p, () => this.shapeOutline(shape)),
      },
    );
    return picked?.type === 'shape' ? picked.element : undefined;
  }

  /**
   * Texte de flèche sous un point écran (sa boîte de texte dessinée, où qu'il soit placé) : le plus
   * haut dans l'ordre de dessin. Cliquer un texte éloigné de sa flèche la sélectionne.
   */
  edgeTextAt(screen: Point): { edge: EdgeModel; cellId: string } | undefined {
    const page = this.core.pages.getCurrentPage();
    const root = this.core.scenes.current?.root;
    if (!page || !root) return undefined;
    root.updateMatrixWorld();
    const toPage = new Matrix4().copy(root.matrixWorld).invert();
    const padding = 2 / this.core.camera.state.zoom;
    for (const edge of [...page.edges].reverse()) {
      const object = this.core.sceneView.sceneObject(edge.id);
      if (!object?.visible) continue;
      const point = this.core.projection.groundPointAtHeight(screen, this.core.sceneView.elementTop(edge.id));
      let hit: string | undefined;
      object.traverse((child) => {
        const cellId = child.userData.labelCellId as string | undefined;
        if (hit || !cellId || !child.visible) return;
        // Texte le long du trait : la boîte tournée de chaque lettre (un coude ne fait pas une grande zone).
        if (child.userData.alongPath) {
          if (drawnGlyphQuads(child, toPage).some((quad) => nearPolygon(quad, point, padding))) hit = cellId;
          return;
        }
        const box = drawnTextBox(child, toPage);
        if (
          box &&
          point.x >= box.min.x - padding &&
          point.x <= box.max.x + padding &&
          point.y >= box.min.y - padding &&
          point.y <= box.max.y + padding
        )
          hit = cellId;
      });
      if (hit) return { edge, cellId: hit };
    }
    return undefined;
  }
}

/** Point dans un polygone ou à moins de `margin` de son bord. */
function nearPolygon(polygon: Point[], p: Point, margin: number): boolean {
  return insidePolygon(polygon, p) || distanceToPolyline(p, [...polygon, polygon[0]!]) <= margin;
}
