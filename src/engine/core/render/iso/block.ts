import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh } from 'three';
import type { Object3D } from 'three';
import type { Point } from '../../model/types';
import type { ReadonlyShapeModel as ShapeModel } from '../../model/readonly';
import { createBox, VERTEX_DEFAULTS } from '../flat/box';
import type { BoxDefaults } from '../flat/box';
import { cleanOutline, offsetOutline } from '../geometry/stroke';
import { fillMesh, solidMaterial } from '../meshes';
import type { SceneRenderer } from '../../shapes/types';
import { styleColor, styleStroke } from '../styleColors';
import type { RenderContext } from '../types';
import { DEFAULT_DEPTH, SPATIAL, spatialNumber } from '../../spatial';
import { edgeLines } from '../lines';

/**
 * Rendu iso en volume (niveau `iso`) : la forme devient un bloc posé au sol.
 * - Dessus : le rendu à plat habituel (fond, bordure, label), surélevé.
 * - Côtés : la couleur de fond, assombrie selon l'orientation de chaque face (lumière fixe dans
 *   la page) : relief lisible sans éclairage 3D, cohérent avec le style à plat.
 * - Arêtes : toutes celles du volume (contour du dessus, contour du bas, arêtes verticales aux
 *   angles vifs) avec la couleur, l'épaisseur et le style (pointillés) de la bordure 2D. Le contour
 *   du dessus est **centré** sur le bord, comme en 2D : deux formes accolées partagent la même ligne
 *   (la dernière dessinée l'emporte, comme dans draw.io) au lieu de déborder l'une sur l'autre. Le
 *   contour du bas et les arêtes verticales sont tracés **à l'extérieur** : pas mangés par les faces.
 * Une forme sans fond reste à plat (pas de volume « fantôme »).
 */

/** Épaisseur par défaut d'un bloc, en pixels de page. */
export { DEFAULT_DEPTH };
/** Léger décalage pour que bordure et label du dessus ne se battent pas avec le fond (z-fighting). */
export const TOP_OFFSET = 0.05;
/** Angle minimal (degrés) entre deux côtés pour tracer une arête verticale (pas sur les courbes). */
const SHARP_CORNER_DEG = 30;
/**
 * Direction (page) vers la lumière. Dans l'orientation iso par défaut, la face visible de gauche
 * est claire et celle de droite plus sombre, comme une illustration isométrique classique.
 */
const LIGHT = normalize({ x: 1, y: 2 });
/** Luminosité des côtés par défaut (fraction de la couleur de fond) : face éclairée, face à l'ombre. */
export const SHADE_LIGHT = 0.9;
export const SHADE_DARK = 0.62;

/**
 * Luminosité d'une facette de normale sortante `normal` (espace page, z vers le haut, longueur 1), en fraction de sa
 * couleur : 1 tournée vers le haut (comme le dessus d'un bloc) ; à la verticale, de `shadeDark` (dos à la lumière) à
 * `shadeLight` (face à elle), comme les côtés ; entre les deux pour une pente.
 */
export function facetShade(
  normal: { x: number; y: number; z: number },
  shadeLight = SHADE_LIGHT,
  shadeDark = SHADE_DARK,
): number {
  const up = Math.max(0, normal.z);
  const across = Math.hypot(normal.x, normal.y);
  const light = across === 0 ? 0 : Math.max(0, (normal.x * LIGHT.x + normal.y * LIGHT.y) / across);
  return up + (1 - up) * (shadeDark + (shadeLight - shadeDark) * light);
}

/**
 * Hauteur d'une forme en volume : `spatial.height` (style ou objet), sinon la hauteur par défaut
 * propre à la forme (`fallback`, ex. tube couché : rond), sinon l'épaisseur par défaut du réglage.
 */
export function blockHeight(shape: ShapeModel, ctx: RenderContext, fallback?: number): number {
  return spatialNumber(shape, SPATIAL.height) ?? fallback ?? ctx.volume?.depth ?? DEFAULT_DEPTH;
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
      group.add(sides(path, height, fill, ctx.volume?.shadeLight ?? SHADE_LIGHT, ctx.volume?.shadeDark ?? SHADE_DARK));
      // Dessus : fond opaque, puis le rendu à plat (bordure, label) juste au-dessus.
      const top = fillMesh(path, fill, 1);
      top.material = solidMaterial(fill);
      top.position.z = height;
      top.name = 'top';
      group.add(top);
      // Dessus : label seulement ; la bordure est tracée à l'extérieur avec les autres arêtes.
      const flat = createBox({ ...shape, style: { ...shape.style, strokeColor: 'none' } }, path, ctx, {
        ...defaults,
        fill: null,
      });
      flat.position.z = height + TOP_OFFSET;
      for (const child of [...flat.children]) group.add(reparent(child, flat.position.z));
      for (const edge of volumeEdges(shape, path, height + TOP_OFFSET, defaults)) group.add(edge);
      return group;
    },
  };
}

/**
 * Arêtes du volume : contours du dessus et du bas, arêtes verticales aux angles vifs, avec la couleur,
 * l'épaisseur et les pointillés de la bordure 2D. Ce sont des lignes d'épaisseur constante à l'écran
 * quelle que soit leur orientation (`render/lines`) : une arête couchée et une arête debout ont la même
 * épaisseur apparente. Le contour du dessus suit le bord de la forme (centré, comme la bordure 2D) ;
 * le contour du bas et les arêtes verticales passent une demi-épaisseur à l'extérieur des angles (sur
 * la bissectrice) : ils touchent les faces sans être mangés par elles, et l'arête verticale finit dans
 * l'épaisseur du contour du dessus. Celles qui sont derrière le bloc restent cachées.
 */
function volumeEdges(shape: ShapeModel, outline: Point[], top: number, defaults: BoxDefaults): Object3D[] {
  const { style } = shape;
  const lineStyle = styleStroke(style, defaults.stroke);
  if (!lineStyle) return [];
  const { width } = lineStyle;
  // Même indexation pour le contour et son décalé (points répétés retirés une seule fois).
  const path = cleanOutline(outline);
  const outside = offsetOutline(path, width / 2);
  const n = path.length;
  // Points d'angle des arêtes : à une demi-épaisseur de l'angle, vers l'extérieur.
  const points = path.map((corner, i) => {
    const out = { x: outside[i]!.x - corner.x, y: outside[i]!.y - corner.y };
    const length = Math.hypot(out.x, out.y) || 1;
    return { x: corner.x + (out.x / length) * (width / 2), y: corner.y + (out.y / length) * (width / 2) };
  });
  const loop = (corners: Point[], z: number) =>
    corners.flatMap((p, i) => {
      const q = corners[(i + 1) % n]!;
      return [p.x, p.y, z, q.x, q.y, z];
    });

  const edges: Object3D[] = [];
  for (const [name, corners, z] of [
    ['stroke', path, top],
    ['stroke-bottom', points, TOP_OFFSET],
  ] as const) {
    const lines = edgeLines(loop(corners, z), lineStyle);
    lines.name = name;
    edges.push(lines);
  }

  const vertical: number[] = [];
  for (let i = 0; i < n; i++) {
    const previous = path[(i - 1 + n) % n]!;
    const corner = path[i]!;
    const next = path[(i + 1) % n]!;
    const incoming = normalize({ x: corner.x - previous.x, y: corner.y - previous.y });
    const outgoing = normalize({ x: next.x - corner.x, y: next.y - corner.y });
    const turn = Math.acos(Math.max(-1, Math.min(1, incoming.x * outgoing.x + incoming.y * outgoing.y)));
    if ((turn * 180) / Math.PI < SHARP_CORNER_DEG) continue;
    const p = points[i]!;
    vertical.push(p.x, p.y, TOP_OFFSET, p.x, p.y, top);
  }
  if (vertical.length > 0) {
    const lines = edgeLines(vertical, lineStyle);
    lines.name = 'stroke-vertical';
    edges.push(lines);
  }
  return edges;
}

/** Faces latérales d'un prisme droit de contour `path` et de hauteur `height`, ombrées. */
function sides(path: Point[], height: number, color: Color, shadeLight: number, shadeDark: number): Mesh {
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
    // De la face à l'ombre (`shadeDark`) à la face éclairée (`shadeLight`).
    shaded.copy(color).multiplyScalar(facetShade({ ...normal, z: 0 }, shadeLight, shadeDark));
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
