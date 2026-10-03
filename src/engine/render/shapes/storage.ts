import { Group } from 'three';
import type { Point, Rect, ShapeModel } from '../../model/types';
import { SPATIAL, spatialNumber } from '../../spatial';
import { createBox, createLabel, VERTEX_DEFAULTS } from '../flat/box';
import { cubicTo, halfEllipseTo } from '../geometry/curves';
import { ellipsePath } from '../geometry/paths';
import { dashPattern } from '../geometry/stroke';
import { blockHeight, isoBlock } from '../iso/block';
import { isoTube } from '../iso/tube';
import { strokeMesh } from '../meshes';
import { styleColor, styleNumber, styleOpacity } from '../styleValues';
import { PART_ORDER } from '../types';
import type { SceneRenderer, ShapeDefinition } from './types';

/**
 * Formes de stockage (SPEC §8.3), natives de draw.io, dessinées comme draw.io en 2D et en vrai
 * volume en iso / 3D :
 * - BDD : `shape=cylinder3` (cylindre) ► cylindre debout ;
 * - queue : `shape=cylinder3;direction=south` (cylindre couché, bout visible à droite) ► tube couché
 *   au sol ; `shape=mxgraph.flowchart.direct_data` (cylindre couché des organigrammes) aussi ;
 * - cache distribué : `shape=datastore` (cylindre à anneaux) ► pile de disques, un par nœud.
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
    const top = style.boundedLbl === '1' ? Math.min(bounds.height, 2 * dy) : 0;
    const bottom = style.boundedLbl === '1' ? Math.max(0, 0.3 * dy) : 0;
    return {
      silhouette: cylinderSilhouette(bounds, dy),
      lips: [cylinderLip(bounds, dy)],
      label: { ...bounds, y: bounds.y + top, height: Math.max(0, bounds.height - top - bottom) },
    };
  });
}

/** `shape=datastore` : ellipse de taille fixe, trois lèvres (les anneaux). */
function datastoreDrawing(shape: ShapeModel): CylinderDrawing {
  const { bounds, style } = shape;
  const dy = Math.max(0, Math.min(bounds.height / 2, ringHeight(style)));
  return {
    silhouette: cylinderSilhouette(bounds, dy),
    lips: [0, dy / 2, dy].map((offset) => cylinderLip(bounds, dy, offset)),
    label: bounds,
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

/**
 * Sans fond ou sans épaisseur, un volume reste à plat : avec le dessin 2D de la forme (cylindre vu
 * de côté), pas avec l'emprise elliptique que `isoBlock` dessinerait.
 */
function withFlatFallback(iso: SceneRenderer, flat: SceneRenderer): SceneRenderer {
  return {
    create(shape, ctx) {
      const filled = styleColor(shape.style, 'fillColor', VERTEX_DEFAULTS.fill) !== null;
      return filled && blockHeight(shape, ctx) > 0 ? iso.create(shape, ctx) : flat.create(shape, ctx);
    },
  };
}

/** Emprise au sol des volumes : l'ellipse inscrite dans les bornes de la forme. */
const footprint = (shape: ShapeModel) => ellipsePath(shape.bounds);

/** Nombre de nœuds par défaut d'un cache distribué. */
export const DEFAULT_CACHE_NODES = 3;
/** Espace entre deux disques, en fraction de l'épaisseur d'un disque. */
const DISC_GAP = 0.25;

/**
 * Pile de disques (cache distribué) : `spatial.nodes` disques (3 par défaut, 1 à 12) sur l'épaisseur
 * du volume, séparés d'un petit espace ; le label sur le disque du haut.
 */
function isoDiscStack(flat: SceneRenderer): SceneRenderer {
  const disc = isoBlock(footprint);
  return {
    create(shape, ctx) {
      const total = blockHeight(shape, ctx);
      if (!styleColor(shape.style, 'fillColor', VERTEX_DEFAULTS.fill) || total <= 0) return flat.create(shape, ctx);
      const nodes = Math.min(12, Math.max(1, Math.round(spatialNumber(shape, SPATIAL.nodes) ?? DEFAULT_CACHE_NODES)));
      const discHeight = total / (nodes + (nodes - 1) * DISC_GAP);
      const group = new Group();
      group.name = `shape:${shape.id}`;
      group.userData.height = total;
      for (let i = 0; i < nodes; i++) {
        const top = i === nodes - 1;
        const part = disc.create(
          { ...shape, label: top ? shape.label : '', style: { ...shape.style, [SPATIAL.height]: String(discHeight) } },
          ctx,
        );
        part.name = `node:${i}`;
        part.position.z = i * discHeight * (1 + DISC_GAP);
        group.add(part);
      }
      return group;
    },
  };
}

// ---------------------------------------------------------------------------
// Définitions

const cylinder3Outline = (shape: ShapeModel) => cylinder3Drawing(shape).silhouette;
const cylinder3Flat = cylinderFlat(cylinder3Drawing);

const standingCylinder = withFlatFallback(isoBlock(footprint), cylinder3Flat);
const lyingCylinder = isoTube(cylinder3Flat, VERTEX_DEFAULTS);

/**
 * BDD (debout) et queue (couché, `direction=south` / `north`) : cylindre draw.io ; en iso, cylindre
 * debout sur l'ellipse inscrite dans l'emprise, ou tube couché dans le sens de la largeur.
 */
export const cylinderShape: ShapeDefinition = {
  kind: 'cylinder3',
  outline: cylinder3Outline,
  flat: cylinder3Flat,
  iso: { create: (shape, ctx) => (isLying(shape) ? lyingCylinder : standingCylinder).create(shape, ctx) },
};

const datastoreFlat = cylinderFlat(datastoreDrawing);

/** Cache distribué : cylindre à anneaux draw.io ; en iso, pile de disques (un par nœud). */
export const datastoreShape: ShapeDefinition = {
  kind: 'datastore',
  outline: (shape) => datastoreDrawing(shape).silhouette,
  flat: datastoreFlat,
  iso: isoDiscStack(datastoreFlat),
};

const directDataFlat = cylinderFlat(directDataDrawing);

/** Queue : « Direct Data » des organigrammes draw.io ; en iso, tube couché dans le sens de la largeur. */
export const directDataShape: ShapeDefinition = {
  kind: 'mxgraph.flowchart.direct_data',
  outline: (shape) => directDataDrawing(shape).silhouette,
  flat: directDataFlat,
  iso: isoTube(directDataFlat, VERTEX_DEFAULTS),
};
