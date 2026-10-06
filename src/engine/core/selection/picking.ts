import { Matrix4, Box3, Vector3 } from 'three';
import { connectableShapes } from '../../edit/edgeEnds';
import { pageToScreen, screenToPage } from '../../interaction/camera';
import { pickElement, distanceToPolyline } from '../../interaction/pick';
import type { PickedElement } from '../../interaction/pick';
import type { Footprint } from '../../interaction/marquee';
import type { EdgeModel, Point, Rect, ShapeModel } from '../../model/types';
import type { EngineCore } from '../EngineCore';
import type { Object3D } from 'three';
import { insidePolygon } from '../../model/geometry';

/**
 * Ce qui est sous un point de l'écran (formes, flèches, textes de flèche) et passage écran ↔ page à une hauteur donnée.
 */
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
      pointAtHeight: (height) => this.groundPointAtHeight(screen, height),
      contains: (shape, p) => this.core.registry.contains(shape, p, () => this.shapeOutline(shape)),
      pickable: (shape) => this.core.registry.isPickable(shape),
      hitBounds: (shape) => this.core.registry.hitBounds(shape),
      standingHit: (shape) => this.standingHit(shape, screen),
    });
  }

  /**
   * Plan d'une silhouette debout (Actor en iso / 3D), tel qu'il fait face à la caméra : `toScreen` projette un point
   * de ce plan (x horizontal, y vers le haut) à l'écran, avec sa hauteur. `undefined` à plat ou pour une autre forme.
   */
  standingPlane(
    elementId: string,
  ): { silhouette: Object3D; toScreen: (p: Point) => Point & { height: number } } | undefined {
    const object = this.core.sceneView.sceneObject(elementId);
    if (this.core.scenes.current?.level !== 'iso' || !object?.userData.standing) return undefined;
    const silhouette = object.getObjectByName('silhouette');
    if (!silhouette) return undefined;
    // Tourné face à la caméra autour de la verticale (`render/billboard.ts`).
    const scale = this.core.levels.heightScale;
    const angle = silhouette.rotation.z;
    const toScreen = (p: Point) => {
      const height = (object.position.z + p.y) * scale;
      const at = this.screenOfPoint(
        {
          x: object.position.x + silhouette.position.x + p.x * Math.cos(angle),
          y: object.position.y + silhouette.position.y + p.x * Math.sin(angle),
        },
        height,
      );
      return { ...at, height };
    };
    return { silhouette, toScreen };
  }

  /**
   * Silhouette debout (acteur en iso / 3D) sous un point écran : une pièce pleine (la tête…), ou un trait du corps à la
   * tolérance de clic des flèches, tels qu'ils font face à la caméra. Renvoie la hauteur touchée ; `undefined` si la
   * forme n'est pas une silhouette debout.
   */
  private standingHit(shape: ShapeModel, screen: Point): { at: number | undefined } | undefined {
    const standing = this.standingPlane(shape.id);
    const parts = standing?.silhouette.userData.parts as Point[][] | undefined;
    const strokes = standing?.silhouette.userData.strokes as Point[][] | undefined;
    if (!standing || !parts || !strokes) return undefined;
    const { silhouette, toScreen } = standing;
    // Pancarte tenue devant le corps : prise sur toute sa surface, plus près de la caméra que le corps.
    const sign = silhouette.userData.sign as Rect | undefined;
    if (sign) {
      const { x, y, width, height } = sign;
      const corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
      if (insidePolygon(corners.map(toScreen), screen)) return { at: toScreen({ x: 0, y: y + height }).height };
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
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSq = dx * dx + dy * dy;
        const t =
          lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((screen.x - a.x) * dx + (screen.y - a.y) * dy) / lengthSq));
        const distance = Math.hypot(screen.x - (a.x + t * dx), screen.y - (a.y + t * dy));
        if (distance <= tolerance && (!best || distance < best.distance))
          best = { distance, height: a.height + (b.height - a.height) * t };
      }
    }
    return { at: best?.height };
  }

  /** Contour d'une forme (sa définition), mémorisé tant que ses bornes et son style ne changent pas. */
  private shapeOutline(shape: ShapeModel): Point[] | undefined {
    const cached = this.outlines.get(shape);
    if (cached && cached.bounds === shape.bounds && cached.style === shape.style) return cached.outline;
    const outline = this.core.registry.resolve(shape).definition.outline?.(shape);
    this.outlines.set(shape, { bounds: shape.bounds, style: shape.style, outline });
    return outline;
  }

  /** Emprise à l'écran d'un élément : base et dessus d'une forme, tracé d'une flèche. */
  screenFootprint(item: PickedElement): Footprint | undefined {
    const top = this.core.sceneView.elementTop(item.element.id);
    if (item.type === 'shape') {
      const { x, y, width, height } = item.element.bounds;
      const corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ];
      const heights = top === 0 ? [0] : [0, top];
      return { points: heights.flatMap((h) => corners.map((p) => this.screenOfPoint(p, h))), closed: true };
    }
    const route = this.core.sceneView.sceneObject(item.element.id)?.userData.route as Point[] | undefined;
    if (!route?.length) return undefined;
    return { points: route.map((p) => this.screenOfPoint(p, top)), closed: false };
  }

  /** Forme sous un point écran à laquelle on peut attacher une flèche (les flèches sont ignorées). */
  shapeAt(screen: Point, exclude?: string): ShapeModel | undefined {
    const page = this.core.pages.getCurrentPage();
    if (!page) return undefined;
    const connectable = new Set(connectableShapes(page, this.core.registry).map((s) => s.id));
    const picked = pickElement(
      { ...page, shapes: page.shapes.filter((s) => connectable.has(s.id) && s.id !== exclude), edges: [] },
      screenToPage(this.core.camera.state, this.core.display.viewport, screen),
      {
        edgeTolerance: 0,
        edgeRoute: () => undefined,
        heightOf: (id) => this.core.sceneView.elementTop(id),
        baseOf: (id) => this.core.sceneView.volumeBase(id),
        pointAtHeight: (height) => this.groundPointAtHeight(screen, height),
        contains: (shape, p) => this.core.registry.contains(shape, p, () => this.shapeOutline(shape)),
      },
    );
    return picked?.type === 'shape' ? picked.element : undefined;
  }

  /** Point écran d'un point de la page posé à `height` au-dessus du sol (inverse de `groundPointAtHeight`). */
  screenOfPoint(point: Point, height: number): Point {
    return pageToScreen(this.core.camera.state, this.core.display.viewport, point, height);
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
      const point = this.groundPointAtHeight(screen, this.core.sceneView.elementTop(edge.id));
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

  /**
   * Emprise à l'écran d'un élément de la page courante (formes : dessus du volume) ; `area` : une
   * partie de la forme en coordonnées page (sa zone de texte), à la place de ses bornes ; `elevation` :
   * hauteur de cette partie, à la place du dessus du volume.
   */
  screenRectOf(elementId: string, area?: Rect, elevation?: number): Rect | undefined {
    const page = this.core.pages.getCurrentPage();
    const shape = page?.shapes.find((s) => s.id === elementId);
    let corners: Point[];
    if (shape) {
      const { x, y, width, height } = area ?? shape.bounds;
      const top = elevation ?? this.core.sceneView.elementTop(shape.id);
      corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ].map((p) => this.screenOfPoint(p, top));
    } else {
      const route = this.core.sceneView.sceneObject(elementId)?.userData.route as Point[] | undefined;
      if (!route?.length) return undefined;
      const middle = route[Math.floor(route.length / 2)]!;
      const center = this.screenOfPoint(middle, this.core.sceneView.elementTop(elementId));
      return { x: center.x - 60, y: center.y - 16, width: 120, height: 32 };
    }
    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return { x: left, y: top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
  }

  /** Point de la page visé par un point écran, sur le plan horizontal à `height` au-dessus du sol. */
  groundPointAtHeight(screen: Point, height: number): Point {
    return screenToPage(this.core.camera.state, this.core.display.viewport, screen, height);
  }
}

/**
 * Boîte d'un texte dessiné (texte SDF mis en page, ou segments d'un texte riche), en coordonnées de
 * page ; undefined tant que la mise en page n'est pas prête.
 */
function drawnTextBox(object: Object3D, toPage: Matrix4): Box3 | undefined {
  const box = new Box3();
  object.traverse((child) => {
    const info = (child as Object3D & { textRenderInfo?: { blockBounds: [number, number, number, number] } })
      .textRenderInfo;
    if (!info) return;
    const [minX, minY, maxX, maxY] = info.blockBounds;
    for (const [x, y] of [
      [minX, minY],
      [maxX, minY],
      [minX, maxY],
      [maxX, maxY],
    ] as const) {
      box.expandByPoint(new Vector3(x, y, 0).applyMatrix4(child.matrixWorld).applyMatrix4(toPage));
    }
  });
  return box.isEmpty() ? undefined : box;
}

/** Coins (espace page) de chaque texte SDF dessiné sous `object` : une lettre tournée par quadrilatère. */
function drawnGlyphQuads(object: Object3D, toPage: Matrix4): Point[][] {
  const quads: Point[][] = [];
  object.traverse((child) => {
    const info = (child as Object3D & { textRenderInfo?: { blockBounds: [number, number, number, number] } })
      .textRenderInfo;
    if (!info) return;
    const [minX, minY, maxX, maxY] = info.blockBounds;
    quads.push(
      (
        [
          [minX, minY],
          [maxX, minY],
          [maxX, maxY],
          [minX, maxY],
        ] as const
      ).map(([x, y]) => {
        const v = new Vector3(x, y, 0).applyMatrix4(child.matrixWorld).applyMatrix4(toPage);
        return { x: v.x, y: v.y };
      }),
    );
  });
  return quads;
}

/** Point dans un polygone ou à moins de `margin` de son bord. */
function nearPolygon(polygon: Point[], p: Point, margin: number): boolean {
  return insidePolygon(polygon, p) || distanceToPolyline(p, [...polygon, polygon[0]!]) <= margin;
}
