import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh } from 'three';
import type { Point, ShapeModel } from '../../model/types';
import { createBox, VERTEX_DEFAULTS } from '../flat/box';
import type { BoxDefaults } from '../flat/box';
import { dashPolyline, dashPattern } from '../geometry/stroke';
import { fillMesh, flatMaterial, solidMaterial, strokeMesh } from '../meshes';
import type { SceneRenderer } from '../shapes/types';
import { styleColor, styleNumber, styleOpacity } from '../styleValues';
import { PART_ORDER } from '../types';
import type { RenderContext } from '../types';

/**
 * Rendu iso en volume (niveau `iso`) : la forme devient un bloc posé au sol.
 * - Dessus : le rendu à plat habituel (fond, bordure, label), surélevé.
 * - Côtés : la couleur de fond, assombrie selon l'orientation de chaque face (lumière fixe dans
 *   la page) : relief lisible sans éclairage 3D, cohérent avec le style à plat.
 * - Arêtes : toutes celles du volume (contour du dessus, contour du bas, arêtes verticales aux
 *   angles vifs) avec la couleur, l'épaisseur et le style (pointillés) de la bordure 2D.
 * Une forme sans fond reste à plat (pas de volume « fantôme »).
 */

/** Épaisseur par défaut d'un bloc, en pixels de page. */
export const DEFAULT_DEPTH = 16;
/** Léger décalage pour que bordure et label du dessus ne se battent pas avec le fond (z-fighting). */
const TOP_OFFSET = 0.05;
/** Angle minimal (degrés) entre deux côtés pour tracer une arête verticale (pas sur les courbes). */
const SHARP_CORNER_DEG = 30;
/**
 * Direction (page) vers la lumière. Dans l'orientation iso par défaut, la face visible de gauche
 * est claire et celle de droite plus sombre, comme une illustration isométrique classique.
 */
const LIGHT = normalize({ x: 1, y: 2 });

/** Hauteur d'une forme en volume : `spatial.height` dans le style, sinon l'épaisseur par défaut. */
export function blockHeight(shape: ShapeModel, ctx: RenderContext): number {
  const own = parseFloat(shape.style['spatial.height'] ?? '');
  if (Number.isFinite(own) && own >= 0) return own;
  return ctx.volume?.depth ?? DEFAULT_DEPTH;
}

/** Rendu iso d'une forme définie par son contour. */
export function isoBlock(
  outline: (shape: ShapeModel) => Point[],
  defaults: BoxDefaults = VERTEX_DEFAULTS,
): SceneRenderer {
  return {
    create(shape, ctx) {
      const path = outline(shape);
      const height = blockHeight(shape, ctx);
      const fill = styleColor(shape.style, 'fillColor', defaults.fill);
      // Pas de fond ou pas d'épaisseur : rendu à plat.
      if (!fill || height <= 0) return createBox(shape, path, ctx, defaults);

      const group = new Group();
      group.name = `shape:${shape.id}`;
      group.userData.height = height;

      // Côtés (opaques, avec profondeur).
      group.add(sides(path, height, fill));
      // Dessus : fond opaque, puis le rendu à plat (bordure, label) juste au-dessus.
      const top = fillMesh(path, fill, 1);
      top.material = solidMaterial(fill);
      top.position.z = height;
      top.name = 'top';
      group.add(top);
      const flat = createBox(shape, path, ctx, { ...defaults, fill: null });
      flat.position.z = height + TOP_OFFSET;
      for (const child of [...flat.children]) group.add(reparent(child, flat.position.z));
      for (const edge of volumeEdges(shape, path, height, defaults)) group.add(edge);
      return group;
    },
  };
}

/**
 * Arêtes du volume autres que le contour du dessus (déjà tracé par le rendu à plat) : contour du bas
 * et arêtes verticales aux angles vifs, avec la couleur, l'épaisseur et les pointillés de la bordure.
 * Testées en profondeur : celles qui sont derrière le bloc restent cachées.
 */
function volumeEdges(shape: ShapeModel, path: Point[], height: number, defaults: BoxDefaults): Mesh[] {
  const { style } = shape;
  const color = styleColor(style, 'strokeColor', defaults.stroke);
  const width = styleNumber(style, 'strokeWidth', 1);
  if (!color || width <= 0) return [];
  const opacity = styleOpacity(style, 'strokeOpacity');
  const dash = dashPattern(style, width);
  const edges: Mesh[] = [];

  const bottom = strokeMesh(path, color, opacity, { width, closed: true, dash });
  if (bottom) {
    bottom.name = 'stroke-bottom';
    bottom.position.z = TOP_OFFSET;
    edges.push(bottom);
  }

  const positions: number[] = [];
  const n = path.length;
  for (let i = 0; i < n; i++) {
    const previous = path[(i - 1 + n) % n]!;
    const corner = path[i]!;
    const next = path[(i + 1) % n]!;
    const incoming = normalize({ x: corner.x - previous.x, y: corner.y - previous.y });
    const outgoing = normalize({ x: next.x - corner.x, y: next.y - corner.y });
    const turn = Math.acos(Math.max(-1, Math.min(1, incoming.x * outgoing.x + incoming.y * outgoing.y)));
    if ((turn * 180) / Math.PI < SHARP_CORNER_DEG) continue;
    // Tirets le long de la hauteur, comme sur les côtés du contour.
    const pieces = dash
      ? dashPolyline(
          [
            { x: 0, y: 0 },
            { x: height, y: 0 },
          ],
          dash,
          false,
        ).map((d) => [d[0]!.x, d[d.length - 1]!.x])
      : [[0, height]];
    for (const [z0, z1] of pieces) pushPrism(positions, corner, incoming, width / 2, z0!, z1!);
  }
  if (positions.length > 0) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const vertical = new Mesh(geometry, flatMaterial(color, opacity));
    vertical.name = 'stroke-vertical';
    edges.push(vertical);
  }
  for (const edge of edges) edge.renderOrder = PART_ORDER.stroke;
  return edges;
}

/**
 * Arête verticale épaisse : prisme à section carrée (demi-côté `half`) centré sur `corner`, aligné sur
 * le côté entrant ; vue de n'importe quel côté, sa largeur reste proche de l'épaisseur du trait.
 */
function pushPrism(positions: number[], corner: Point, along: Point, half: number, z0: number, z1: number): void {
  const u = { x: along.x * half, y: along.y * half };
  const v = { x: -along.y * half, y: along.x * half };
  const ring = [
    { x: corner.x - u.x - v.x, y: corner.y - u.y - v.y },
    { x: corner.x + u.x - v.x, y: corner.y + u.y - v.y },
    { x: corner.x + u.x + v.x, y: corner.y + u.y + v.y },
    { x: corner.x - u.x + v.x, y: corner.y - u.y + v.y },
  ];
  for (let i = 0; i < 4; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % 4]!;
    positions.push(a.x, a.y, z0, b.x, b.y, z0, b.x, b.y, z1, a.x, a.y, z0, b.x, b.y, z1, a.x, a.y, z1);
  }
}

/** Faces latérales d'un prisme droit de contour `path` et de hauteur `height`, ombrées. */
function sides(path: Point[], height: number, color: Color): Mesh {
  const positions: number[] = [];
  const colors: number[] = [];
  const shaded = new Color();
  const clockwise = signedArea(path) < 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const b = path[(i + 1) % path.length]!;
    // Normale sortante dans le plan (dépend du sens de parcours du contour).
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    const normal = clockwise ? { x: -dy / length, y: dx / length } : { x: dy / length, y: -dx / length };
    // Face éclairée : 0,9 ; face à l'ombre : 0,62.
    const light = Math.max(0, normal.x * LIGHT.x + normal.y * LIGHT.y);
    shaded.copy(color).multiplyScalar(0.62 + 0.28 * light);
    for (const [x, y, z] of [
      [a.x, a.y, 0],
      [b.x, b.y, 0],
      [b.x, b.y, height],
      [a.x, a.y, 0],
      [b.x, b.y, height],
      [a.x, a.y, height],
    ] as const) {
      positions.push(x, y, z);
      colors.push(shaded.r, shaded.g, shaded.b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const material = solidMaterial(new Color(0xffffff));
  material.vertexColors = true;
  const mesh = new Mesh(geometry, material);
  mesh.name = 'sides';
  return mesh;
}

/** Retire un enfant de son groupe pour le rattacher ailleurs, en gardant sa hauteur. */
function reparent<T extends { position: { z: number }; removeFromParent(): unknown }>(child: T, z: number): T {
  child.removeFromParent();
  child.position.z += z;
  return child;
}

function signedArea(path: Point[]): number {
  let area = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const b = path[(i + 1) % path.length]!;
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function normalize(p: Point): Point {
  const length = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / length, y: p.y / length };
}
