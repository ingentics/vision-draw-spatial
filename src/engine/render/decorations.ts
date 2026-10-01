import { Color, Group } from 'three';
import type { LinkModel, Point, Rect, ShapeModel } from '../model/types';
import { ellipsePath, rectPath } from './geometry/paths';
import { fillMesh, strokeMesh } from './meshes';
import { PART_ORDER } from './types';

const LINK_COLOR = new Color('#1a73e8');
const WHITE = new Color('#ffffff');
const SELECTION_COLOR = new Color('#1a73e8');
/** Rayon de la pastille de lien, en pixels de page. */
const BADGE_RADIUS = 6;

/**
 * Pastille de lien au coin haut-droit d'une forme (SPEC §11.4) : flèche droite pour un lien
 * vers une page, flèche oblique (sortante) pour une URL.
 */
export function linkBadge(shape: ShapeModel, link: LinkModel): Group {
  const group = new Group();
  group.name = 'link-badge';
  const c = { x: shape.bounds.x + shape.bounds.width, y: shape.bounds.y };
  const disc = fillMesh(
    ellipsePath(
      { x: c.x - BADGE_RADIUS, y: c.y - BADGE_RADIUS, width: 2 * BADGE_RADIUS, height: 2 * BADGE_RADIUS },
      24,
    ),
    LINK_COLOR,
    1,
  );
  const r = BADGE_RADIUS * 0.45;
  const glyph: Point[][] =
    link.type === 'page'
      ? [
          // →
          [
            { x: c.x - r, y: c.y },
            { x: c.x + r, y: c.y },
          ],
          [
            { x: c.x + r * 0.2, y: c.y - r * 0.8 },
            { x: c.x + r, y: c.y },
            { x: c.x + r * 0.2, y: c.y + r * 0.8 },
          ],
        ]
      : [
          // ↗
          [
            { x: c.x - r, y: c.y + r },
            { x: c.x + r, y: c.y - r },
          ],
          [
            { x: c.x - r * 0.1, y: c.y - r },
            { x: c.x + r, y: c.y - r },
            { x: c.x + r, y: c.y + r * 0.1 },
          ],
        ];
  group.add(disc);
  for (const stroke of glyph) {
    const mesh = strokeMesh(stroke, WHITE, 1, { width: 1.3, closed: false });
    if (mesh) group.add(mesh);
  }
  // Au-dessus du label de la forme.
  group.traverse((o) => {
    o.renderOrder = PART_ORDER.label + 1;
  });
  return group;
}

/**
 * Contour de sélection, d'épaisseur constante à l'écran (reconstruit quand le zoom change).
 * `phase` : décalage des tirets en pixels écran (contour animé : les tirets défilent).
 */
export function selectionOutline(bounds: Rect, zoom: number, phase = 0): Group {
  const group = new Group();
  group.name = 'selection';
  const gap = 3 / zoom;
  const outline = strokeMesh(
    rectPath({
      x: bounds.x - gap,
      y: bounds.y - gap,
      width: bounds.width + 2 * gap,
      height: bounds.height + 2 * gap,
    }),
    SELECTION_COLOR,
    1,
    { width: 1.5 / zoom, closed: true, dash: [5 / zoom, 3 / zoom], dashOffset: phase / zoom },
  );
  if (outline) group.add(outline);
  // Toujours au-dessus de tout le contenu de la page.
  group.traverse((o) => {
    o.renderOrder = Number.MAX_SAFE_INTEGER;
  });
  return group;
}
