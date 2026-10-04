import type { Point, Rect, ShapeModel } from '../../model/types';
import { createBox, createLabel, VERTEX_DEFAULTS } from '../flat/box';
import { cubicTo, halfEllipseTo } from '../geometry/curves';
import { dashPattern } from '../geometry/stroke';
import { isoCache, isoDatabase, isoQueue } from '../iso/buildings';
import { strokeMesh } from '../meshes';
import { styleColor, styleNumber, styleOpacity } from '../styleValues';
import { PART_ORDER } from '../types';
import type { SceneLevel, SceneRenderer, ShapeDefinition } from './types';

/**
 * Formes de stockage (SPEC §8.3), natives de draw.io, dessinées comme draw.io en 2D, et en
 * « bâtiments » en iso / 3D (toit plat rectangulaire avec le label, façade du type : `iso/buildings`) :
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
interface CylinderDrawing {
  silhouette: Point[];
  lips: Point[][];
  label: Rect;
}

// ---------------------------------------------------------------------------
// Tracés draw.io (mêmes courbes que `redrawPath` dans draw.io)

/** Corps commun des cylindres draw.io : ellipse du haut et arrondi du bas de hauteur `dy`. */
function cylinderSilhouette({ x, y, width: w, height: h }: Rect, dy: number): Point[] {
  const start = { x, y: y + dy };
  const top = cubicTo(start, { x, y: y - dy / 3 }, { x: x + w, y: y - dy / 3 }, { x: x + w, y: y + dy });
  const bottomStart = { x: x + w, y: y + h - dy };
  const bottom = cubicTo(bottomStart, { x: x + w, y: y + h + dy / 3 }, { x, y: y + h + dy / 3 }, { x, y: y + h - dy });
  return [start, ...top, bottomStart, ...bottom];
}

/** Lèvre avant de l'ellipse du haut, décalée de `offset` vers le bas. */
function cylinderLip({ x, y, width: w }: Rect, dy: number, offset = 0): Point[] {
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

/** Orientation draw.io (`direction`) : `east` = debout (défaut), les autres tournent la forme. */
type Direction = 'east' | 'south' | 'west' | 'north';

function directionOf(style: Record<string, string>): Direction {
  const value = style.direction;
  return value === 'south' || value === 'west' || value === 'north' ? value : 'east';
}

/** Couché (`south` : bout visible à droite ; `north` : à gauche) : le cylindre suit la largeur. */
const isLying = (shape: ShapeModel) => ['south', 'north'].includes(directionOf(shape.style));

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

/**
 * Hauteur de l'ellipse des cylindres (BDD, queue, cache) : celle de draw.io pour un cache de 60 px de
 * haut, fixe au redimensionnement (plus l'épaisseur du trait, comme draw.io pour le cache).
 */
export const CYLINDER_RING = 8;

const ringHeight = (style: Record<string, string>) => CYLINDER_RING + styleNumber(style, 'strokeWidth', 1) - 1;

/** Zone du label d'un cylindre debout : le corps (sans `top` en haut ni `bottom` en bas) si `boundedLbl=1`, sinon les bornes. */
function boundedLabel(bounds: Rect, style: Record<string, string>, top: number, bottom: number): Rect {
  if (style.boundedLbl !== '1') return bounds;
  return { ...bounds, y: bounds.y + top, height: Math.max(0, bounds.height - top - bottom) };
}

/**
 * `shape=cylinder3` (BDD ; couché par `direction` : queue) : le tracé du cache avec une seule lèvre.
 * L'ellipse a toujours la taille de celle du cache (choix produit) : draw.io, lui, la dessine de
 * hauteur `size` (15 par défaut). La palette crée les cylindres avec `size=8`, identiques dans draw.io.
 */
function cylinder3Drawing(shape: ShapeModel): CylinderDrawing {
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

/**
 * `shape=datastore` : ellipse de taille fixe, trois lèvres (les anneaux). Le label est toujours dans le
 * corps, sous les anneaux (2,5 × l'ellipse en haut), comme draw.io, qui ignore `boundedLbl` ici.
 */
function datastoreDrawing(shape: ShapeModel): CylinderDrawing {
  const { bounds, style } = shape;
  const dy = Math.max(0, Math.min(bounds.height / 2, ringHeight(style)));
  return {
    silhouette: cylinderSilhouette(bounds, dy),
    lips: [0, dy / 2, dy].map((offset) => cylinderLip(bounds, dy, offset)),
    label: {
      ...bounds,
      y: bounds.y + Math.min(bounds.height, 2.5 * dy),
      height: Math.max(0, bounds.height - 2.5 * dy),
    },
  };
}

/** `shape=mxgraph.flowchart.direct_data` : cylindre couché, bouts arrondis sur 9/98 de la largeur (draw.io), bout droit visible. */
function directDataDrawing(shape: ShapeModel): CylinderDrawing {
  const { x, y, width: w, height: h } = shape.bounds;
  const rx = Math.min((w * 9) / 98, w / 2);
  const topRight = { x: x + w - rx, y };
  const bottomLeft = { x: x + rx, y: y + h };
  return {
    silhouette: [
      { x: x + rx, y },
      topRight,
      ...halfEllipseTo(topRight, { x: x + w - rx, y: y + h }, rx, 1),
      bottomLeft,
      ...halfEllipseTo(bottomLeft, { x: x + rx, y }, rx, -1),
    ],
    // Bord intérieur du bout droit : la face d'entrée de la file.
    lips: [[topRight, ...halfEllipseTo(topRight, { x: x + w - rx, y: y + h }, rx, -1)]],
    label: shape.bounds,
  };
}

// ---------------------------------------------------------------------------
// Rendus

/** 2D : silhouette (fond, bordure), lèvres avec le style de la bordure, label dans sa zone. */
function cylinderFlat(drawing: (shape: ShapeModel) => CylinderDrawing): SceneRenderer {
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
      const text = createLabel({ ...shape, bounds: label }, ctx);
      if (text) box.add(text);
      return box;
    },
  };
}

/** Zone du texte : celle du tracé en 2D ; en iso, le toit du bâtiment (les bornes). */
const flatTextZone =
  (drawing: (shape: ShapeModel) => CylinderDrawing) =>
  (shape: ShapeModel, level: SceneLevel): Rect =>
    level === 'flat' ? drawing(shape).label : shape.bounds;

// ---------------------------------------------------------------------------
// Définitions

const cylinder3Outline = (shape: ShapeModel) => cylinder3Drawing(shape).silhouette;
const cylinder3Flat = cylinderFlat(cylinder3Drawing);

const database = isoDatabase(cylinder3Flat);
const queue = isoQueue(cylinder3Flat, (shape) => directionOf(shape.style) === 'north');

/**
 * BDD (debout) et queue (couché, `direction=south` / `north`) : cylindre draw.io ; en iso, cylindre
 * debout sur l'ellipse inscrite dans l'emprise, ou demi-cylindre couché dans le sens de la largeur.
 */
export const cylinderShape: ShapeDefinition = {
  kind: 'cylinder3',
  outline: cylinder3Outline,
  flat: cylinder3Flat,
  textZone: flatTextZone(cylinder3Drawing),
  iso: { create: (shape, ctx) => (isLying(shape) ? queue : database).create(shape, ctx) },
};

const datastoreFlat = cylinderFlat(datastoreDrawing);

/** Cache distribué : cylindre à anneaux draw.io ; en iso, pile de disques (un par nœud). */
export const datastoreShape: ShapeDefinition = {
  kind: 'datastore',
  outline: (shape) => datastoreDrawing(shape).silhouette,
  flat: datastoreFlat,
  textZone: flatTextZone(datastoreDrawing),
  iso: isoCache(datastoreFlat),
};

const directDataFlat = cylinderFlat(directDataDrawing);

/** Queue : « Direct Data » des organigrammes draw.io ; en iso, demi-cylindre couché dans le sens de la largeur. */
export const directDataShape: ShapeDefinition = {
  kind: 'mxgraph.flowchart.direct_data',
  outline: (shape) => directDataDrawing(shape).silhouette,
  flat: directDataFlat,
  iso: isoQueue(directDataFlat, () => false),
};
