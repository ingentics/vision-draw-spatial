import { Color, Group, SRGBColorSpace } from 'three';
import type { EdgeModel, Point, Rect } from '../model/types';
import type { EdgeBadge } from '../modes/dressing';
import { labelPoint } from './edges/polyline';
import { styleNumber, styleFlag } from '../model/styleValues';
import type { EdgeBadgeStyle, RenderContext } from './types';
import { ellipsePath } from './geometry/paths';
import { fillMesh, strokeMesh } from './meshes';
import { PART_ORDER } from './types';
import { inflate, rectPath } from '../model/geometry';

/** Couleur d'accent par défaut (paramètre `selection.accentColor`). */
export const DEFAULT_ACCENT = '#1a73e8';
/** Pastille d'une flèche par défaut, quand le mode n'en donne pas l'apparence (`PageDressing.edgeBadgeStyle`). */
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
  faceCamera: true,
  labelFaceCamera: true,
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
export function edgeBadge(
  edge: EdgeModel,
  route: Point[],
  badge: EdgeBadge,
  look: EdgeBadgeStyle,
  ctx: RenderContext,
): Group {
  const labelled = edge.label.trim() !== '' && !styleFlag(edge.style, 'noLabel');
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
  if (look.faceCamera) group.userData.billboard = 'screen';
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
  const outline = strokeMesh(rectPath(inflate(bounds, gap)), new Color(accent), 1, {
    width: 1.5 / zoom,
    closed: true,
    dash: [5 / zoom, 3 / zoom],
    dashOffset: phase / zoom,
  });
  if (outline) group.add(outline);
  // Toujours au-dessus de tout le contenu de la page.
  group.traverse((o) => {
    o.renderOrder = Number.MAX_SAFE_INTEGER;
  });
  return group;
}

/**
 * Partie sélectionnée d'une forme (sujet 249, ex. champ d'une table RDD) : fond léger et trait plein de la couleur
 * d'accent, sur l'emprise de la partie ; partie survolée (`hover`, sujet 259) : fond plus léger, trait fin à demi
 * transparent.
 */
export function partSelection(bounds: Rect, zoom: number, accent = DEFAULT_ACCENT, hover = false): Group {
  const group = new Group();
  group.name = hover ? 'part-hover' : 'part-selection';
  const color = new Color(accent);
  group.add(fillMesh(rectPath(bounds), color, hover ? 0.07 : 0.15));
  const outline = strokeMesh(rectPath(bounds), color, hover ? 0.5 : 1, {
    width: (hover ? 1 : 1.5) / zoom,
    closed: true,
  });
  if (outline) group.add(outline);
  group.traverse((o) => {
    o.renderOrder = Number.MAX_SAFE_INTEGER;
  });
  return group;
}

/**
 * Sélection d'une silhouette debout (Actor en iso / 3D) : cercle autour de sa tête `head` (cadre dans le plan de la
 * silhouette : x horizontal, y vers le haut), posé en `at` et tourné face à la caméra comme elle
 * (`userData.billboard`). Pointillé si `dashed` (tirets décalés de `phase` pixels écran), plein sinon.
 */
export function headSelectionRing(
  head: Rect,
  at: { x: number; y: number; z: number },
  zoom: number,
  options: { phase?: number; accent?: string; dashed: boolean },
): Group {
  const group = new Group();
  group.name = 'selection-head';
  group.userData.billboard = true;
  group.position.set(at.x, at.y, at.z);
  // Plan (x, y) couché sur (x, z), juste devant la silhouette (vers la caméra, −y).
  const plane = new Group();
  plane.rotation.x = Math.PI / 2;
  plane.position.y = -0.2;
  const gap = 3 / zoom;
  const ring = strokeMesh(
    ellipsePath(inflate(head, gap), 48),
    new Color(options.accent ?? DEFAULT_ACCENT),
    1,
    options.dashed
      ? { width: 1.5 / zoom, closed: true, dash: [5 / zoom, 3 / zoom], dashOffset: (options.phase ?? 0) / zoom }
      : { width: 2 / zoom, closed: true },
  );
  if (ring) plane.add(ring);
  group.add(plane);
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
  const path = rectPath(inflate(bounds, gap));
  const color = new Color(accent);
  group.add(fillMesh(path, color, 0.14));
  const outline = strokeMesh(path, color, 1, { width: 2 / zoom, closed: true });
  if (outline) group.add(outline);
  group.traverse((o) => {
    o.renderOrder = Number.MAX_SAFE_INTEGER;
  });
  return group;
}

/**
 * Couleur assombrie (luminosité × (1 − `amount`), en HSL sRGB) : trait d'une flèche colorée par un mode. Garde la
 * teinte perçue ; pour un retrait de gravure comme draw.io, voir `shade` (RVB).
 */
export function darken(color: string, amount: number): string {
  const hsl = { h: 0, s: 0, l: 0 };
  new Color(color).getHSL(hsl, SRGBColorSpace);
  return `#${new Color().setHSL(hsl.h, hsl.s, hsl.l * (1 - amount), SRGBColorSpace).getHexString()}`;
}

/**
 * Couleur éclaircie : chaque composante RVB sRGB rapprochée du blanc de `amount` (0 : inchangée, 1 : blanc). Fond d'une
 * région du mode RDD, plus clair que la couleur de son style (sujet 345).
 */
export function lighten(color: string | Color, amount: number): string {
  const rgb = { r: 0, g: 0, b: 0 };
  new Color(color).getRGB(rgb, SRGBColorSpace);
  const mix = (value: number) => value + (1 - value) * amount;
  return `#${new Color().setRGB(mix(rgb.r), mix(rgb.g), mix(rgb.b), SRGBColorSpace).getHexString()}`;
}

/**
 * Couleur × `factor` en RVB (#rrggbb), `color` en #rrggbb ou en `Color` : retrait des gravures et des socles, comme
 * draw.io. Diffère de `darken` (HSL), d'où deux noms.
 */
export function shade(color: string | Color, factor: number): string {
  return `#${new Color(color).multiplyScalar(factor).getHexString()}`;
}
