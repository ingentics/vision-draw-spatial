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
import { COMPOSITE_KIND } from '../../kinds';
import { COMPOSITE, DEFAULT_COMPOSITE_STYLE, compositeStyle } from '../../composites/compositeLayout';

/**
 * Ensemble d'états (sujet 435) : même dessin que la région RDD (onglet du nom au-dessus du coin haut-gauche, d'un seul
 * contour avec lui ; mise en commun : idée 437), posé au fond de la pile. Déplacé, il emporte les formes du mode dont le
 * coin haut-gauche (le centre d'un point d'entrée ou de sortie) est dedans (`compositeLayout.ts`). C'est un état : il porte des transitions. Dans draw.io, un
 * rectangle de la même couleur, le nom posé au-dessus à gauche dans un cadre de la couleur de la bordure.
 */

const fontSizeOf = (shape: ShapeModel) => styleNumber(shape.style, 'fontSize', COMPOSITE.fontSize);

/**
 * Nom de l'ensemble sur son onglet (texte et place), undefined sans nom ; sa largeur est celle de la mesure du moteur
 * (`ctx`, sujet 377), la même pour le dessin, la prise au clic et les poignées.
 */
function tabText(shape: ShapeModel, ctx: MeasureContext): Rect | undefined {
  const text = shape.label.trim();
  if (!text) return undefined;
  const { height, padding } = COMPOSITE.tab;
  const width = ctx.measureText(text, { size: fontSizeOf(shape), bold: true, italic: false });
  return { x: shape.bounds.x + padding, y: shape.bounds.y - height, width, height };
}

/**
 * Partie droite de l'onglet, avant le S ; undefined sans nom. Le nom a la même marge des deux côtés : du bord gauche,
 * et jusqu'au milieu du S (sujet 228).
 */
function tabRect(shape: ShapeModel, ctx: MeasureContext): Rect | undefined {
  const text = tabText(shape, ctx);
  if (!text) return undefined;
  const { padding, curve } = COMPOSITE.tab;
  const width = 2 * padding + text.width - curve / 2;
  return { x: shape.bounds.x, y: text.y, width, height: text.height };
}

/**
 * Contour de l'onglet : bord gauche dans le prolongement de l'ensemble, coin haut-gauche carré, haut jusqu'après le
 * texte, puis un S (courbe de Bézier à tangentes horizontales) qui redescend jusqu'au bord haut de l'ensemble.
 */
function tabPath(shape: ShapeModel, ctx: MeasureContext): Point[] | undefined {
  const rect = tabRect(shape, ctx);
  if (!rect) return undefined;
  const { x, y: top, width, height } = rect;
  const bottom = top + height;
  const start = x + width;
  const end = start + COMPOSITE.tab.curve;
  const middle = (start + end) / 2;
  const from = { x: start, y: top };
  const curve = cubicTo(from, { x: middle, y: top }, { x: middle, y: bottom }, { x: end, y: bottom }, 12);
  return [{ x, y: bottom }, { x, y: top }, from, ...curve];
}

/** Emprise de l'ensemble et de son onglet : la prise au clic. */
function hitBounds(shape: ShapeModel, ctx: MeasureContext): Rect {
  const rect = tabRect(shape, ctx);
  const { bounds } = shape;
  if (!rect) return bounds;
  const right = Math.max(bounds.x + bounds.width, rect.x + rect.width + COMPOSITE.tab.curve);
  return { x: bounds.x, y: rect.y, width: right - bounds.x, height: bounds.y + bounds.height - rect.y };
}

/**
 * Contour de l'ensemble et de son onglet, d'un seul tenant : haut de l'onglet, S, bord haut de l'ensemble à droite de
 * l'onglet, puis le reste du rectangle ; le bord gauche file de bas en haut de l'onglet. Sans nom : le rectangle.
 */
function compositeOutline(shape: ShapeModel, ctx: MeasureContext): Point[] {
  const tab = tabPath(shape, ctx);
  if (!tab) return rectPath(shape.bounds);
  const { x, y, width, height } = shape.bounds;
  return [...tab.slice(1), { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }];
}

/** Rendu à plat : ensemble et onglet d'un seul contour (fond léger, bordure fine), nom en gras sur l'onglet. */
function createComposite(shape: ShapeModel, ctx: RenderContext): Group {
  const group = new Group();
  const { style } = shape;
  const path = compositeOutline(shape, ctx);
  const fill = styleColor(style, 'fillColor', DEFAULT_COMPOSITE_STYLE.fillColor);
  const fillOpacity = styleOpacity(style, 'fillOpacity');
  if (fill) group.add(fillMesh(path, fill, fillOpacity));
  const stroke = styleStroke(style, DEFAULT_COMPOSITE_STYLE.strokeColor);
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
      // Noir ou blanc, lisible sur le fond de l'onglet (celui de l'ensemble, sujet 227 ; opaque depuis le sujet 232, plus
      // léger dans un fichier qui porte un `fillOpacity`).
      color: new Color(readableOn(fill ?? DEFAULT_COMPOSITE_STYLE.fillColor, fill ? fillOpacity : 0)),
      opacity: 1,
      bold: true,
    },
    shape.id,
  );
  label.name = 'composite-label';
  group.add(label);
  return group;
}

export const definition: ShapeDefinition = {
  id: COMPOSITE_KIND,
  outline: compositeOutline,
  flat: { create: createComposite },
  // Tout l'ensemble et son onglet (pas la bande vide à droite de l'onglet).
  contains: (shape, point, ctx) => insidePolygon(compositeOutline(shape, ctx), point),
  hitBounds,
  // Poignée haut-gauche au coin de l'onglet (sujet 344).
  movedHandles: (shape, ctx) => {
    const rect = tabRect(shape, ctx);
    return rect ? { nw: { x: rect.x, y: rect.y } } : {};
  },
  // Sélectionné, ni contour ni voile : ses poignées suffisent.
  selectionStyle: 'none',
  // Dans une sélection multiple, le contour le distingue des autres éléments.
  multiSelectionStyle: 'outline',
  // Texte brut : son nom s'édite sans mise en forme ni panneau de format, comme celui d'un état.
  plainText: true,
  // Éditeur en place exactement sur le nom dessiné (sans nom : à sa place, sur l'onglet à venir).
  textZone: (shape, _level, ctx) =>
    tabText(shape, ctx) ?? {
      x: shape.bounds.x + COMPOSITE.tab.padding,
      y: shape.bounds.y - COMPOSITE.tab.height,
      width: COMPOSITE.tab.padding,
      height: COMPOSITE.tab.height,
    },
  // Le nom dessiné : aligné à gauche, centré en hauteur, sans marge dans sa zone ; éditeur sans fond (sujet 229), le
  // fond du label pour draw.io n'est pas dessiné.
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
    name: 'Ensemble',
    category: 'states',
    order: 2,
    keywords: ['composite', 'ensemble', 'group', 'groupe', 'état composite'],
    style:
      `rounded=0;whiteSpace=wrap;html=1;${compositeStyle(DEFAULT_COMPOSITE_STYLE)}` +
      `align=left;verticalAlign=bottom;verticalLabelPosition=top;fontStyle=1;fontSize=${COMPOSITE.fontSize};` +
      `spatial.kind=${COMPOSITE_KIND};`,
    value: 'Ensemble',
    width: COMPOSITE.width,
    height: COMPOSITE.height,
    atBack: true,
    icon: '<path d="M3 25V4h12c3 0 3 5 6 5h16v16z"/>',
  },
};
