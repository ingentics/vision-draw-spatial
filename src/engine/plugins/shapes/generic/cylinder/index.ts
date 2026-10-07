import {
  PART_ORDER,
  VERTEX_DEFAULTS,
  createBox,
  createLabel,
  cubicTo,
  dashPattern,
  strokeMesh,
  styleColor,
  styleFlag,
  styleNumber,
  styleOpacity,
} from '../../../../core/plugins';
import type { Point, Rect, SceneLevel, SceneRenderer, ShapeModel } from '../../../../core/plugins';

/**
 * Cylindre générique (SPEC §8.3) : tracés communs des formes de stockage, natives de draw.io, dessinées comme draw.io en 2D, et en
 * « bâtiments » en iso / 3D (toit plat rectangulaire avec le label, façade du type : `generic/building`) :
 * - BDD : `shape=cylinder3` (cylindre) ► corps arrondi cerclé ;
 * - queue : `shape=cylinder3;direction=south` (cylindre couché, bout visible à droite), ou
 *   `shape=mxgraph.flowchart.direct_data` (cylindre couché des organigrammes) ► chevrons de flux ;
 * - cache distribué : `shape=datastore` (cylindre à anneaux) ► tranches et voyants, une par nœud.
 *
 * Les trois ont la même ellipse, de taille fixe (`CYLINDER_RING`) : au redimensionnement, le corps du
 * cylindre s'étire, pas les ellipses. Écarts volontaires avec draw.io (choix produit) : draw.io
 * agrandit les anneaux du cache avec sa hauteur, et dessine l'ellipse du `cylinder3` de hauteur
 * `size` ; les deux sont identiques ici et dans draw.io avec les valeurs de la palette.
 */

/** Tracé 2D d'un cylindre : silhouette (remplie, bordée), lèvres (traits seuls), zone du label. */
export interface CylinderDrawing {
  silhouette: Point[];
  lips: Point[][];
  label: Rect;
}

// ---------------------------------------------------------------------------
// Tracés draw.io (mêmes courbes que `redrawPath` dans draw.io)

/** Corps commun des cylindres draw.io : ellipse du haut et arrondi du bas de hauteur `dy`. */
export function cylinderSilhouette({ x, y, width: w, height: h }: Rect, dy: number): Point[] {
  const start = { x, y: y + dy };
  const top = cubicTo(start, { x, y: y - dy / 3 }, { x: x + w, y: y - dy / 3 }, { x: x + w, y: y + dy });
  const bottomStart = { x: x + w, y: y + h - dy };
  const bottom = cubicTo(bottomStart, { x: x + w, y: y + h + dy / 3 }, { x, y: y + h + dy / 3 }, { x, y: y + h - dy });
  return [start, ...top, bottomStart, ...bottom];
}

/** Lèvre avant de l'ellipse du haut, décalée de `offset` vers le bas. */
export function cylinderLip({ x, y, width: w }: Rect, dy: number, offset = 0): Point[] {
  const start = { x, y: y + dy + offset };
  return [
    start,
    ...cubicTo(
      start,
      { x, y: y + 2 * dy + offset },
      { x: x + w, y: y + 2 * dy + offset },
      { x: x + w, y: y + dy + offset },
    ),
  ];
}

/**
 * Hauteur de l'ellipse des cylindres (BDD, queue, cache) : celle de draw.io pour un cache de 60 px de
 * haut, fixe au redimensionnement (plus l'épaisseur du trait, comme draw.io pour le cache).
 */
export const CYLINDER_RING = 8;

export const ringHeight = (style: Record<string, string>) => CYLINDER_RING + styleNumber(style, 'strokeWidth', 1) - 1;

// ---------------------------------------------------------------------------
// `shape=cylinder3` : debout (BDD) ou couché (queue)

/** Orientation draw.io (`direction`) : `east` = debout (défaut), les autres tournent la forme. */
export type Direction = 'east' | 'south' | 'west' | 'north';

export function directionOf(style: Record<string, string>): Direction {
  const value = style.direction;
  return value === 'south' || value === 'west' || value === 'north' ? value : 'east';
}

/** Couché (`south` : bout visible à droite ; `north` : à gauche) : le cylindre suit la largeur. */
export const isLying = (shape: ShapeModel) => ['south', 'north'].includes(directionOf(shape.style));

/**
 * Tracé d'une forme orientée, comme draw.io : dessinée debout dans un cadre local (largeur et
 * hauteur échangées si elle est couchée), puis tournée dans ses bornes (`south` = quart de tour
 * horaire : le haut du cylindre passe à droite).
 */
function oriented(bounds: Rect, direction: Direction, draw: (local: Rect) => CylinderDrawing): CylinderDrawing {
  if (direction === 'east') return draw(bounds);
  const lying = direction === 'south' || direction === 'north';
  const local = {
    x: 0,
    y: 0,
    width: lying ? bounds.height : bounds.width,
    height: lying ? bounds.width : bounds.height,
  };
  const { x, y, width: w, height: h } = bounds;
  const map = (p: Point): Point =>
    direction === 'south'
      ? { x: x + w - p.y, y: y + p.x }
      : direction === 'north'
        ? { x: x + p.y, y: y + h - p.x }
        : { x: x + w - p.x, y: y + h - p.y };
  const drawing = draw(local);
  const corners = [
    map({ x: drawing.label.x, y: drawing.label.y }),
    map({ x: drawing.label.x + drawing.label.width, y: drawing.label.y + drawing.label.height }),
  ];
  const left = Math.min(corners[0]!.x, corners[1]!.x);
  const top = Math.min(corners[0]!.y, corners[1]!.y);
  return {
    silhouette: drawing.silhouette.map(map),
    lips: drawing.lips.map((lip) => lip.map(map)),
    label: {
      x: left,
      y: top,
      width: Math.max(corners[0]!.x, corners[1]!.x) - left,
      height: Math.max(corners[0]!.y, corners[1]!.y) - top,
    },
  };
}

/** Zone du label d'un cylindre debout : le corps (sans `top` en haut ni `bottom` en bas) si `boundedLbl=1`, sinon les bornes. */
function boundedLabel(bounds: Rect, style: Record<string, string>, top: number, bottom: number): Rect {
  if (!styleFlag(style, 'boundedLbl')) return bounds;
  return { ...bounds, y: bounds.y + top, height: Math.max(0, bounds.height - top - bottom) };
}

/**
 * `shape=cylinder3` (BDD ; couché par `direction` : queue) : le tracé du cache avec une seule lèvre.
 * L'ellipse a toujours la taille de celle du cache (choix produit) : draw.io, lui, la dessine de
 * hauteur `size` (15 par défaut). La palette crée les cylindres avec `size=8`, identiques dans draw.io.
 */
export function cylinder3Drawing(shape: ShapeModel): CylinderDrawing {
  const { style } = shape;
  return oriented(shape.bounds, directionOf(style), (bounds) => {
    const dy = Math.max(0, Math.min(bounds.height / 2, ringHeight(style)));
    // `boundedLbl=1` : le label reste dans le corps, sous l'ellipse du haut (marges de draw.io).
    return {
      silhouette: cylinderSilhouette(bounds, dy),
      lips: [cylinderLip(bounds, dy)],
      label: boundedLabel(bounds, style, Math.min(bounds.height, 2 * dy), 0.3 * dy),
    };
  });
}

// ---------------------------------------------------------------------------
// Rendus

/** 2D : silhouette (fond, bordure), lèvres avec le style de la bordure, label dans sa zone. */
export function cylinderFlat(drawing: (shape: ShapeModel) => CylinderDrawing): SceneRenderer {
  return {
    create(shape, ctx) {
      const { silhouette, lips, label } = drawing(shape);
      const box = createBox({ ...shape, label: '' }, silhouette, ctx, VERTEX_DEFAULTS);
      const color = styleColor(shape.style, 'strokeColor', VERTEX_DEFAULTS.stroke);
      const width = styleNumber(shape.style, 'strokeWidth', 1);
      if (color && width > 0) {
        for (const lip of lips) {
          const mesh = strokeMesh(lip, color, styleOpacity(shape.style, 'strokeOpacity'), {
            width,
            closed: false,
            dash: dashPattern(shape.style, width),
          });
          if (!mesh) continue;
          mesh.name = 'stroke-lip';
          mesh.renderOrder = PART_ORDER.stroke;
          box.add(mesh);
        }
      }
      const text = createLabel(shape, ctx, shape.label, label);
      if (text) box.add(text);
      return box;
    },
  };
}

/** Zone du texte : celle du tracé en 2D ; en iso, le toit du bâtiment (les bornes). */
export const flatTextZone =
  (drawing: (shape: ShapeModel) => CylinderDrawing) =>
  (shape: ShapeModel, level: SceneLevel): Rect =>
    level === 'flat' ? drawing(shape).label : shape.bounds;
