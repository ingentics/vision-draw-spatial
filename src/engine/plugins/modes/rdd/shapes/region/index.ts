import { Color, Group } from 'three';
import {
  fillMesh,
  insidePolygon,
  rectPath,
  strokeMesh,
  styleColor,
  styleNumber,
  styleOpacity,
  styleStroke,
  cubicTo,
  labelObject,
  readableOn,
} from '../../../../../core/plugins';
import type {
  MeasureContext,
  Point,
  Rect,
  RenderContext,
  ShapeDefinition,
  ShapeModel,
} from '../../../../../core/plugins';
import { DEFAULT_REGION_STYLE, REGION, REGION_KIND, regionStyle } from '../../regions/regionLayout';

/**
 * Région (sujets 182, 227, 232) : rectangle à fond opaque et bordure fine, posé au fond de la pile ; son nom est sur un
 * onglet au-dessus de son coin haut-gauche, d'un seul contour avec elle (même fond, même bordure). Déplacée, elle
 * emporte les formes du mode dont le coin haut-gauche est dedans (`regions.ts`). Dans draw.io, un rectangle de la même
 * couleur, le nom posé au-dessus à gauche dans un cadre de la couleur de la bordure (son contenu n'y suit pas ses
 * déplacements).
 */

const fontSizeOf = (shape: ShapeModel) => styleNumber(shape.style, 'fontSize', REGION.fontSize);

/**
 * Nom de la région sur son onglet (texte et place), undefined sans nom ; sa largeur est celle de la mesure du moteur
 * (`ctx`, sujet 377), la même pour le dessin, la prise au clic et les poignées.
 */
function tabText(shape: ShapeModel, ctx: MeasureContext): Rect | undefined {
  const text = shape.label.trim();
  if (!text) return undefined;
  const { height, padding } = REGION.tab;
  const width = ctx.measureText(text, { size: fontSizeOf(shape), bold: true, italic: false });
  return { x: shape.bounds.x + padding, y: shape.bounds.y - height, width, height };
}

/**
 * Partie droite de l'onglet, avant le S ; undefined sans nom. Le nom a la même marge des deux côtés : du bord gauche,
 * et jusqu'au milieu du S (sujet 228).
 */
export function tabRect(shape: ShapeModel, ctx: MeasureContext): Rect | undefined {
  const text = tabText(shape, ctx);
  if (!text) return undefined;
  const { padding, curve } = REGION.tab;
  const width = 2 * padding + text.width - curve / 2;
  return { x: shape.bounds.x, y: text.y, width, height: text.height };
}

/**
 * Contour de l'onglet : bord gauche dans le prolongement de la région, coin haut-gauche carré, haut jusqu'après le
 * texte, puis un S (courbe de Bézier à tangentes horizontales) qui redescend jusqu'au bord haut de la région.
 */
export function tabPath(shape: ShapeModel, ctx: MeasureContext): Point[] | undefined {
  const rect = tabRect(shape, ctx);
  if (!rect) return undefined;
  const { x, y: top, width, height } = rect;
  const bottom = top + height;
  const start = x + width;
  const end = start + REGION.tab.curve;
  const middle = (start + end) / 2;
  const from = { x: start, y: top };
  const curve = cubicTo(from, { x: middle, y: top }, { x: middle, y: bottom }, { x: end, y: bottom }, 12);
  return [{ x, y: bottom }, { x, y: top }, from, ...curve];
}

/** Emprise de la région et de son onglet : la prise au clic. */
function hitBounds(shape: ShapeModel, ctx: MeasureContext): Rect {
  const rect = tabRect(shape, ctx);
  const { bounds } = shape;
  if (!rect) return bounds;
  const right = Math.max(bounds.x + bounds.width, rect.x + rect.width + REGION.tab.curve);
  return { x: bounds.x, y: rect.y, width: right - bounds.x, height: bounds.y + bounds.height - rect.y };
}

/**
 * Contour de la région et de son onglet, d'un seul tenant : haut de l'onglet, S, bord haut de la région à droite de
 * l'onglet, puis le reste du rectangle ; le bord gauche file de bas en haut de l'onglet. Sans nom : le rectangle.
 */
export function regionOutline(shape: ShapeModel, ctx: MeasureContext): Point[] {
  const tab = tabPath(shape, ctx);
  if (!tab) return rectPath(shape.bounds);
  const { x, y, width, height } = shape.bounds;
  return [...tab.slice(1), { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }];
}

/** Rendu à plat : région et onglet d'un seul contour (fond léger, bordure fine), nom en gras sur l'onglet. */
function createRegion(shape: ShapeModel, ctx: RenderContext): Group {
  const group = new Group();
  group.name = `shape:${shape.id}`;
  const { style } = shape;
  const path = regionOutline(shape, ctx);
  const fill = styleColor(style, 'fillColor', DEFAULT_REGION_STYLE.fillColor);
  const fillOpacity = styleOpacity(style, 'fillOpacity');
  if (fill) group.add(fillMesh(path, fill, fillOpacity));
  const stroke = styleStroke(style, DEFAULT_REGION_STYLE.strokeColor);
  const border =
    stroke && strokeMesh(path, stroke.color, stroke.opacity, { width: stroke.width, closed: true, dash: stroke.dash });
  if (border) group.add(border);

  const text = tabText(shape, ctx);
  if (!text) return group;
  const label = labelObject(
    ctx,
    {
      text: shape.label.trim(),
      x: text.x,
      y: text.y + text.height / 2,
      anchorX: 'left',
      anchorY: 'middle',
      align: 'left',
      fontSize: fontSizeOf(shape),
      // Noir ou blanc, lisible sur le fond de l'onglet (celui de la région, sujet 227 ; opaque depuis le sujet 232, plus
      // léger dans un fichier qui porte un `fillOpacity`).
      color: new Color(readableOn(fill ?? DEFAULT_REGION_STYLE.fillColor, fill ? fillOpacity : 0)),
      opacity: 1,
      bold: true,
    },
    shape.id,
  );
  label.name = 'region-label';
  group.add(label);
  return group;
}

export const definition: ShapeDefinition = {
  id: REGION_KIND,
  outline: regionOutline,
  flat: { create: createRegion },
  // Toute la région et son onglet (pas la bande vide à droite de l'onglet).
  contains: (shape, point, ctx) => insidePolygon(regionOutline(shape, ctx), point),
  hitBounds,
  // Poignée haut-gauche au coin de l'onglet (sujet 344).
  movedHandles: (shape, ctx) => {
    const rect = tabRect(shape, ctx);
    return rect ? { nw: { x: rect.x, y: rect.y } } : {};
  },
  // Sélectionnée, ni contour ni voile : ses poignées suffisent (sujet 330).
  selectionStyle: 'none',
  // Dans une sélection multiple, le contour la distingue des autres éléments (sujet 346).
  multiSelectionStyle: 'outline',
  // Une région n'a pas de flèche (sujet 265).
  connectable: false,
  // Texte brut : son nom s'édite sans mise en forme ni panneau de format, comme celui d'une table (sujets 258, 371).
  plainText: true,
  // Éditeur en place exactement sur le nom dessiné (sans nom : à sa place, sur l'onglet à venir).
  textZone: (shape, _level, ctx) =>
    tabText(shape, ctx) ?? {
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
      `rounded=0;whiteSpace=wrap;html=1;${regionStyle(DEFAULT_REGION_STYLE)}` +
      `align=left;verticalAlign=bottom;verticalLabelPosition=top;fontStyle=1;fontSize=${REGION.fontSize};` +
      `spatial.kind=${REGION_KIND};`,
    value: 'Région',
    width: REGION.width,
    height: REGION.height,
    atBack: true,
    icon: '<path d="M3 25V4h12c3 0 3 5 6 5h16v16z"/>',
  },
};
