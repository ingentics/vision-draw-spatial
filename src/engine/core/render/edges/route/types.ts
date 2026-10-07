import type { Point, Rect } from '../../../model/types';

/** Types partagés du tracé des arêtes. */

/**
 * Périmètres de draw.io gérés (`rectanglePerimeter`, `ellipsePerimeter`, `rhombusPerimeter`,
 * `trianglePerimeter`, `hexagonPerimeter2`, `parallelogramPerimeter`, `stepPerimeter`).
 */
export type PerimeterKind = 'rectangle' | 'ellipse' | 'rhombus' | 'triangle' | 'hexagon' | 'parallelogram' | 'step';

export interface Terminal {
  bounds: Rect;
  /** Contour sur lequel les flèches s'accrochent (`perimeter` de draw.io) ; rectangle par défaut. */
  perimeter: PerimeterKind;
  /** Style de la forme (`portConstraint`, `perimeterSpacing`, `routingCenterX`…, `flipH` / `flipV`). */
  style?: Record<string, string>;
  /** Identifiant de la forme : une boucle relie une forme à elle-même. */
  id?: string;
}

/** Point d'attache imposé (`exitX`/`exitY`, `entryX`/`entryY`), relatif aux bornes de la forme. */
export interface Constraint {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export interface RouteInput {
  source?: Terminal;
  target?: Terminal;
  /** Extrémités libres, utilisées en l'absence de forme. */
  sourcePoint?: Point;
  targetPoint?: Point;
  waypoints: Point[];
  style: Record<string, string>;
}

export type RoutingKind =
  'straight' | 'orthogonal' | 'segment' | 'elbow' | 'sideToSide' | 'topToBottom' | 'entityRelation' | 'loop';
