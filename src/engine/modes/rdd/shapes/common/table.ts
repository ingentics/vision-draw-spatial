import { Color, Group } from 'three';
import type { Point, Rect, ShapeModel } from '../../../../model/types';
import { createLabel } from '../../../../render/flat/box';
import { cornerRadius, rectPath, roundedRectPath } from '../../../../render/geometry/paths';
import { dashPattern } from '../../../../render/geometry/stroke';
import { fillMesh, strokeMesh } from '../../../../render/meshes';
import { styleNumber, styleOpacity, styleFlag } from '../../../../model/styleValues';
import { readableOn, styleColor } from '../../../../render/styleColors';
import { PART_ORDER } from '../../../../render/types';
import type { RenderContext } from '../../../../render/types';
import type { PaletteEntry, ShapeDefinition } from '../../../../shapes/types';
import {
  DEFAULT_HEADER_COLOR,
  DEFAULT_HEADER_TEXT,
  FIELDS,
  PRIMARY_KEY,
  SECONDARY_SCALE,
  TABLE,
  TABLE_KINDS,
  fieldsValue,
  headerHeight,
  isSecondary,
  markInset,
  missingName,
  shownMark,
  tableFields,
  tableHeight,
  tableWidth,
} from '../../tables';
import type { HeaderMark, TableKind } from '../../tables';
import { addFieldRow } from './fieldRow';

/** Rendu et fabrique des tables du mode RDD (sujet 179), communs à ses formes (`shapes/<forme>/`). */

const BORDER = '#666666';
const FIELDS_FILL = '#ffffff';

const scaleOf = (shape: ShapeModel) => (isSecondary(shape) ? SECONDARY_SCALE : 1);

/**
 * Zone du nom : l'entête (label dessiné et éditeur en place), réduite des deux côtés de la place de l'icône d'entête
 * pour que le nom, centré, ne la recouvre pas (sujet 221).
 */
function nameZone(shape: ShapeModel): Rect {
  const { x, y, width } = shape.bounds;
  const inset = shownMark(shape) ? Math.min(markInset() * scaleOf(shape), width / 2) : 0;
  return { x: x + inset, y, width: width - 2 * inset, height: headerHeight(isSecondary(shape)) };
}

/** Côté du coin plié d'un document, à l'échelle de la table (au plus la moitié de l'entête). */
const foldOf = (shape: ShapeModel) => Math.min(TABLE.fold * scaleOf(shape), headerHeight(isSecondary(shape)) / 2);

/**
 * Contour d'une table : rectangle, arrondi avec `rounded=1` (vue), coin haut-droit coupé en biais pour un document
 * (coin plié), bas ondulé pour un embedded. Le haut est toujours convexe, la vague loin sous l'entête : l'entête s'y
 * découpe en bornant les ordonnées.
 */
function outline(shape: ShapeModel, kind: TableKind): Point[] {
  const { bounds, style } = shape;
  const { x, y, width: w, height: h } = bounds;
  if (kind.wavy) {
    // Bas ondulé, une période sur la largeur, de droite à gauche : remonte puis descend (vu de gauche : descend puis
    // remonte), entre le bas des bornes et deux amplitudes au-dessus.
    const a = TABLE.wave * scaleOf(shape);
    const steps = 24;
    const wave = Array.from({ length: steps + 1 }, (_, i) => {
      const t = 1 - i / steps;
      return { x: x + w * t, y: y + h - a + a * Math.sin(2 * Math.PI * t) };
    });
    return [{ x, y }, { x: x + w, y }, ...wave];
  }
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
  return styleFlag(style, 'rounded') ? roundedRectPath(bounds, cornerRadius(style, bounds)) : rectPath(bounds);
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
  // Texte de l'entête : `fontColor` s'il est écrit (gris d'une table neuve, sujet 235), sinon lisible sur l'entête.
  const readable = readableOn(`#${headerColor.getHexString()}`);
  const textColor = style.fontColor && style.fontColor !== 'default' ? style.fontColor : readable;

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
  const mark = shownMark(shape);
  if (mark) group.add(headerMark(shape, mark, header, styleColor(style, 'strokeColor', BORDER)));

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
    addFieldRow(group, ctx, kind, field, { left: bounds.x, y, scale });
  });
  return group;
}

/** Arc de cercle de `from` à `to` (radians, repère page : −π/2 vers le haut), en polygone. */
function arc(cx: number, cy: number, r: number, from: number, to: number, segments = 8): Point[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = from + ((to - from) * i) / segments;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

/** Cercle en polygone. */
const circle = (cx: number, cy: number, r: number) => arc(cx, cy, r, 0, 2 * Math.PI, 16).slice(0, -1);

/**
 * Câble de la prise (sujet 223) dans le cadre de 14 × 9 : part du haut à gauche, fait un S (boucle à droite puis à
 * gauche) et file vers la prise, en bas à droite.
 */
function plugCable(): Point[] {
  return [
    { x: 1.8, y: 1.2 },
    { x: 3.4, y: 1.2 },
    ...arc(3.4, 2.6, 1.4, -Math.PI / 2, Math.PI / 2).slice(1),
    { x: 2.6, y: 4 },
    ...arc(2.6, 5.4, 1.4, -Math.PI / 2, -(3 * Math.PI) / 2).slice(1),
    { x: 6.6, y: 6.8 },
  ];
}

/** Tracés d'une icône d'entête dans son cadre de 14 × 9 : [points, fermé]. */
const MARK_PATHS: Record<HeaderMark, Array<[Point[], boolean]>> = {
  // Deux oculaires ronds, leurs corps resserrés vers le haut, le pont.
  binoculars: [
    [circle(3.5, 6.2, 2.6), true],
    [circle(10.5, 6.2, 2.6), true],
    [
      [
        { x: 1, y: 5.5 },
        { x: 2.3, y: 0.8 },
        { x: 5, y: 0.8 },
        { x: 6, y: 5.5 },
      ],
      false,
    ],
    [
      [
        { x: 8, y: 5.5 },
        { x: 9, y: 0.8 },
        { x: 11.7, y: 0.8 },
        { x: 13, y: 5.5 },
      ],
      false,
    ],
    [
      [
        { x: 5.6, y: 3 },
        { x: 8.4, y: 3 },
      ],
      false,
    ],
  ],
  // Trois puces rondes et leurs lignes.
  list: [1.2, 4.5, 7.8].flatMap((y): Array<[Point[], boolean]> => [
    [circle(2.2, y, 0.9), true],
    [
      [
        { x: 4.6, y },
        { x: 13, y },
      ],
      false,
    ],
  ]),
  // Prise électrique : câble en S, corps rétréci côté câble, deux broches vers la droite.
  plug: [
    [plugCable(), false],
    [
      [
        { x: 6.6, y: 6 },
        { x: 7.6, y: 5.1 },
        { x: 9.6, y: 5.1 },
        { x: 9.6, y: 8.5 },
        { x: 7.6, y: 8.5 },
        { x: 6.6, y: 7.6 },
      ],
      true,
    ],
    [
      [
        { x: 9.6, y: 6 },
        { x: 11.6, y: 6 },
      ],
      false,
    ],
    [
      [
        { x: 9.6, y: 7.6 },
        { x: 11.6, y: 7.6 },
      ],
      false,
    ],
  ],
};

/**
 * Icône d'entête (sujets 220 à 222 : jumelles de la vue, liste de l'énumération, prise de l'embedded), en haut à
 * droite de l'entête, dans un cadre de 14 × 9 agrandi 1,5 fois (à l'échelle), au trait fin de la couleur de la bordure ; rien sans
 * bordure (`strokeColor=none`).
 */
function headerMark(shape: ShapeModel, mark: HeaderMark, header: number, color: Color | null): Group {
  const group = new Group();
  group.name = 'header-mark';
  group.userData.mark = mark;
  if (!color) return group;
  const scale = scaleOf(shape);
  const { width, height, zoom, margin } = TABLE.mark;
  const left = shape.bounds.x + shape.bounds.width - (margin + width * zoom) * scale;
  const top = shape.bounds.y + (header - height * zoom * scale) / 2;
  for (const [points, closed] of MARK_PATHS[mark]) {
    const path = points.map((p) => ({ x: left + p.x * zoom * scale, y: top + p.y * zoom * scale }));
    const mesh = strokeMesh(path, color, 1, { width: scale, closed });
    if (!mesh) continue;
    mesh.renderOrder = PART_ORDER.stroke;
    group.add(mesh);
  }
  return group;
}

/**
 * Style draw.io d'une table neuve : un swimlane (entête de la couleur, corps blanc), désigné par `spatial.kind` ; la
 * clé primaire dans ses champs s'il en a une.
 */
export function tableStyle(id: string, kind: TableKind): string {
  const fields = kind.primaryKey ? `${FIELDS}=${fieldsValue([PRIMARY_KEY])};` : '';
  return (
    `swimlane;fontStyle=${1 | (kind.italic ? 2 : 0)};startSize=${headerHeight(false)};` +
    `fillColor=${DEFAULT_HEADER_COLOR};fontColor=${DEFAULT_HEADER_TEXT};swimlaneFillColor=${FIELDS_FILL};strokeColor=${BORDER};` +
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
  const fields = kind.primaryKey ? [PRIMARY_KEY] : [];
  return {
    id,
    outline: (shape) => outline(shape, kind),
    flat: { create: (shape, ctx) => createTable(shape, ctx, kind) },
    textZone: (shape) => nameZone(shape),
    // Taille calculée de son contenu (sujet 247) : pas de poignées de redimensionnement.
    resizable: false,
    swatch: () => '<path d="M5 5h30v18H5zM5 11h30"/>',
    ...(palette && {
      palette: {
        ...palette,
        category: 'rdd',
        style: tableStyle(id, kind),
        // Mesure approchée au chargement (polices pas encore là) : la première modification l'ajuste.
        width: tableWidth(kind, { name: palette.value, fields, secondary: false, mark: kind.mark !== undefined }),
        height: tableHeight(kind, false, fields.length),
        icon:
          palette.icon ??
          '<path d="M6 3h28v22H6zM6 10h28M10 15h12M10 20h9"/>' + (kind.doubleHeader ? '<path d="M8 5h24v3H8z"/>' : ''),
      },
    }),
  };
}
