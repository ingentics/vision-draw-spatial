import { Color, Group } from 'three';
import { handlePoints } from '../edit/handles';
import type { Point, Rect } from '../model/types';
import { ellipsePath, rectPath } from './geometry/paths';
import { DEFAULT_ACCENT } from './decorations';
import { fillMesh, strokeMesh } from './meshes';

const WHITE = new Color('#ffffff');
/** Demi-côté des poignées par défaut, en pixels écran (paramètre `edit.handleSize`). */
const HANDLE_SIZE = 4;

export interface HandleStyle {
  /** Demi-côté des poignées, en pixels écran. */
  size?: number;
  /** Couleur d'accent (#rrggbb). */
  accent?: string;
}

/**
 * Poignées de la sélection, de taille constante à l'écran (reconstruites quand le zoom change) :
 * carrés blancs bordés de bleu pour redimensionner, disque bleu pour connecter.
 */
export function selectionHandles(
  bounds: Rect,
  zoom: number,
  options: { resize: boolean; connect: boolean } & HandleStyle,
): Group {
  const group = new Group();
  group.name = 'handles';
  const r = (options.size ?? HANDLE_SIZE) / zoom;
  const ACCENT = new Color(options.accent ?? DEFAULT_ACCENT);
  for (const { kind, point } of handlePoints(bounds, zoom)) {
    if (kind === 'connect') {
      if (!options.connect) continue;
      const square = { x: point.x - r * 1.5, y: point.y - r * 1.5, width: 3 * r, height: 3 * r };
      group.add(fillMesh(ellipsePath(square, 24), ACCENT, 1));
      const arrow: Point[] = [
        { x: point.x - r * 0.7, y: point.y },
        { x: point.x + r * 0.7, y: point.y },
      ];
      const head: Point[] = [
        { x: point.x + r * 0.1, y: point.y - r * 0.6 },
        { x: point.x + r * 0.7, y: point.y },
        { x: point.x + r * 0.1, y: point.y + r * 0.6 },
      ];
      for (const stroke of [arrow, head]) {
        const mesh = strokeMesh(stroke, WHITE, 1, { width: 1.3 / zoom, closed: false });
        if (mesh) group.add(mesh);
      }
    } else if (options.resize) {
      const square = { x: point.x - r, y: point.y - r, width: 2 * r, height: 2 * r };
      group.add(fillMesh(rectPath(square), WHITE, 1));
      const outline = strokeMesh(rectPath(square), ACCENT, 1, { width: 1.2 / zoom, closed: true });
      if (outline) group.add(outline);
    }
  }
  group.traverse((o) => {
    o.renderOrder = Number.MAX_SAFE_INTEGER;
  });
  return group;
}

/** Trait d'aperçu d'un connecteur en cours de création. */
export function connectorPreview(from: Point, to: Point, zoom: number, accent = DEFAULT_ACCENT): Group {
  const group = new Group();
  group.name = 'connector-preview';
  const line = strokeMesh([from, to], new Color(accent), 1, {
    width: 1.5 / zoom,
    closed: false,
    dash: [6 / zoom, 4 / zoom],
  });
  if (line) group.add(line);
  group.traverse((o) => {
    o.renderOrder = Number.MAX_SAFE_INTEGER;
  });
  return group;
}
