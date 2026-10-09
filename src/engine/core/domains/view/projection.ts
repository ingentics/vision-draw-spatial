import { pageToScreen, screenToPage } from '../../interaction/cameraMath';
import type { PickedElement } from '../../interaction/pick';
import type { Footprint } from '../../interaction/marquee';
import type { Point, Rect } from '../../model/types';
import type { EngineCore } from '../EngineCore';
import type { Object3D } from 'three';
import { boundsOfPoints, rectPath } from '../../model/geometry';
import { standingFigure } from '../../render/standing';
import type { StandingFigure } from '../../render/standing';
import { shapeOf } from '../../model/pageIndex';

/** Emprise à l'écran prise pour un texte de flèche, dont seul le point est connu (px écran). */
export const EDGE_TEXT_BOX = { width: 120, height: 32 };

/**
 * Plan d'une silhouette debout tel qu'il fait face à la caméra : `toScreen` projette un point de ce plan (x horizontal,
 * y vers le haut) à l'écran, avec sa hauteur.
 */
export interface StandingPlane {
  silhouette: Object3D;
  figure: StandingFigure;
  toScreen: (p: Point) => Point & { height: number };
}

/** Passage page ↔ écran sur la page courante, à une hauteur donnée : points, emprises des éléments, silhouettes debout. */
export class ScreenProjection {
  constructor(private readonly core: EngineCore) {}

  /** Point écran d'un point de la page posé à `height` au-dessus du sol (inverse de `groundPointAtHeight`). */
  screenOfPoint(point: Point, height: number): Point {
    return pageToScreen(this.core.camera.state, this.core.display.viewport, point, height);
  }

  /** Point de la page visé par un point écran, sur le plan horizontal à `height` au-dessus du sol. */
  groundPointAtHeight(screen: Point, height: number): Point {
    return screenToPage(this.core.camera.state, this.core.display.viewport, screen, height);
  }

  /**
   * Emprise à l'écran d'un élément de la page courante (formes : dessus du volume) ; `area` : une
   * partie de la forme en coordonnées page (sa zone de texte), à la place de ses bornes ; `elevation` :
   * hauteur de cette partie, à la place du dessus du volume.
   */
  screenRectOf(elementId: string, area?: Rect, elevation?: number): Rect | undefined {
    const page = this.core.pages.getCurrentPage();
    const shape = shapeOf(page, elementId);
    if (shape) {
      const top = elevation ?? this.core.sceneView.elementTop(shape.id);
      return boundsOfPoints(rectPath(area ?? shape.bounds).map((p) => this.screenOfPoint(p, top)));
    }
    const route = this.core.sceneView.sceneObject(elementId)?.userData.route as Point[] | undefined;
    if (!route?.length) return undefined;
    const middle = route[Math.floor(route.length / 2)]!;
    const center = this.screenOfPoint(middle, this.core.sceneView.elementTop(elementId));
    return {
      x: center.x - EDGE_TEXT_BOX.width / 2,
      y: center.y - EDGE_TEXT_BOX.height / 2,
      ...EDGE_TEXT_BOX,
    };
  }

  /** Emprise à l'écran d'un élément : base et dessus d'une forme, tracé d'une flèche. */
  screenFootprint(item: PickedElement): Footprint | undefined {
    const top = this.core.sceneView.elementTop(item.element.id);
    if (item.type === 'shape') {
      const corners = rectPath(item.element.bounds);
      const heights = top === 0 ? [0] : [0, top];
      return { points: heights.flatMap((h) => corners.map((p) => this.screenOfPoint(p, h))), closed: true };
    }
    const route = this.core.sceneView.sceneObject(item.element.id)?.userData.route as Point[] | undefined;
    if (!route?.length) return undefined;
    return { points: route.map((p) => this.screenOfPoint(p, top)), closed: false };
  }

  /** Plan d'une silhouette debout (Actor en iso / 3D) ; `undefined` à plat ou pour une autre forme. */
  standingPlane(elementId: string): StandingPlane | undefined {
    const object = this.core.sceneView.sceneObject(elementId);
    const standing = this.core.scenes.current?.level === 'iso' ? standingFigure(object) : undefined;
    if (!object || !standing) return undefined;
    const { silhouette, figure } = standing;
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
    return { silhouette, figure, toScreen };
  }
}
