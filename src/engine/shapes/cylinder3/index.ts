import type { Point, Rect, ShapeModel } from '../../model/types';
import { isoQueue, QUEUE_TAG } from '../utils/queue';
import { tagProperty } from '../utils/building';
import type { CylinderDrawing } from '../utils/cylinder';
import { cylinderFlat, cylinderLip, cylinderSilhouette, flatTextZone, ringHeight } from '../utils/cylinder';
import type { ShapeDefinition } from '../types';
import { DATABASE_TAG, isoDatabase } from './database';

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

// ---------------------------------------------------------------------------
// Définition

const cylinder3Flat = cylinderFlat(cylinder3Drawing);
const database = isoDatabase(cylinder3Flat);
const queue = isoQueue(cylinder3Flat, (shape) => directionOf(shape.style) === 'north');

/**
 * BDD (debout) et queue (couché, `direction=south` / `north`) : cylindre draw.io ; en iso, cylindre
 * debout sur l'ellipse inscrite dans l'emprise, ou demi-cylindre couché dans le sens de la largeur.
 */
export const definition: ShapeDefinition = {
  kind: 'cylinder3',
  outline: (shape) => cylinder3Drawing(shape).silhouette,
  flat: cylinder3Flat,
  textZone: flatTextZone(cylinder3Drawing),
  iso: { create: (shape, ctx) => (isLying(shape) ? queue : database).create(shape, ctx) },
  properties: [tagProperty(`${DATABASE_TAG} ou ${QUEUE_TAG}`)],
  templates: [
    {
      id: 'database',
      name: 'Base de données',
      category: 'architecture',
      order: 50,
      keywords: ['bdd', 'database', 'db', 'sql', 'stockage', 'storage', 'cylindre', 'cylinder'],
      style: 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=8;',
      value: '',
      width: 60,
      height: 80,
      icon: '<path d="M12 6c0-3 16-3 16 0v16c0 3-16 3-16 0zM12 6c0 3 16 3 16 0"/>',
    },
    {
      id: 'queue',
      name: 'File (queue)',
      category: 'architecture',
      order: 60,
      keywords: ['queue', 'message', 'kafka', 'bus', 'cylindre', 'cylinder'],
      // Cylindre couché (bout visible à droite) : le bout garde sa taille quand on l'allonge.
      style: 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=8;direction=south;',
      value: '',
      width: 100,
      height: 30,
      icon: '<path d="M10 5h20a4 9 0 0 1 0 18H10a4 9 0 0 1 0-18zM30 5a4 9 0 0 0 0 18"/>',
    },
  ],
  templateOf: (style) => (style.direction === 'south' || style.direction === 'north' ? 'queue' : 'database'),
  swatch: (style) =>
    style.direction === 'south'
      ? '<path d="M10 6h20a3 8 0 0 1 0 16H10a3 8 0 0 1 0-16zM30 6a3 8 0 0 0 0 16"/>'
      : '<path d="M12 6c0-3 16-3 16 0v16c0 3-16 3-16 0zM12 6c0 3 16 3 16 0"/>',
};
