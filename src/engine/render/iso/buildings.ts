import { Color, Group, Matrix4, Vector3 } from 'three';
import type { Mesh, Object3D } from 'three';
import type { Point, Rect, ShapeModel } from '../../model/types';
import { SPATIAL, spatialNumber, spatialValue } from '../../spatial';
import { VERTEX_DEFAULTS } from '../flat/box';
import { cubicTo } from '../geometry/curves';
import { rectPath } from '../geometry/paths';
import { fillMesh, strokeMesh } from '../meshes';
import type { SceneRenderer } from '../shapes/types';
import { styleColor, styleNumber, styleOpacity } from '../styleValues';
import { PART_ORDER } from '../types';
import type { RenderContext } from '../types';
import { blockHeight, DEFAULT_DEPTH, isoBlock, TOP_OFFSET } from './block';

/**
 * « Bâtiments » (niveau `iso`) : les composants d'architecture ont tous la même grammaire, comme les
 * familles de bâtiments d'un jeu de construction :
 * - emprise : le rectangle 2D de la forme ;
 * - **toit plat et rectangulaire** à pleine hauteur, bordé, avec le label posé dessus (toujours lisible) ;
 * - **façade** dans l'épaisseur, propre au type, sur les quatre côtés (lisible sous tous les angles) :
 *   BDD (corps arrondi, cerclages), cache distribué (tranches, voyants), queue (chevrons de flux).
 * Le rendu 2D reste celui de draw.io. Sans fond ou sans épaisseur : le rendu `flat`.
 */

/** Hauteur par défaut des bâtiments : le double de l'épaisseur des blocs (façade lisible), `spatial.height` prioritaire. */
export function buildingHeight(shape: ShapeModel, ctx: RenderContext): number {
  return blockHeight(shape, ctx, 2 * (ctx.volume?.depth ?? DEFAULT_DEPTH));
}

/** Rendu iso d'un bâtiment : façade du type, repli à plat sans fond ou sans épaisseur. */
function building(
  flat: SceneRenderer,
  facade: (shape: ShapeModel, ctx: RenderContext, height: number, group: Group) => void,
): SceneRenderer {
  return {
    create(shape, ctx) {
      const height = buildingHeight(shape, ctx);
      if (!styleColor(shape.style, 'fillColor', VERTEX_DEFAULTS.fill) || height <= 0) return flat.create(shape, ctx);
      const group = new Group();
      group.name = `shape:${shape.id}`;
      group.userData.height = height;
      facade(shape, ctx, height, group);
      return group;
    },
  };
}

// ---------------------------------------------------------------------------
// Briques communes

const rectBlock = isoBlock((shape) => rectPath(shape.bounds));

/**
 * Tranche en volume de la forme : prisme de contour `outline`, de `z` à `z + height` (côtés ombrés,
 * arêtes à la bordure de la forme), avec le label seulement si `label` (le toit).
 */
function slab(
  shape: ShapeModel,
  ctx: RenderContext,
  outline: Point[],
  z: number,
  height: number,
  options: { label?: boolean; fill?: string } = {},
): Object3D {
  const style: Record<string, string> = { ...shape.style, [SPATIAL.height]: String(height) };
  if (options.fill) style.fillColor = options.fill;
  const part = isoBlock(() => outline).create({ ...shape, label: options.label ? shape.label : '', style }, ctx);
  part.position.z = z;
  return part;
}

/** Couleur de fond assombrie (#rrggbb), pour les retraits (rainures, socles). */
function darker(shape: ShapeModel, factor: number): string {
  const fill = styleColor(shape.style, 'fillColor', VERTEX_DEFAULTS.fill) ?? new Color(0xffffff);
  return `#${fill.clone().multiplyScalar(factor).getHexString()}`;
}

/** Style de trait de la forme (couleur, opacité, épaisseur), ou rien sans bordure. */
function strokeOf(shape: ShapeModel): { color: Color; opacity: number; width: number } | undefined {
  const color = styleColor(shape.style, 'strokeColor', VERTEX_DEFAULTS.stroke);
  const width = styleNumber(shape.style, 'strokeWidth', 1);
  return color && width > 0 ? { color, opacity: styleOpacity(shape.style, 'strokeOpacity'), width } : undefined;
}

/**
 * Faces verticales d'une emprise rectangulaire, chacune avec un repère (u le long de la face, v la
 * hauteur) et de quoi y poser un mesh dessiné dans ce repère, légèrement devant la face.
 */
interface Face {
  /** Longueur de la face. */
  length: number;
  /** Pose un mesh dessiné en (u, v) sur la face. */
  place(mesh: Mesh): Mesh;
}

function facesOf({ x, y, width, height }: Rect): Face[] {
  const out = TOP_OFFSET * 2;
  const along = (map: (u: number, v: number) => [number, number, number], length: number): Face => ({
    length,
    place(mesh) {
      const position = mesh.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) position.setXYZ(i, ...map(position.getX(i), position.getY(i)));
      position.needsUpdate = true;
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
      return mesh;
    },
  });
  return [
    along((u, v) => [x + u, y - out, v], width), // face nord (y min)
    along((u, v) => [x + width - u, y + height + out, v], width), // face sud
    along((u, v) => [x - out, y + height - u, v], height), // face ouest
    along((u, v) => [x + width + out, y + u, v], height), // face est
  ];
}

/** Trait en (u, v) posé sur une face, au style de la bordure de la forme. */
function faceStroke(face: Face, points: Point[], stroke: NonNullable<ReturnType<typeof strokeOf>>): Mesh | null {
  const mesh = strokeMesh(points, stroke.color, stroke.opacity, { width: stroke.width, closed: false });
  if (!mesh) return null;
  mesh.name = 'facade';
  mesh.renderOrder = PART_ORDER.stroke;
  return face.place(mesh);
}

/**
 * Gravure sur une face (chevrons de la queue, arcs de la BDD) : une rainure sombre, plus large que le
 * trait, et le bord haut de la rainure au trait de la forme (l'arête éclairée) : le motif est creusé
 * dans la façade, sans relief rapporté.
 */
function engrave(
  group: Group,
  face: Face,
  points: Point[],
  shape: ShapeModel,
  stroke: NonNullable<ReturnType<typeof strokeOf>>,
  grooveWidth: number,
): void {
  const groove = strokeMesh(points, new Color(darker(shape, 0.55)), 1, { width: grooveWidth, closed: false });
  if (groove) {
    groove.name = 'facade-groove';
    groove.renderOrder = PART_ORDER.fill + 0.5;
    group.add(face.place(groove));
  }
  const edge = faceStroke(
    face,
    points.map((p) => ({ x: p.x, y: p.y + grooveWidth / 2 })),
    stroke,
  );
  if (edge) group.add(edge);
}

/** Étiquettes de façade par défaut (`spatial.tag` les remplace ; vide = aucune). */
export const FACADE_TAGS = { database: 'DB', queue: 'QUEUE', cache: 'CACHE' } as const;

/** Taille du texte des étiquettes de façade, selon la hauteur du bâtiment. */
const tagSize = (height: number) => Math.max(4, Math.min(10, height * 0.22));

/** Texte de l'étiquette d'une forme : `spatial.tag`, sinon celui du type ; undefined si désactivé ou vide. */
function tagOf(shape: ShapeModel, ctx: RenderContext, fallback: string): string | undefined {
  if (ctx.volume?.tags === false) return undefined;
  const text = (spatialValue(shape, SPATIAL.tag) ?? fallback).trim();
  return text || undefined;
}

/**
 * Plinthe : hauteur réservée en bas des façades à l'étiquette, au-dessus de laquelle se placent les
 * motifs (arcs, chevrons) ; 0 sans étiquette.
 */
function plinthOf(tag: string | undefined, height: number): number {
  return tag ? tagSize(height) * 1.6 : 0;
}

/** Hauteur des capitales, en fraction de la taille du texte (pour centrer un mot en majuscules). */
const CAP_HEIGHT = 0.7;

/**
 * Étiquette sur les quatre faces (comme une enseigne de bâtiment) : en bas à droite de chaque face,
 * à l'endroit vu de l'extérieur, de la teinte sombre des gravures. Alignée sur sa ligne de base
 * (`baseline`, hauteur sur la façade ; par défaut une demi-taille au-dessus du sol), à `margin` du
 * bord droit de la face.
 */
function facadeTag(
  group: Group,
  shape: ShapeModel,
  ctx: RenderContext,
  text: string,
  size: number,
  { baseline = size * 0.5, margin = size * 0.5 }: { baseline?: number; margin?: number } = {},
): void {
  const { x, y, width, height: depth } = shape.bounds;
  const out = TOP_OFFSET * 2;
  const color = new Color(darker(shape, 0.45));
  // Par face : normale sortante, coin haut-gauche vu de l'extérieur, longueur. La droite du lecteur
  // est normale × verticale (espace page), le bas est −z.
  const faces: Array<{ normal: Vector3; corner: Vector3; length: number }> = [
    { normal: new Vector3(0, -1, 0), corner: new Vector3(x + width, y - out, 0), length: width },
    { normal: new Vector3(0, 1, 0), corner: new Vector3(x, y + depth + out, 0), length: width },
    { normal: new Vector3(-1, 0, 0), corner: new Vector3(x - out, y, 0), length: depth },
    { normal: new Vector3(1, 0, 0), corner: new Vector3(x + width + out, y + depth, 0), length: depth },
  ];
  const up = new Vector3(0, 0, 1);
  for (const { normal, corner, length } of faces) {
    if (length < size * 2) continue;
    const right = normal.clone().cross(up);
    const down = new Vector3(0, 0, -1);
    const frame = new Group();
    frame.name = 'facade-tag';
    frame.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(right, down, normal));
    // Repère « page » de la face : x vers la droite du lecteur, y vers le bas ; origine sur la ligne
    // de base de l'étiquette (le texte monte au-dessus).
    frame.position.set(corner.x, corner.y, baseline);
    const label = ctx.text.create({
      text,
      x: length - margin,
      y: 0,
      anchorX: 'right',
      anchorY: 'bottom-baseline',
      align: 'right',
      fontSize: size,
      color,
      opacity: 1,
      bold: true,
    });
    label.renderOrder = PART_ORDER.label;
    frame.add(label);
    group.add(frame);
  }
}

// ---------------------------------------------------------------------------
// Façades

/**
 * BDD : un bloc plein et droit, dont les quatre faces portent 2 ou 3 arcs « sourire » gravés, les
 * lèvres du pictogramme de base de données répétées (même gravure que les chevrons de la queue).
 * Le dessus est le toit, avec le label.
 */
export function isoDatabase(flat: SceneRenderer): SceneRenderer {
  return building(flat, (shape, ctx, height, group) => {
    const block = rectBlock.create({ ...shape, style: { ...shape.style, [SPATIAL.height]: String(height) } }, ctx);
    block.name = 'roof';
    group.add(block);
    const tag = tagOf(shape, ctx, FACADE_TAGS.database);
    if (tag) facadeTag(group, shape, ctx, tag, tagSize(height));
    const stroke = strokeOf(shape);
    if (!stroke) return;
    // Arcs au-dessus de la plinthe de l'étiquette.
    const plinth = plinthOf(tag, height);
    const band = height - plinth;
    const count = band >= 24 ? 3 : 2;
    const grooveWidth = Math.max(2, Math.min(4, height * 0.08));
    for (const face of facesOf(shape.bounds)) {
      const pad = Math.min(4, face.length * 0.08);
      const sag = Math.min(band / (count + 1) / 2, face.length * 0.1);
      for (let i = 0; i < count; i++) {
        // Du haut vers le bas, sous le toit ; l'arc descend au milieu de la face, comme une lèvre.
        const v = plinth + (band * (count - i)) / (count + 1) + sag / 2;
        const start = { x: pad, y: v };
        const arc = [
          start,
          ...cubicTo(
            start,
            { x: pad, y: v - (4 / 3) * sag },
            { x: face.length - pad, y: v - (4 / 3) * sag },
            { x: face.length - pad, y: v },
          ),
        ];
        engrave(group, face, arc, shape, stroke, grooveWidth);
      }
    }
  });
}

/** Nombre de nœuds par défaut d'un cache distribué. */
export const DEFAULT_CACHE_NODES = 3;

/**
 * Cache distribué : l'épaisseur découpée en tranches (une par nœud, `spatial.nodes`), séparées par
 * une rainure en retrait plus sombre ; chaque tranche porte une rangée de voyants (couleur d'accent)
 * sur ses quatre faces. Le toit est la tranche du haut, avec le label.
 */
export function isoCache(flat: SceneRenderer): SceneRenderer {
  return building(flat, (shape, ctx, height, group) => {
    const { bounds } = shape;
    const nodes = Math.min(12, Math.max(1, Math.round(spatialNumber(shape, SPATIAL.nodes) ?? DEFAULT_CACHE_NODES)));
    const groove = nodes > 1 ? Math.min(3, height / (nodes * 4)) : 0;
    const slabHeight = (height - groove * (nodes - 1)) / nodes;
    const inset = Math.min(3, bounds.width / 6, bounds.height / 6);
    const core = rectPath({
      x: bounds.x + inset,
      y: bounds.y + inset,
      width: bounds.width - 2 * inset,
      height: bounds.height - 2 * inset,
    });
    const accent = new Color(ctx.accent ?? '#1a73e8');
    // Étiquette sur la tranche du bas, à sa hauteur.
    const tag = tagOf(shape, ctx, FACADE_TAGS.cache);
    // Voyants : petits carrés à gauche de chaque face, centrés dans leur tranche.
    const ledSize = Math.max(1.5, Math.min(3, slabHeight * 0.25));
    const ledMargin = ledSize * 1.5;
    if (tag) {
      // Dans la tranche du bas, centrée sur la rangée de voyants, à la même marge du bord.
      const size = slabHeight * 0.6;
      facadeTag(group, shape, ctx, tag, size, {
        baseline: slabHeight / 2 - (CAP_HEIGHT * size) / 2,
        margin: ledMargin,
      });
    }
    for (let i = 0; i < nodes; i++) {
      const z = i * (slabHeight + groove);
      const top = i === nodes - 1;
      const part = slab(shape, ctx, rectPath(bounds), z, slabHeight, { label: top });
      part.name = top ? 'roof' : `node:${i}`;
      group.add(part);
      if (!top) group.add(slab(shape, ctx, core, z + slabHeight, groove, { fill: darker(shape, 0.7) }));
      // Voyants : trois petits carrés près d'un bout de chaque face, à mi-hauteur de la tranche.
      const size = ledSize;
      for (const face of facesOf(bounds)) {
        for (let k = 0; k < 3; k++) {
          // À gauche de la face vu de l'extérieur (l'étiquette est en bas à droite).
          const u = face.length - ledMargin - size * (1 + 2 * k);
          if (u < 0) break;
          const led = fillMesh(
            rectPath({ x: u, y: z + slabHeight / 2 - size / 2, width: size, height: size }),
            accent,
            1,
          );
          led.name = 'led';
          led.renderOrder = PART_ORDER.label;
          group.add(face.place(led));
        }
      }
    }
  });
}

/**
 * Queue : un bloc dont les faces longues portent une rangée de chevrons ▶ dans le sens du flux (vers
 * le bout visible en 2D : à droite, à gauche si `toLeft`), comme un convoyeur. Le toit est le dessus
 * du bloc, avec le label.
 */
export function isoQueue(flat: SceneRenderer, toLeft: (shape: ShapeModel) => boolean): SceneRenderer {
  return building(flat, (shape, ctx, height, group) => {
    const { bounds } = shape;
    const block = rectBlock.create(
      { ...shape, style: { ...shape.style, [SPATIAL.height]: String(height) } },
      ctx,
    ) as Group;
    block.name = 'roof';
    group.add(block);
    const tag = tagOf(shape, ctx, FACADE_TAGS.queue);
    if (tag) facadeTag(group, shape, ctx, tag, tagSize(height));
    const stroke = strokeOf(shape);
    if (!stroke) return;
    const [north, south] = facesOf(bounds);
    // Chevrons au-dessus de la plinthe de l'étiquette.
    const plinth = plinthOf(tag, height);
    const band = height - plinth;
    const step = Math.max(12, band * 0.9);
    const count = Math.max(1, Math.floor(bounds.width / step));
    const half = Math.min(step * 0.18, band * 0.22);
    const rise = band * 0.28;
    const grooveWidth = Math.max(2.5, Math.min(6, band * 0.12));
    const z = plinth + band / 2;
    for (const [face, mirrored] of [
      [north!, false],
      [south!, true],
    ] as const) {
      for (let i = 0; i < count; i++) {
        // Centre du chevron le long de la face, en coordonnées page (x croissant), puis repère de la face.
        const cx = (bounds.width / count) * (i + 0.5);
        const right = !toLeft(shape);
        const tip = right ? cx + half : cx - half;
        const back = right ? cx - half : cx + half;
        const chevron: Point[] = [
          { x: back, y: z + rise },
          { x: tip, y: z },
          { x: back, y: z - rise },
        ].map((p) => (mirrored ? { x: bounds.width - p.x, y: p.y } : p));
        engrave(group, face, chevron, shape, stroke, grooveWidth);
      }
    }
  });
}
