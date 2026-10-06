import { Color, Group } from 'three';
import type { Point, Rect, ShapeModel } from '../../model/types';
import { createLabel } from '../../render/flat/box';
import { rectPath } from '../../render/geometry/paths';
import { dashPattern } from '../../render/geometry/stroke';
import { fillMesh, strokeMesh } from '../../render/meshes';
import { readableOn, styleColor, styleNumber, styleOpacity } from '../../render/styleValues';
import { PART_ORDER } from '../../render/types';
import type { RenderContext } from '../../render/types';
import type { PaletteEntry, ShapeDefinition } from '../../shapes/types';
import { spatialValue } from '../../spatial';

/** Champs d'une table : liste JSON de noms (`["name","created_at"]`). */
export const FIELDS = 'spatial.fields';
/** Table secondaire (`1`) : rendu 20 % plus petit. */
export const SECONDARY = 'spatial.secondary';
/** Échelle d'une table secondaire. */
export const SECONDARY_SCALE = 0.8;

/** Tailles d'une table principale, en pixels de page (× `SECONDARY_SCALE` pour une table secondaire). */
export const TABLE = {
  /** Entête : nom seul. */
  header: 26,
  /** Bande de la mention (`«abstract»`) au-dessus du nom. */
  stereotype: 12,
  row: 20,
  nameSize: 12,
  stereotypeSize: 9,
  fieldSize: 11,
  /** Marge des champs à gauche. */
  padding: 6,
  width: 160,
} as const;

/** Couleur d'entête par défaut (premier fond de `modePalette`). */
export const DEFAULT_HEADER_COLOR = '#dae8fc';
const BORDER = '#666666';
const FIELDS_FILL = '#ffffff';

/**
 * Forme de table : mention au-dessus du nom (ex. `abstract`), nom en italique, clé primaire `id` toujours en tête des
 * champs (sujet 180).
 */
export interface TableKind {
  stereotype?: string;
  italic?: boolean;
  primaryKey?: boolean;
}

/** Clé primaire des tables qui en ont une : premier champ, souligné, ni retiré ni déplacé. */
export const PRIMARY_KEY = 'id';

/**
 * Tables du mode, par id de forme : le rendu et les opérations du mode (hauteur, échelle) en dépendent. Le modèle
 * abstrait est la base des autres : jamais posé depuis la palette (sujet 180), il reste dessiné s'il est dans un
 * fichier.
 */
export const TABLE_KINDS: Record<string, TableKind> = {
  'rdd-model': { stereotype: 'abstract', italic: true },
  'rdd-entity': { primaryKey: true },
  'rdd-enum': { stereotype: 'enum', primaryKey: true },
};

/** Forme de table d'une forme du mode ; undefined pour une autre forme. */
export const tableKindOf = (shape: ShapeModel): TableKind | undefined => TABLE_KINDS[shape.kind];

/** Champs de la table (`spatial.fields`) ; une valeur illisible ou absente = aucun. */
export function fieldsOf(shape: ShapeModel): string[] {
  try {
    const value: unknown = JSON.parse(spatialValue(shape, FIELDS) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Champs affichés : ceux du fichier, la clé primaire ramenée en tête (ajoutée si elle manque) pour une table qui en a
 * une.
 */
export function tableFields(shape: ShapeModel): string[] {
  const fields = fieldsOf(shape);
  return tableKindOf(shape)?.primaryKey ? [PRIMARY_KEY, ...fields.filter((f) => f !== PRIMARY_KEY)] : fields;
}

/** La clé primaire manque ou n'est pas en tête dans le fichier (fichier modifié à la main ou dans draw.io) ? */
export const misplacedPrimaryKey = (shape: ShapeModel) =>
  tableKindOf(shape)?.primaryKey === true && fieldsOf(shape)[0] !== PRIMARY_KEY;

export const isSecondary = (shape: ShapeModel) => spatialValue(shape, SECONDARY) === '1';

const scaleOf = (shape: ShapeModel) => (isSecondary(shape) ? SECONDARY_SCALE : 1);

/** Hauteur de l'entête (nom et mention), à l'échelle de la table. */
export function headerHeight(kind: TableKind, secondary: boolean): number {
  return (TABLE.header + (kind.stereotype ? TABLE.stereotype : 0)) * (secondary ? SECONDARY_SCALE : 1);
}

/** Hauteur de la table pour `count` champs : entête et une ligne par champ (au moins une ligne vide). */
export function tableHeight(kind: TableKind, secondary: boolean, count: number): number {
  return headerHeight(kind, secondary) + Math.max(1, count) * TABLE.row * (secondary ? SECONDARY_SCALE : 1);
}

/** Zone du nom : l'entête sous la mention (label dessiné et éditeur en place). */
function nameZone(shape: ShapeModel, kind: TableKind): Rect {
  const { x, y, width } = shape.bounds;
  const band = kind.stereotype ? TABLE.stereotype * scaleOf(shape) : 0;
  return { x, y: y + band, width, height: headerHeight(kind, isSecondary(shape)) - band };
}

/**
 * Rendu à plat d'une table : zone des champs blanche, entête de la couleur `fillColor` (texte noir ou blanc selon le
 * contraste), séparés d'un trait ; mention en petit au-dessus du nom ; un champ par ligne, aligné à gauche.
 */
function createTable(shape: ShapeModel, ctx: RenderContext, kind: TableKind): Group {
  const group = new Group();
  group.name = `shape:${shape.id}`;
  const { bounds, style } = shape;
  const scale = scaleOf(shape);
  const header = Math.min(bounds.height, headerHeight(kind, isSecondary(shape)));
  const headerColor = styleColor(style, 'fillColor', DEFAULT_HEADER_COLOR) ?? new Color(DEFAULT_HEADER_COLOR);
  const textColor = readableOn(`#${headerColor.getHexString()}`);

  group.add(fillMesh(rectPath(bounds), new Color(FIELDS_FILL), styleOpacity(style, 'fillOpacity')));
  const headerFill = fillMesh(rectPath({ ...bounds, height: header }), headerColor, styleOpacity(style, 'fillOpacity'));
  headerFill.name = 'fill-header';
  headerFill.renderOrder = PART_ORDER.fill + 0.5;
  group.add(headerFill);

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
      mesh.renderOrder = PART_ORDER.stroke;
      group.add(mesh);
    };
    line(rectPath(bounds), true);
    line(
      [
        { x: bounds.x, y: bounds.y + header },
        { x: bounds.x + bounds.width, y: bounds.y + header },
      ],
      false,
    );
  }

  if (kind.stereotype) {
    addText(group, ctx, {
      text: `«${kind.stereotype}»`,
      at: { x: bounds.x + bounds.width / 2, y: bounds.y + (TABLE.stereotype * scale) / 2 + 2 * scale },
      size: TABLE.stereotypeSize * scale,
      color: textColor,
      align: 'center',
    });
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
    shape.label,
    nameZone(shape, kind),
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
    });
  });
  return group;
}

function addText(
  group: Group,
  ctx: RenderContext,
  text: { text: string; at: Point; size: number; color: string; align: 'left' | 'center'; underline?: boolean },
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
    `swimlane;fontStyle=${1 | (kind.italic ? 2 : 0)};startSize=${headerHeight(kind, false)};` +
    `fillColor=${DEFAULT_HEADER_COLOR};swimlaneFillColor=${FIELDS_FILL};strokeColor=${BORDER};` +
    `fontSize=${TABLE.nameSize};html=1;whiteSpace=wrap;spatial.kind=${id};${fields}`
  );
}

/**
 * Forme de table du mode RDD (sujet 179) : base de toutes les tables (modèle abstrait, entité…). Rendu 2D seulement
 * (le mode n'a pas d'autre vue) ; le label est le nom, dans l'entête. Sans `palette`, la forme n'est pas proposée
 * (modèle abstrait).
 */
export function table(
  id: string,
  palette?: Pick<PaletteEntry, 'name' | 'order' | 'keywords' | 'value'>,
): ShapeDefinition {
  const kind = TABLE_KINDS[id]!;
  return {
    id,
    outline: (shape) => rectPath(shape.bounds),
    flat: { create: (shape, ctx) => createTable(shape, ctx, kind) },
    textZone: (shape) => nameZone(shape, kind),
    swatch: () => '<path d="M5 5h30v18H5zM5 11h30"/>',
    ...(palette && {
      palette: {
        ...palette,
        category: 'rdd',
        style: tableStyle(id, kind),
        width: TABLE.width,
        height: tableHeight(kind, false, kind.primaryKey ? 1 : 0),
        icon: kind.stereotype
          ? '<path d="M6 3h28v22H6zM6 12h28M10 17h12M10 22h9M15 7.5h10"/>'
          : '<path d="M6 3h28v22H6zM6 10h28M10 15h12M10 20h9"/>',
      },
    }),
  };
}
