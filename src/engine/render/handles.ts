import { Color, Group } from 'three';
import { CONNECT_DIRECTIONS, connectSideOf, handlePoints, isConnectHandle } from '../edit/handles';
import type { Point, Rect } from '../model/types';
import { ellipsePath, rectPath } from './geometry/paths';
import { DEFAULT_ACCENT } from './decorations';
import { perimeterPolygon } from './edges/route';
import { orientedPath } from './geometry/orient';
import type { PerimeterKind } from './edges/route';
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
 * carrés blancs bordés de bleu pour redimensionner, disques bleus (flèche vers l'extérieur) pour connecter.
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
    if (isConnectHandle(kind)) {
      if (!options.connect) continue;
      const square = { x: point.x - r * 1.5, y: point.y - r * 1.5, width: 3 * r, height: 3 * r };
      group.add(fillMesh(ellipsePath(square, 24), ACCENT, 1));
      // Flèche dessinée vers la droite puis tournée vers l'extérieur du côté de la poignée.
      const { direction: d } = CONNECT_DIRECTIONS[connectSideOf(kind)];
      const at = (along: number, across: number): Point => ({
        x: point.x + r * (along * d.x - across * d.y),
        y: point.y + r * (along * d.y + across * d.x),
      });
      const arrow: Point[] = [at(-0.7, 0), at(0.7, 0)];
      const head: Point[] = [at(0.1, -0.6), at(0.7, 0), at(0.1, 0.6)];
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

/**
 * Poignées des bouts d'une flèche sélectionnée : disque bleu si le bout est attaché à une forme,
 * blanc bordé de bleu s'il est libre (comme draw.io).
 */
export function edgeEndHandles(
  ends: Array<{ point: Point; attached: boolean }>,
  zoom: number,
  options: HandleStyle = {},
): Group {
  const group = new Group();
  group.name = 'edge-handles';
  const r = ((options.size ?? HANDLE_SIZE) * 1.25) / zoom;
  const accent = new Color(options.accent ?? DEFAULT_ACCENT);
  for (const { point, attached } of ends) {
    const disc = ellipsePath({ x: point.x - r, y: point.y - r, width: 2 * r, height: 2 * r }, 24);
    group.add(fillMesh(disc, attached ? accent : WHITE, 1));
    const outline = strokeMesh(disc, attached ? WHITE : accent, 1, { width: 1.2 / zoom, closed: true });
    if (outline) group.add(outline);
  }
  group.traverse((o) => {
    o.renderOrder = Number.MAX_SAFE_INTEGER;
  });
  return group;
}

/**
 * Repères d'accroche sur la forme visée par un bout de flèche : périmètre d'accroche surligné (attache auto) et
 * croix sur les points de connexion, celui retenu cerclé.
 */
export function connectionHints(
  shape: { bounds: Rect; perimeter: PerimeterKind; style?: Record<string, string> },
  points: Point[],
  zoom: number,
  options: { active?: number; outline: boolean; accent?: string },
): Group {
  const group = new Group();
  group.name = 'connection-hints';
  const accent = new Color(options.accent ?? DEFAULT_ACCENT);
  if (options.outline) {
    const path = perimeterPath(shape.bounds, shape.perimeter, shape.style ?? {});
    const outline = strokeMesh(path, accent, 0.8, { width: 3 / zoom, closed: true });
    if (outline) group.add(outline);
  }
  const c = 3.5 / zoom;
  points.forEach((p, index) => {
    for (const stroke of [
      [
        { x: p.x - c, y: p.y - c },
        { x: p.x + c, y: p.y + c },
      ],
      [
        { x: p.x - c, y: p.y + c },
        { x: p.x + c, y: p.y - c },
      ],
    ]) {
      const mesh = strokeMesh(stroke, accent, 1, { width: 1.5 / zoom, closed: false });
      if (mesh) group.add(mesh);
    }
    if (index === options.active) {
      const r = 7 / zoom;
      const ring = strokeMesh(ellipsePath({ x: p.x - r, y: p.y - r, width: 2 * r, height: 2 * r }, 24), accent, 1, {
        width: 2 / zoom,
        closed: true,
      });
      if (ring) group.add(ring);
    }
  });
  group.traverse((o) => {
    o.renderOrder = Number.MAX_SAFE_INTEGER;
  });
  return group;
}

/**
 * Poignées entre les bouts d'une flèche (segments, coude, points) : carrés blancs bordés de bleu, ceux
 * en transparence (poignées virtuelles, milieux d'un tracé droit) à 40 %, comme draw.io.
 */
export function edgePointHandles(
  handles: Array<{ point: Point; faded?: boolean }>,
  zoom: number,
  options: HandleStyle = {},
): Group {
  const group = new Group();
  group.name = 'edge-point-handles';
  const r = (options.size ?? HANDLE_SIZE) / zoom;
  const accent = new Color(options.accent ?? DEFAULT_ACCENT);
  for (const { point, faded } of handles) {
    const opacity = faded ? 0.4 : 1;
    const square = rectPath({ x: point.x - r, y: point.y - r, width: 2 * r, height: 2 * r });
    group.add(fillMesh(square, WHITE, opacity));
    const outline = strokeMesh(square, accent, opacity, { width: 1.2 / zoom, closed: true });
    if (outline) group.add(outline);
  }
  group.traverse((o) => {
    o.renderOrder = Number.MAX_SAFE_INTEGER;
  });
  return group;
}

/** Périmètre d'accroche des flèches (celui de `route`), à surligner. */
function perimeterPath(bounds: Rect, perimeter: PerimeterKind, style: Record<string, string>): Point[] {
  const polygon = perimeterPolygon(perimeter, bounds, style);
  if (polygon) return polygon.slice(0, -1);
  if (perimeter === 'ellipse') return ellipsePath(bounds, 64);
  if (perimeter === 'rectangle') return rectPath(bounds);
  if (perimeter === 'triangle')
    return orientedPath(bounds, style, (w, h) => [
      { x: 0, y: 0 },
      { x: w, y: h / 2 },
      { x: 0, y: h },
    ]);
  const { x, y, width: w, height: h } = bounds;
  return [
    { x: x + w / 2, y },
    { x: x + w, y: y + h / 2 },
    { x: x + w / 2, y: y + h },
    { x, y: y + h / 2 },
  ];
}
