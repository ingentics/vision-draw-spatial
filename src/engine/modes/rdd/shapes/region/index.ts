import { Color, Group } from 'three';
import { insidePolygon } from '../../../../model/geometry';
import type { Point, Rect, ShapeModel } from '../../../../model/types';
import { rectPath } from '../../../../render/geometry/paths';
import { fillMesh, strokeMesh } from '../../../../render/meshes';
import { measureText } from '../../../../render/textMeasure';
import { styleColor, styleNumber, styleOpacity } from '../../../../render/styleValues';
import { PART_ORDER } from '../../../../render/types';
import type { RenderContext } from '../../../../render/types';
import type { ShapeDefinition } from '../../../../shapes/types';
import { DEFAULT_REGION_COLOR, REGION, REGION_KIND, regionLabelStyle, regionTextColor } from '../../regions';

/**
 * Région (sujets 182, 227, 232) : rectangle à fond opaque et bordure fine, posé au fond de la pile ; son nom est sur un
 * onglet au-dessus de son coin haut-gauche, d'un seul contour avec elle (même fond, même bordure). Déplacée, elle
 * emporte les formes du mode dont le coin haut-gauche est dedans (`regions.ts`). Dans draw.io, un rectangle de la même
 * couleur, le nom posé au-dessus à gauche dans un cadre de la couleur de la bordure (son contenu n'y suit pas ses
 * déplacements).
 */

const fontSizeOf = (shape: ShapeModel) => styleNumber(shape.style, 'fontSize', REGION.fontSize);

/** Nom de la région sur son onglet (texte et place), undefined sans nom. */
function tabText(shape: ShapeModel): Rect | undefined {
  const text = shape.label.trim();
  if (!text) return undefined;
  const { height, padding } = REGION.tab;
  const width = measureText(text, { size: fontSizeOf(shape), bold: true, italic: false });
  return { x: shape.bounds.x + padding, y: shape.bounds.y - height, width, height };
}

/**
 * Partie droite de l'onglet, avant le S ; undefined sans nom. Le nom a la même marge des deux côtés : du bord gauche,
 * et jusqu'au milieu du S (sujet 228).
 */
export function tabRect(shape: ShapeModel): Rect | undefined {
  const text = tabText(shape);
  if (!text) return undefined;
  const { padding, curve } = REGION.tab;
  const width = 2 * padding + text.width - curve / 2;
  return { x: shape.bounds.x, y: text.y, width, height: text.height };
}

/**
 * Contour de l'onglet : bord gauche dans le prolongement de la région, coin haut-gauche carré, haut jusqu'après le
 * texte, puis un S (courbe de Bézier à tangentes horizontales) qui redescend jusqu'au bord haut de la région.
 */
export function tabPath(shape: ShapeModel): Point[] | undefined {
  const rect = tabRect(shape);
  if (!rect) return undefined;
  const { x, y: top, width, height } = rect;
  const bottom = top + height;
  const start = x + width;
  const end = start + REGION.tab.curve;
  const middle = (start + end) / 2;
  const steps = 12;
  const curve = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return {
      x: u * u * u * start + 3 * u * t * (u + t) * middle + t * t * t * end,
      y: u * u * (u + 3 * t) * top + t * t * (3 * u + t) * bottom,
    };
  });
  return [{ x, y: bottom }, { x, y: top }, ...curve];
}

/** Emprise de la région et de son onglet : la prise au clic. */
function hitBounds(shape: ShapeModel): Rect {
  const rect = tabRect(shape);
  const { bounds } = shape;
  if (!rect) return bounds;
  const right = Math.max(bounds.x + bounds.width, rect.x + rect.width + REGION.tab.curve);
  return { x: bounds.x, y: rect.y, width: right - bounds.x, height: bounds.y + bounds.height - rect.y };
}

/**
 * Contour de la région et de son onglet, d'un seul tenant : haut de l'onglet, S, bord haut de la région à droite de
 * l'onglet, puis le reste du rectangle ; le bord gauche file de bas en haut de l'onglet. Sans nom : le rectangle.
 */
export function regionOutline(shape: ShapeModel): Point[] {
  const tab = tabPath(shape);
  if (!tab) return rectPath(shape.bounds);
  const { x, y, width, height } = shape.bounds;
  return [...tab.slice(1), { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }];
}

/** Rendu à plat : région et onglet d'un seul contour (fond léger, bordure fine), nom en gras sur l'onglet. */
function createRegion(shape: ShapeModel, ctx: RenderContext): Group {
  const group = new Group();
  group.name = `shape:${shape.id}`;
  const { style } = shape;
  const path = regionOutline(shape);
  const fill = styleColor(style, 'fillColor', DEFAULT_REGION_COLOR);
  const fillOpacity = styleOpacity(style, 'fillOpacity');
  if (fill) group.add(fillMesh(path, fill, fillOpacity));
  const stroke = styleColor(style, 'strokeColor', REGION.stroke);
  const border =
    stroke &&
    strokeMesh(path, stroke, styleOpacity(style, 'strokeOpacity'), {
      width: styleNumber(style, 'strokeWidth', 1),
      closed: true,
    });
  if (border) group.add(border);

  const text = tabText(shape);
  if (!text) return group;
  const label = ctx.text.create({
    text: shape.label.trim(),
    x: text.x,
    y: text.y + text.height / 2,
    anchorX: 'left',
    anchorY: 'middle',
    align: 'left',
    fontSize: fontSizeOf(shape),
    color: new Color(
      regionTextColor(`#${(fill ?? new Color(DEFAULT_REGION_COLOR)).getHexString()}`, fill ? fillOpacity : 0),
    ),
    opacity: 1,
    bold: true,
  });
  label.name = 'region-label';
  // L'éditeur en place masque le nom pendant la saisie.
  label.userData.labelCellId = shape.id;
  label.renderOrder = PART_ORDER.label;
  group.add(label);
  return group;
}

export const definition: ShapeDefinition = {
  id: REGION_KIND,
  outline: regionOutline,
  flat: { create: createRegion },
  // Toute la région et son onglet (pas la bande vide à droite de l'onglet).
  contains: (shape, point) => insidePolygon(regionOutline(shape), point),
  hitBounds,
  // Éditeur en place exactement sur le nom dessiné (sans nom : à sa place, sur l'onglet à venir).
  textZone: (shape) =>
    tabText(shape) ?? {
      x: shape.bounds.x + REGION.tab.padding,
      y: shape.bounds.y - REGION.tab.height,
      width: REGION.tab.padding,
      height: REGION.tab.height,
    },
  // Le nom dessiné : aligné à gauche, centré en hauteur, sans marge dans sa zone ; éditeur sans fond (sujet 229), le
  // fond du label pour draw.io (`labelBackgroundColor` des régions du sujet 226) n'est pas dessiné.
  editStyle: (style) => ({
    ...style,
    align: 'left',
    verticalAlign: 'middle',
    spacing: '0',
    spacingTop: '0',
    spacingLeft: '0',
    spacingRight: '0',
    spacingBottom: '0',
    whiteSpace: 'nowrap',
    labelBackgroundColor: 'none',
  }),
  palette: {
    name: 'Région',
    category: 'rdd',
    order: 6,
    keywords: ['région', 'region', 'zone', 'domaine', 'groupe', 'cadre'],
    style:
      `rounded=0;whiteSpace=wrap;html=1;fillColor=${DEFAULT_REGION_COLOR};` +
      `strokeColor=${REGION.stroke};${regionLabelStyle(DEFAULT_REGION_COLOR)}` +
      `align=left;verticalAlign=bottom;verticalLabelPosition=top;fontStyle=1;fontSize=${REGION.fontSize};` +
      `spatial.kind=${REGION_KIND};`,
    value: 'Région',
    width: REGION.width,
    height: REGION.height,
    atBack: true,
    icon: '<path d="M3 25V4h12c3 0 3 5 6 5h16v16z"/>',
  },
};
