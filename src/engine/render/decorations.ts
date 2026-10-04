import { Color, Group, SRGBColorSpace } from 'three';
import type { EdgeModel, LinkModel, Point, Rect, ShapeModel } from '../model/types';
import type { EdgeBadge } from '../modes/types';
import { labelPoint } from './edges/polyline';
import { styleNumber } from './styleValues';
import type { EdgeBadgeStyle, RenderContext } from './types';
import { ellipsePath, rectPath } from './geometry/paths';
import { fillMesh, strokeMesh } from './meshes';
import { PART_ORDER } from './types';

/** Couleur d'accent par défaut (paramètre `selection.accentColor`). */
export const DEFAULT_ACCENT = '#1a73e8';
const WHITE = new Color('#ffffff');
/** Rayon de la pastille de lien, en pixels de page. */
const BADGE_RADIUS = 6;

/**
 * Pastille de lien au coin haut-droit d'une forme (SPEC §11.4) : flèche droite pour un lien
 * vers une page, flèche oblique (sortante) pour une URL.
 */
export function linkBadge(shape: ShapeModel, link: LinkModel, accent = DEFAULT_ACCENT): Group {
  const group = new Group();
  group.name = 'link-badge';
  const c = { x: shape.bounds.x + shape.bounds.width, y: shape.bounds.y };
  const disc = fillMesh(
    ellipsePath(
      { x: c.x - BADGE_RADIUS, y: c.y - BADGE_RADIUS, width: 2 * BADGE_RADIUS, height: 2 * BADGE_RADIUS },
      24,
    ),
    new Color(accent),
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

/** Pastille d'une flèche par défaut (paramètres « Pastilles des flèches »). */
export const DEFAULT_EDGE_BADGE: EdgeBadgeStyle = {
  radius: 12,
  textSize: 15,
  smallRadius: 5.5,
  smallTextSize: 7,
  borderColor: '#000000',
  borderWidth: 1,
  textColor: '#000000',
  bold: false,
  gap: 2,
};
/**
 * Hauteur des chiffres en fraction de la taille du texte (Roboto : 1456 / 2048) : la ligne de base est posée à une
 * demi-hauteur sous le centre, pour centrer les chiffres eux-mêmes (et non la ligne, qui réserve les jambages).
 */
const DIGIT_HEIGHT = 0.71;

/**
 * Pastille ronde d'une flèche (mode de page, ex. rang dans un flux) : au-dessus du texte du milieu, ou plus petite
 * au milieu de la flèche sans texte. Elle fait face à la caméra (`userData.billboard = 'screen'`) : « au-dessus »
 * est le haut de l'écran, quel que soit l'angle de vue.
 */
export function edgeBadge(edge: EdgeModel, route: Point[], badge: EdgeBadge, ctx: RenderContext): Group {
  const labelled = edge.label.trim() !== '' && edge.style.noLabel !== '1';
  const look = ctx.edgeBadge ?? DEFAULT_EDGE_BADGE;
  const radius = labelled ? look.radius : look.smallRadius;
  const fontSize = labelled ? look.textSize : look.smallTextSize;
  const anchor = labelPoint(
    route,
    labelled ? edge.labelPlacement : { position: 0, distance: 0, offset: { x: 0, y: 0 } },
  );
  // Hauteur estimée du texte (sa mise en page est asynchrone) : lignes × interligne.
  const lines = edge.rich?.length ?? edge.label.split('\n').length;
  const textHeight = lines * styleNumber(edge.style, 'fontSize', 11) * 1.2;
  const above =
    edge.style.verticalAlign === 'top' ? 0 : edge.style.verticalAlign === 'bottom' ? textHeight : textHeight / 2;
  const lift = labelled ? above + look.gap + radius : 0;

  const group = new Group();
  group.name = 'edge-badge';
  group.userData.billboard = 'screen';
  group.position.set(anchor.x, anchor.y, 0.2);
  const circle = ellipsePath({ x: -radius, y: -lift - radius, width: 2 * radius, height: 2 * radius }, 48);
  const disc = fillMesh(circle, new Color(badge.color), 1);
  disc.renderOrder = PART_ORDER.label + 1;
  const outline =
    look.borderWidth > 0
      ? strokeMesh(circle, new Color(look.borderColor), 1, { width: look.borderWidth, closed: true })
      : null;
  if (outline) outline.renderOrder = PART_ORDER.label + 1.25;
  const text = ctx.text.create({
    text: badge.text,
    x: 0,
    y: -lift + (DIGIT_HEIGHT * fontSize) / 2,
    anchorX: 'center',
    anchorY: 'bottom-baseline',
    align: 'center',
    fontSize,
    color: new Color(look.textColor),
    opacity: 1,
    bold: look.bold,
  });
  text.renderOrder = PART_ORDER.label + 1.5;
  group.add(disc, text);
  if (outline) group.add(outline);
  return group;
}

/**
 * Contour de sélection, d'épaisseur constante à l'écran (reconstruit quand le zoom change).
 * `phase` : décalage des tirets en pixels écran (contour animé : les tirets défilent).
 */
export function selectionOutline(bounds: Rect, zoom: number, phase = 0, accent = DEFAULT_ACCENT): Group {
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
    new Color(accent),
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

/**
 * Zone liée, mise en évidence pendant que la touche pour suivre un lien est maintenue (SPEC §11.1) :
 * voile d'accent léger et contour plein, d'épaisseur constante à l'écran, au-dessus de tout.
 */
export function linkZone(bounds: Rect, zoom: number, accent = DEFAULT_ACCENT): Group {
  const group = new Group();
  group.name = 'link-zone';
  const gap = 2 / zoom;
  const path = rectPath({
    x: bounds.x - gap,
    y: bounds.y - gap,
    width: bounds.width + 2 * gap,
    height: bounds.height + 2 * gap,
  });
  const color = new Color(accent);
  group.add(fillMesh(path, color, 0.14));
  const outline = strokeMesh(path, color, 1, { width: 2 / zoom, closed: true });
  if (outline) group.add(outline);
  group.traverse((o) => {
    o.renderOrder = Number.MAX_SAFE_INTEGER;
  });
  return group;
}

/** Couleur assombrie (luminosité × (1 − `amount`), en HSL sRGB) : trait d'une flèche colorée par un mode. */
export function darken(color: string, amount: number): string {
  const hsl = { h: 0, s: 0, l: 0 };
  new Color(color).getHSL(hsl, SRGBColorSpace);
  return `#${new Color().setHSL(hsl.h, hsl.s, hsl.l * (1 - amount), SRGBColorSpace).getHexString()}`;
}
