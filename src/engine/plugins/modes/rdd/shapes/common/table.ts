import { Color, Group } from 'three';
import {
  PART_ORDER,
  approximateMeasure,
  createLabel,
  fillMesh,
  inset,
  markPart,
  readableOn,
  rectPath,
  strokeMesh,
  styleColor,
  styleColorValue,
  styleOpacity,
  styleStroke,
  boxOutline,
  fontStyleValue,
  shade,
} from '../../../../../core/plugins';
import type {
  PaletteEntry,
  Point,
  Rect,
  RenderContext,
  ShapeDefinition,
  ShapeModel,
} from '../../../../../core/plugins';
import { FIELDS, fieldsValue, isDivider, primaryKeyField, tableFields } from '../../tables/fieldModel';
import { isLinkable } from '../../relations';
import { BODY_PART, documentBody } from '../../tables/documentBody';
import { DEFAULT_HEADER_COLOR, DEFAULT_HEADER_TEXT, FIELDS_FILL, TABLE_BORDER } from '../../tables/tableColors';
import type { TableKind, TableKindId } from '../../tables/tableKinds';
import { TABLE_KINDS, shownMark, tableName } from '../../tables/tableKinds';
import {
  MARK_INSET,
  TABLE,
  bodyZone,
  headerHeight,
  isSecondary,
  leftMark,
  tableHeight,
  tableScale,
  tableSize,
  tableWidth,
} from '../../tables/tableLayout';
import { addDividerRow, addFieldRow } from './fieldRow';
import { headerMark } from './headerMarks';
import { keys } from '../../keys';

/** Rendu et fabrique des tables du mode RDD (sujet 179), communs à ses formes (`shapes/<forme>/`). */

/**
 * Zone du nom : l'entête (label dessiné et éditeur en place), réduite des deux côtés de la place de l'icône d'entête
 * pour que le nom, centré, ne la recouvre pas (sujet 221).
 */
function nameZone(shape: ShapeModel): Rect {
  const { x, y, width } = shape.bounds;
  const inset = shownMark(shape) ? Math.min(MARK_INSET * tableScale(shape), width / 2) : 0;
  return { x: x + inset, y, width: width - 2 * inset, height: headerHeight(isSecondary(shape)) };
}

/** Côté du coin plié d'un document, à l'échelle de la table (au plus la moitié de l'entête). */
const foldOf = (shape: ShapeModel) => Math.min(TABLE.fold * tableScale(shape), headerHeight(isSecondary(shape)) / 2);

/**
 * Contour d'une table : rectangle, arrondi avec `rounded=1` (vue), coin haut-droit coupé en biais pour un document
 * (coin plié), bas ondulé pour un embedded. Le haut est toujours convexe, la vague loin sous l'entête : l'entête s'y
 * découpe en bornant les ordonnées.
 */
function outline(shape: ShapeModel, kind: TableKind): Point[] {
  const { bounds, style } = shape;
  const { x, y, width: w, height: h } = bounds;
  if (kind.look.wavy) {
    // Bas ondulé, une période sur la largeur, de droite à gauche : remonte puis descend (vu de gauche : descend puis
    // remonte), entre le bas des bornes et deux amplitudes au-dessus.
    const a = TABLE.wave * tableScale(shape);
    const steps = 24;
    const wave = Array.from({ length: steps + 1 }, (_, i) => {
      const t = 1 - i / steps;
      return { x: x + w * t, y: y + h - a + a * Math.sin(2 * Math.PI * t) };
    });
    return [{ x, y }, { x: x + w, y }, ...wave];
  }
  if (kind.look.folded) {
    const f = foldOf(shape);
    return [
      { x, y },
      { x: x + w - f, y },
      { x: x + w, y: y + f },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }
  return boxOutline(bounds, style);
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
  const { bounds, style } = shape;
  const scale = tableScale(shape);
  const header = Math.min(bounds.height, headerHeight(isSecondary(shape)));
  const headerColor = styleColor(style, 'fillColor', DEFAULT_HEADER_COLOR) ?? new Color(DEFAULT_HEADER_COLOR);
  // Texte de l'entête : `fontColor` s'il est écrit (gris d'une table neuve, sujet 235), sinon lisible sur l'entête.
  const readable = readableOn(headerColor);
  const textColor = styleColorValue(style, 'fontColor', readable) ?? readable;

  const path = outline(shape, kind);
  group.add(fillMesh(path, new Color(FIELDS_FILL), styleOpacity(style, 'fillOpacity')));
  // Haut du contour (convexe), coupé sous l'entête : coins arrondis du haut compris.
  const headerPath = path.map((p) => ({ x: p.x, y: Math.min(p.y, bounds.y + header) }));
  const headerFill = fillMesh(headerPath, headerColor, styleOpacity(style, 'fillOpacity'));
  headerFill.name = 'fill-header';
  headerFill.renderOrder = PART_ORDER.fill + 0.5;
  group.add(headerFill);
  if (kind.look.folded) {
    // Rabat un peu plus sombre que l'entête : le revers de la page.
    const flap = fillMesh(flapOf(shape), new Color(shade(headerColor, 0.85)), styleOpacity(style, 'fillOpacity'));
    flap.name = 'fill-fold';
    flap.renderOrder = PART_ORDER.fill + 0.75;
    group.add(flap);
  }

  const stroke = styleStroke(style, TABLE_BORDER);
  if (stroke) {
    const line = (path: Point[], closed: boolean) => {
      const mesh = strokeMesh(path, stroke.color, stroke.opacity, { width: stroke.width, closed, dash: stroke.dash });
      if (!mesh) return;
      mesh.name = 'stroke-table';
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
    if (kind.look.doubleHeader) {
      const gap = TABLE.doubleGap * scale;
      line(rectPath(inset({ ...bounds, height: header }, gap)), true);
    }
    if (kind.look.folded) line(flapOf(shape), true);
  }
  const mark = shownMark(shape);
  const border = styleColor(style, 'strokeColor', TABLE_BORDER);
  if (mark) group.add(headerMark(shape, mark, header, border));
  const left = leftMark(shape);
  if (left) group.add(headerMark(shape, left, header, border, 'left'));

  const label = createLabel(
    {
      ...shape,
      style: {
        ...style,
        fontSize: String(TABLE.nameSize * scale),
        fontColor: textColor,
        fontStyle: String(fontStyleValue({ bold: true, italic: kind.look.italic })),
        align: 'center',
        verticalAlign: 'middle',
      },
    },
    ctx,
    tableName(shape),
    nameZone(shape),
  );
  if (label) group.add(label);

  if (kind.rules.body) {
    // Corps d'un document (sujet 269) : texte en police à chasse fixe, tronqué à sa zone.
    const body = createLabel(
      {
        ...shape,
        style: {
          ...style,
          fontSize: String(TABLE.body.size * scale),
          fontColor: '#000000',
          fontStyle: '0',
          align: 'left',
          verticalAlign: 'top',
          whiteSpace: 'nowrap',
        },
      },
      ctx,
      documentBody(shape),
      bodyZone(shape),
      { monospace: true, truncate: true },
    );
    if (body) {
      // Masqué pendant son édition sur place.
      markPart(body, BODY_PART);
      group.add(body);
    }
  }

  const row = TABLE.row * scale;
  tableFields(shape).forEach((field, index) => {
    const y = bounds.y + header + row * (index + 0.5);
    if (y > bounds.y + bounds.height) return;
    const part = String(index);
    if (isDivider(field)) addDividerRow(group, ctx, field, { left: bounds.x, width: bounds.width, y, scale, part });
    else addFieldRow(group, ctx, field, { left: bounds.x, y, scale, part });
  });
  return group;
}

/**
 * Style draw.io d'une table neuve : un swimlane (entête de la couleur, corps blanc), désigné par `spatial.kind` ; la
 * clé primaire dans ses champs s'il en a une.
 */
function tableStyle(id: TableKindId, kind: TableKind): string {
  const fields = kind.rules.primaryKey
    ? `${keys.key(FIELDS)}=${fieldsValue([primaryKeyField(kind.rules.primaryKey)])};`
    : '';
  return (
    `swimlane;fontStyle=${fontStyleValue({ bold: true, italic: kind.look.italic })};startSize=${headerHeight(false)};` +
    `fillColor=${DEFAULT_HEADER_COLOR};fontColor=${DEFAULT_HEADER_TEXT};swimlaneFillColor=${FIELDS_FILL};strokeColor=${TABLE_BORDER};` +
    `fontSize=${TABLE.nameSize};html=1;whiteSpace=wrap;${kind.look.style ?? ''}spatial.kind=${id};${fields}`
  );
}

/**
 * Forme de table du mode RDD (sujet 179) : base de toutes les tables (modèle abstrait, entité…). Rendu 2D seulement
 * (le mode n'a pas d'autre vue) ; le label est le nom, dans l'entête. Sans `palette`, la forme n'est pas proposée
 * (modèle abstrait).
 */
export function table(
  id: TableKindId,
  palette?: Pick<PaletteEntry, 'name' | 'order' | 'keywords' | 'value'> & { icon?: string },
): ShapeDefinition {
  const kind = TABLE_KINDS[id];
  const fields = kind.rules.primaryKey ? [primaryKeyField(kind.rules.primaryKey)] : [];
  return {
    id,
    outline: (shape) => outline(shape, kind),
    flat: { create: (shape, ctx) => createTable(shape, ctx, kind) },
    textZone: (shape) => nameZone(shape),
    // Taille calculée de ses champs (sujet 247) : pas de poignées de redimensionnement ; taille libre d'un document
    // (sujet 269).
    resizable: !kind.rules.fields,
    // Texte brut : nom, champs et séparateurs s'écrivent sans mise en forme (sujet 258).
    plainText: true,
    // Contour imposé sur les tables, quel que soit le paramètre de la page (sujets 254, 350).
    selectionStyle: 'outline',
    // Flèches tirées des côtés seulement : le « + » d'ajout de champ prend le bas (sujet 250) ; aucune pour une table
    // sans relation (vue, document, modèle abstrait, sujet 265).
    connectSides: ['e', 'w'],
    connectable: isLinkable(id),
    swatch: () => '<path d="M5 5h30v18H5zM5 11h30"/>',
    ...(palette && {
      palette: {
        ...palette,
        category: 'rdd',
        style: tableStyle(id, kind),
        // Mesure approchée (modèle calculé sans moteur, polices pas encore là) : la première modification l'ajuste.
        // Largeur sur la grille par défaut de draw.io (10, sujet 263), hauteur au plus juste (sujet 264). Document :
        // taille par défaut, réglée ensuite à la main (sujet 269).
        ...(kind.rules.fields
          ? {
              width: tableSize(
                tableWidth(
                  kind,
                  { name: palette.value, fields, secondary: false, mark: kind.look.mark !== undefined },
                  approximateMeasure,
                ),
                10,
              ),
              height: tableHeight(kind, false, fields.length),
            }
          : { width: TABLE.body.width, height: TABLE.body.height }),
        icon:
          palette.icon ??
          '<path d="M6 3h28v22H6zM6 10h28M10 15h12M10 20h9"/>' +
            (kind.look.doubleHeader ? '<path d="M8 5h24v3H8z"/>' : ''),
      },
    }),
  };
}
