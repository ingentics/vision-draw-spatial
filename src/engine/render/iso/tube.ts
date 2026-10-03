import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh } from 'three';
import type { Material } from 'three';
import type { Point, ShapeModel } from '../../model/types';
import { createLabel } from '../flat/box';
import type { BoxDefaults } from '../flat/box';
import { ellipsePath } from '../geometry/paths';
import { dashPattern } from '../geometry/stroke';
import { fillMesh, solidMaterial, strokeMesh } from '../meshes';
import type { SceneRenderer } from '../shapes/types';
import { styleColor, styleNumber, styleOpacity } from '../styleValues';
import { PART_ORDER } from '../types';
import { blockHeight, SHADE_DARK, SHADE_LIGHT, TOP_OFFSET } from './block';

/**
 * Tube couché au sol (niveau `iso`) : cylindre dont l'axe suit la largeur de la forme, de section
 * elliptique (largeur de la section = hauteur de la forme au sol, hauteur = épaisseur du volume :
 * `spatial.height`, sinon le réglage). Les deux extrémités sont des faces pleines, bordées comme la
 * forme ; le label est posé à plat au-dessus du tube. Sans fond ou sans épaisseur : rendu `flat`.
 */
export function isoTube(flat: SceneRenderer, defaults: BoxDefaults): SceneRenderer {
  return {
    create(shape, ctx) {
      const fill = styleColor(shape.style, 'fillColor', defaults.fill);
      const height = blockHeight(shape, ctx);
      if (!fill || height <= 0 || shape.bounds.width <= 0 || shape.bounds.height <= 0) return flat.create(shape, ctx);

      const light = ctx.volume?.shadeLight ?? SHADE_LIGHT;
      const dark = ctx.volume?.shadeDark ?? SHADE_DARK;
      const { x, y, width, height: depth } = shape.bounds;
      const group = new Group();
      group.name = `shape:${shape.id}`;
      group.userData.height = height;

      // Section : ellipse dans le plan (y, z), posée au sol.
      const section = ellipsePath({ x: y, y: 0, width: depth, height });
      group.add(tubeSide(section, x, x + width, fill, light, dark));
      // Extrémités : la face visible de chaque bout, ombrée selon son orientation (±x).
      for (const [end, facing] of [
        [x, -1],
        [x + width, 1],
      ] as const) {
        const color = shade(fill, facing > 0 ? 0.45 : 0, light, dark);
        const cap = fillMesh(section, color, 1);
        (cap.material as Material).dispose();
        cap.material = solidMaterial(color);
        cap.name = 'cap';
        toCrossSection(cap, end);
        group.add(cap);
        const outline = capOutline(shape, section, defaults, end + facing * TOP_OFFSET);
        if (outline) group.add(outline);
      }

      const label = createLabel(shape, ctx);
      if (label) {
        label.position.z = height + TOP_OFFSET;
        group.add(label);
      }
      return group;
    },
  };
}

/** Couleur d'une face : de l'ombre (`dark`) à la lumière (`light`) selon `lit` (0–1). */
function shade(color: Color, lit: number, light: number, dark: number): Color {
  return color.clone().multiplyScalar(dark + (light - dark) * Math.min(1, Math.max(0, lit)));
}

/**
 * Surface du tube, de `x0` à `x1` : une bande par segment de la section, ombrée selon sa normale
 * (le dessus éclairé, le dessous dans l'ombre, comme les côtés des blocs).
 */
function tubeSide(section: Point[], x0: number, x1: number, color: Color, light: number, dark: number): Mesh {
  const positions: number[] = [];
  const colors: number[] = [];
  const n = section.length;
  let cy = 0;
  let cz = 0;
  for (const p of section) {
    cy += p.x / n;
    cz += p.y / n;
  }
  for (let i = 0; i < n; i++) {
    const a = section[i]!;
    const b = section[(i + 1) % n]!;
    // Normale sortante approchée : du centre vers le milieu du segment.
    const my = (a.x + b.x) / 2 - cy;
    const mz = (a.y + b.y) / 2 - cz;
    const length = Math.hypot(my, mz) || 1;
    const lit = 0.5 + 0.5 * (mz / length) + 0.15 * (my / length);
    const c = shade(color, lit, light, dark);
    for (const [px, p] of [
      [x0, a],
      [x1, a],
      [x1, b],
      [x0, a],
      [x1, b],
      [x0, b],
    ] as const) {
      positions.push(px, p.x, p.y);
      colors.push(c.r, c.g, c.b);
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

/** Bordure d'une extrémité : couleur, épaisseur et pointillés de la bordure 2D. */
function capOutline(shape: ShapeModel, section: Point[], defaults: BoxDefaults, x: number): Mesh | null {
  const color = styleColor(shape.style, 'strokeColor', defaults.stroke);
  const width = styleNumber(shape.style, 'strokeWidth', 1);
  if (!color || width <= 0) return null;
  const mesh = strokeMesh(section, color, styleOpacity(shape.style, 'strokeOpacity'), {
    width,
    closed: true,
    dash: dashPattern(shape.style, width),
  });
  if (!mesh) return null;
  mesh.name = 'stroke';
  mesh.renderOrder = PART_ORDER.stroke;
  toCrossSection(mesh, x);
  return mesh;
}

/**
 * Passe un mesh construit dans un plan (u, v) au plan vertical x = `x` de la page : u devient y
 * (profondeur au sol), v devient z (hauteur).
 */
function toCrossSection(mesh: Mesh, x: number): void {
  const position = mesh.geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i);
    const v = position.getY(i);
    position.setXYZ(i, x, u, v);
  }
  position.needsUpdate = true;
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
}
