import { Color, Group } from 'three';
import type { Point, Rect, ShapeModel } from '../../../../model/types';
import { createLabel } from '../../../../render/flat/box';
import { cornerRadius, rectPath, roundedRectPath } from '../../../../render/geometry/paths';
import { dashPattern } from '../../../../render/geometry/stroke';
import { fillMesh, strokeMesh } from '../../../../render/meshes';
import { readableOn, styleColor, styleNumber, styleOpacity } from '../../../../render/styleValues';
import { PART_ORDER } from '../../../../render/types';
import type { RenderContext } from '../../../../render/types';
import type { PaletteEntry, ShapeDefinition } from '../../../../shapes/types';
import {
  DEFAULT_HEADER_COLOR,
  FIELDS,
  PRIMARY_KEY,
  SECONDARY_SCALE,
  TABLE,
  TABLE_KINDS,
  headerHeight,
  isSecondary,
  missingName,
  tableFields,
  tableHeight,
} from '../../tables';
import type { TableKind } from '../../tables';

/** Rendu et fabrique des tables du mode RDD (sujet 179), communs à ses formes (`shapes/<forme>/`). */

const BORDER = '#666666';
const FIELDS_FILL = '#ffffff';

const scaleOf = (shape: ShapeModel) => (isSecondary(shape) ? SECONDARY_SCALE : 1);

/** Zone du nom : l'entête (label dessiné et éditeur en place). */
function nameZone(shape: ShapeModel): Rect {
  const { x, y, width } = shape.bounds;
  return { x, y, width, height: headerHeight(isSecondary(shape)) };
}

/** Côté du coin plié d'un document, à l'échelle de la table (au plus la moitié de l'entête). */
const foldOf = (shape: ShapeModel) => Math.min(TABLE.fold * scaleOf(shape), headerHeight(isSecondary(shape)) / 2);

/**
 * Contour d'une table : rectangle, arrondi avec `rounded=1` (vue), coin haut-droit coupé en biais pour un document
 * (coin plié). Toujours convexe : l'entête s'y découpe en bornant les ordonnées.
 */
function outline(shape: ShapeModel, kind: TableKind): Point[] {
  const { bounds, style } = shape;
  const { x, y, width: w, height: h } = bounds;
  if (kind.folded) {
    const f = foldOf(shape);
    return [
      { x, y },
      { x: x + w - f, y },
      { x: x + w, y: y + f },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }
  return style.rounded === '1' ? roundedRectPath(bounds, cornerRadius(style, bounds)) : rectPath(bounds);
}

/** Rabat du coin plié : triangle replié sous le coin coupé. */
function flapOf(shape: ShapeModel): Point[] {
  const { x, y, width: w } = shape.bounds;
  const f = foldOf(shape);
  return [
    { x: x + w - f, y },
    { x: x + w - f, y: y + f },
    { x: x + w, y: y + f },
  ];
}

/**
 * Rendu à plat d'une table : zone des champs blanche, entête de la couleur `fillColor` (texte noir ou blanc selon le
 * contraste), séparés d'un trait ; un champ par ligne, aligné à gauche ; coin plié d'un document.
 */
function createTable(shape: ShapeModel, ctx: RenderContext, kind: TableKind): Group {
  const group = new Group();
  group.name = `shape:${shape.id}`;
  const { bounds, style } = shape;
  const scale = scaleOf(shape);
  const header = Math.min(bounds.height, headerHeight(isSecondary(shape)));
  const headerColor = styleColor(style, 'fillColor', DEFAULT_HEADER_COLOR) ?? new Color(DEFAULT_HEADER_COLOR);
  const textColor = readableOn(`#${headerColor.getHexString()}`);

  const path = outline(shape, kind);
  group.add(fillMesh(path, new Color(FIELDS_FILL), styleOpacity(style, 'fillOpacity')));
  // Haut du contour (convexe), coupé sous l'entête : coins arrondis du haut compris.
  const headerPath = path.map((p) => ({ x: p.x, y: Math.min(p.y, bounds.y + header) }));
  const headerFill = fillMesh(headerPath, headerColor, styleOpacity(style, 'fillOpacity'));
  headerFill.name = 'fill-header';
  headerFill.renderOrder = PART_ORDER.fill + 0.5;
  group.add(headerFill);
  if (kind.folded) {
    // Rabat un peu plus sombre que l'entête : le revers de la page.
    const flap = fillMesh(flapOf(shape), headerColor.clone().multiplyScalar(0.85), styleOpacity(style, 'fillOpacity'));
    flap.name = 'fill-fold';
    flap.renderOrder = PART_ORDER.fill + 0.75;
    group.add(flap);
  }

  const stroke = styleColor(style, 'strokeColor', BORDER);
  const width = styleNumber(style, 'strokeWidth', 1);
  if (stroke && width > 0) {
    const line = (path: Point[], closed: boolean) => {
      const mesh = strokeMesh(path, stroke, styleOpacity(style, 'strokeOpacity'), {
        width,
        closed,
        dash: dashPattern(style, width),
      });
      if (!mesh) return;
      mesh.name = 'stroke-table';
      mesh.renderOrder = PART_ORDER.stroke;
      group.add(mesh);
    };
    line(path, true);
    line(
      [
        { x: bounds.x, y: bounds.y + header },
        { x: bounds.x + bounds.width, y: bounds.y + header },
      ],
      false,
    );
    if (kind.doubleHeader) {
      const gap = TABLE.doubleGap * scale;
      line(
        rectPath({
          x: bounds.x + gap,
          y: bounds.y + gap,
          width: Math.max(0, bounds.width - 2 * gap),
          height: Math.max(0, header - 2 * gap),
        }),
        true,
      );
    }
    if (kind.folded) line(flapOf(shape), true);
  }

  const label = createLabel(
    {
      ...shape,
      style: {
        ...style,
        fontSize: String(TABLE.nameSize * scale),
        fontColor: textColor,
        fontStyle: String(1 | (kind.italic ? 2 : 0)),
        align: 'center',
        verticalAlign: 'middle',
      },
    },
    ctx,
    missingName(shape) ? kind.requiredName : shape.label,
    nameZone(shape),
  );
  if (label) group.add(label);

  const row = TABLE.row * scale;
  tableFields(shape).forEach((field, index) => {
    const y = bounds.y + header + row * (index + 0.5);
    if (y > bounds.y + bounds.height) return;
    addText(group, ctx, {
      text: field,
      at: { x: bounds.x + TABLE.padding * scale, y },
      size: TABLE.fieldSize * scale,
      color: '#000000',
      align: 'left',
      underline: kind.primaryKey && index === 0,
      italic: kind.italicFields,
    });
  });
  return group;
}

function addText(
  group: Group,
  ctx: RenderContext,
  text: {
    text: string;
    at: Point;
    size: number;
    color: string;
    align: 'left' | 'center';
    underline?: boolean;
    italic?: boolean;
  },
): void {
  const object = ctx.text.create({
    text: text.text,
    x: text.at.x,
    y: text.at.y,
    anchorX: text.align,
    anchorY: 'middle',
    align: text.align,
    fontSize: text.size,
    color: new Color(text.color),
    opacity: 1,
    bold: false,
    underline: text.underline,
    italic: text.italic,
  });
  object.name = 'table-text';
  object.renderOrder = PART_ORDER.label;
  group.add(object);
}

/**
 * Style draw.io d'une table neuve : un swimlane (entête de la couleur, corps blanc), désigné par `spatial.kind` ; la
 * clé primaire dans ses champs s'il en a une.
 */
export function tableStyle(id: string, kind: TableKind): string {
  const fields = kind.primaryKey ? `${FIELDS}=${JSON.stringify([PRIMARY_KEY])};` : '';
  return (
    `swimlane;fontStyle=${1 | (kind.italic ? 2 : 0)};startSize=${headerHeight(false)};` +
    `fillColor=${DEFAULT_HEADER_COLOR};swimlaneFillColor=${FIELDS_FILL};strokeColor=${BORDER};` +
    `fontSize=${TABLE.nameSize};html=1;whiteSpace=wrap;${kind.style ?? ''}spatial.kind=${id};${fields}`
  );
}

/**
 * Forme de table du mode RDD (sujet 179) : base de toutes les tables (modèle abstrait, entité…). Rendu 2D seulement
 * (le mode n'a pas d'autre vue) ; le label est le nom, dans l'entête. Sans `palette`, la forme n'est pas proposée
 * (modèle abstrait).
 */
export function table(
  id: string,
  palette?: Pick<PaletteEntry, 'name' | 'order' | 'keywords' | 'value'> & { icon?: string },
): ShapeDefinition {
  const kind = TABLE_KINDS[id]!;
  return {
    id,
    outline: (shape) => outline(shape, kind),
    flat: { create: (shape, ctx) => createTable(shape, ctx, kind) },
    textZone: (shape) => nameZone(shape),
    swatch: () => '<path d="M5 5h30v18H5zM5 11h30"/>',
    ...(palette && {
      palette: {
        ...palette,
        category: 'rdd',
        style: tableStyle(id, kind),
        width: TABLE.width,
        height: tableHeight(false, kind.primaryKey ? 1 : 0),
        icon:
          palette.icon ??
          '<path d="M6 3h28v22H6zM6 10h28M10 15h12M10 20h9"/>' + (kind.doubleHeader ? '<path d="M8 5h24v3H8z"/>' : ''),
      },
    }),
  };
}
