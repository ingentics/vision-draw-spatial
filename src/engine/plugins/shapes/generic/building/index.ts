import { Color, Group, Matrix4, Vector3 } from 'three';
import type { Mesh, Object3D } from 'three';
import {
  PART_ORDER,
  SPATIAL,
  TOP_OFFSET,
  VERTEX_DEFAULTS,
  blockHeight,
  isoBlock,
  rectPath,
  spatialValue,
  strokeMesh,
  styleColor,
  styleNumber,
  styleOpacity,
} from '../../../../core/plugins';
import type { Point, Rect, RenderContext, SceneRenderer, ShapeModel, ShapeProperty } from '../../../../core/plugins';

/**
 * Étiquette des façades d'un bâtiment iso (BDD, queue, cache) : remplace « DB »… ; vide = aucune. Aussi le mot de la
 * tranche d'un process étiqueté (`generic/tagged-process`).
 */
export const TAG = 'spatial.tag';

/**
 * « Bâtiments » (niveau `iso`) : les composants d'architecture ont tous la même grammaire, comme les
 * familles de bâtiments d'un jeu de construction :
 * - emprise : le rectangle 2D de la forme ;
 * - **toit plat et rectangulaire** à pleine hauteur, bordé, avec le label posé dessus (toujours lisible) ;
 * - **façade** dans l'épaisseur, propre au type, sur les quatre côtés (lisible sous tous les angles) :
 *   BDD (corps arrondi, cerclages), cache distribué (tranches, voyants), queue (chevrons de flux).
 * Le rendu 2D reste celui de draw.io. Sans fond ou sans épaisseur : le rendu `flat`.
 * Bâtiment générique : les briques communes ; chaque façade est dans le dossier de sa forme
 * (`plugins/shapes/…/facade.ts`).
 */

/** Hauteur des bâtiments : la même que toutes les formes (`spatial.height`, sinon l'épaisseur par défaut). */
export const buildingHeight = blockHeight;

/** Rendu iso d'un bâtiment : façade du type, repli à plat sans fond ou sans épaisseur. */
export function building(
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

export const rectBlock = isoBlock((shape) => rectPath(shape.bounds));

/**
 * Tranche en volume de la forme : prisme de contour `outline`, de `z` à `z + height` (côtés ombrés,
 * arêtes à la bordure de la forme), avec le label seulement si `label` (le toit).
 */
export function slab(
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
export function darker(shape: ShapeModel, factor: number): string {
  const fill = styleColor(shape.style, 'fillColor', VERTEX_DEFAULTS.fill) ?? new Color(0xffffff);
  return `#${fill.clone().multiplyScalar(factor).getHexString()}`;
}

/** Style de trait de la forme (couleur, opacité, épaisseur), ou rien sans bordure. */
/** Trait de la forme. */
export type Stroke = { color: Color; opacity: number; width: number };

export function strokeOf(shape: ShapeModel): Stroke | undefined {
  const color = styleColor(shape.style, 'strokeColor', VERTEX_DEFAULTS.stroke);
  const width = styleNumber(shape.style, 'strokeWidth', 1);
  return color && width > 0 ? { color, opacity: styleOpacity(shape.style, 'strokeOpacity'), width } : undefined;
}

/**
 * Faces verticales d'une emprise rectangulaire, chacune avec un repère (u le long de la face, v la
 * hauteur) et de quoi y poser un mesh dessiné dans ce repère, légèrement devant la face.
 */
export interface Face {
  /** Longueur de la face. */
  length: number;
  /** Pose un mesh dessiné en (u, v) sur la face. */
  place(mesh: Mesh): Mesh;
}

export function facesOf({ x, y, width, height }: Rect): Face[] {
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
function faceStroke(face: Face, points: Point[], stroke: Stroke): Mesh | null {
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
export function engrave(
  group: Group,
  face: Face,
  points: Point[],
  shape: ShapeModel,
  stroke: Stroke,
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

/** Taille du texte des étiquettes de façade, selon la hauteur du bâtiment. */
export const tagSize = (height: number) => Math.max(4, Math.min(10, height * 0.22));

/** Texte de l'étiquette d'une forme : `spatial.tag`, sinon celui du type ; undefined si désactivé ou vide. */
export function tagOf(shape: ShapeModel, ctx: RenderContext, fallback: string): string | undefined {
  if (ctx.volume?.tags === false) return undefined;
  const text = (spatialValue(shape, TAG) ?? fallback).trim();
  return text || undefined;
}

/**
 * Plinthe : hauteur réservée en bas des façades à l'étiquette, au-dessus de laquelle se placent les
 * motifs (arcs, chevrons) ; 0 sans étiquette.
 */
export function plinthOf(tag: string | undefined, height: number): number {
  return tag ? tagSize(height) * 1.6 : 0;
}

/** Hauteur des capitales, en fraction de la taille du texte (pour centrer un mot en majuscules). */
export const CAP_HEIGHT = 0.7;

/**
 * Étiquette sur les quatre faces (comme une enseigne de bâtiment) : en bas à droite de chaque face,
 * à l'endroit vu de l'extérieur, de la teinte sombre des gravures. Alignée sur sa ligne de base
 * (`baseline`, hauteur sur la façade ; par défaut une demi-taille au-dessus du sol), à `margin` du
 * bord droit de la face.
 */
export function facadeTag(
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

/**
 * Réglage de l'étiquette de façade (`spatial.tag`) d'un bâtiment, pour le panneau ; `fallback` : l'étiquette par
 * défaut de la forme.
 */
export function tagProperty(fallback: string): ShapeProperty {
  return {
    type: 'text',
    key: TAG,
    live: true,
    label: 'Étiquette',
    section: 'volume',
    title: `Étiquette des façades en vue iso (spatial.tag) ; vide = « ${fallback} »`,
    placeholder: fallback,
  };
}
