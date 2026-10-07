import { ceilToGrid } from '../../../core/model/geometry';
import type { Rect, ShapeModel } from '../../../core/model/types';
import { measureText } from '../../../core/render/textMeasure';
import { spatialValue } from '../../../core/spatial';
import type { Divider, Field, TableRow } from './fieldModel';
import { fieldNote, isDivider, tableFields } from './fieldModel';
import type { TableKind } from './tableKinds';
import { shownMark, tableName } from './tableKinds';

/**
 * Mise en page des tables du mode RDD (sujets 247, 248, 253, 263, 264) : tailles, échelle d'une table secondaire,
 * largeur calculée du contenu, lignes des champs.
 */

/** Table secondaire (`1`) : rendu 20 % plus petit. */
export const SECONDARY = 'spatial.secondary';
/** Échelle d'une table secondaire. */
export const SECONDARY_SCALE = 0.8;

/** Tailles d'une table principale, en pixels de page (× `SECONDARY_SCALE` pour une table secondaire). */
export const TABLE = {
  /** Entête : le nom. */
  header: 26,
  row: 20,
  nameSize: 12,
  fieldSize: 11,
  /** Marge des champs à gauche (et à droite, pour la largeur). */
  padding: 6,
  /** Icône de kind devant un champ (sujet 248) : côté du cadre, air avant le label. */
  fieldIcon: { size: 12, gap: 4 },
  /** Air entre le label d'un champ et son type. */
  typeGap: 6,
  /** Séparateur (sujet 253) : taille de son label, air autour du label, longueur minimale du trait de chaque côté. */
  divider: { size: 7, gap: 4, stroke: 16 },
  /** Écart du second trait d'un entête à cadre double. */
  doubleGap: 3,
  /** Côté du coin plié d'un document. */
  fold: 10,
  /**
   * Icône d'entête : cadre de dessin (14 × 9), agrandi `zoom` fois à l'affichage (21 × 13,5 px), écart au bord droit
   * de l'entête.
   */
  mark: { width: 14, height: 9, zoom: 1.5, margin: 7, gap: 4 },
  /** Amplitude du bas ondulé d'un embedded ; la table a deux amplitudes de plus en bas. */
  wave: 2,
  /** Largeur minimale (sujet 247) : la table s'élargit au-delà pour son nom ou son plus long champ. */
  minWidth: 120,
} as const;

export const isSecondary = (shape: ShapeModel) => spatialValue(shape, SECONDARY) === '1';

/** Échelle d'une table, secondaire ou non. */
export const secondaryScale = (secondary: boolean): number => (secondary ? SECONDARY_SCALE : 1);

/** Échelle de la table `shape`. */
export const tableScale = (shape: ShapeModel): number => secondaryScale(isSecondary(shape));

/** Arrondi des tailles écrites, au centième (échelle 0,8 : pas de traîne de flottants). */
export const roundSize = (value: number): number => Math.round(value * 100) / 100;

/** Hauteur de l'entête, à l'échelle de la table. */
export function headerHeight(secondary: boolean): number {
  return TABLE.header * secondaryScale(secondary);
}

/**
 * Hauteur de la table pour `count` champs : entête et une ligne par champ (au moins une ligne vide), plus la place de
 * la vague d'un bas ondulé.
 */
export function tableHeight(kind: TableKind, secondary: boolean, count: number): number {
  const rows = Math.max(1, count) * TABLE.row + (kind.look.wavy ? 2 * TABLE.wave : 0);
  return headerHeight(secondary) + rows * secondaryScale(secondary);
}

/**
 * Retrait du nom de chaque côté pour l'icône d'entête (marge, icône agrandie, air avant le titre), à l'échelle 1 : le
 * nom reste centré dans la table.
 */
export const MARK_INSET = TABLE.mark.margin + TABLE.mark.width * TABLE.mark.zoom + TABLE.mark.gap;

/**
 * Mise en page d'une ligne de champ (sujet 248), en abscisses depuis le bord gauche de la table, à l'échelle 1 : icône
 * de kind, label, puis texte gris (`fieldNote` : type ou préfixe ; absent sans texte) ; `width` : largeur de la ligne,
 * marge de droite comprise.
 */
export function fieldLayout(kind: TableKind, field: Field): { label: number; type?: number; width: number } {
  const label = TABLE.padding + TABLE.fieldIcon.size + TABLE.fieldIcon.gap;
  const end =
    label + measureText(field.label, { size: TABLE.fieldSize, bold: false, italic: kind.look.italicFields ?? false });
  const typeText = fieldNote(field);
  if (!typeText) return { label, width: end + TABLE.padding };
  const type = end + TABLE.typeGap;
  const width = type + measureText(typeText, { size: TABLE.fieldSize, bold: false, italic: false }) + TABLE.padding;
  return { label, type, width };
}

/** Coupure du trait d'un séparateur pour son label (sujet 253), air compris, à l'échelle 1 ; 0 sans label. */
export function dividerLabelWidth(divider: Divider): number {
  const { size, gap } = TABLE.divider;
  return divider.label ? measureText(divider.label, { size, bold: false, italic: false }) + 2 * gap : 0;
}

/**
 * Largeur d'un séparateur (sujet 253), à l'échelle 1 : son label (s'il en a un) entre deux traits d'au moins
 * `TABLE.divider.stroke`, marges comprises.
 */
export function dividerWidth(divider: Divider): number {
  return 2 * TABLE.padding + 2 * TABLE.divider.stroke + dividerLabelWidth(divider);
}

/** Largeur d'une ligne de la zone des champs, à l'échelle 1. */
export const rowWidth = (kind: TableKind, row: TableRow): number =>
  isDivider(row) ? dividerWidth(row) : fieldLayout(kind, row).width;

/** Ce dont dépend la taille d'une table : nom affiché, lignes, échelle, icône d'entête. */
export interface TableContent {
  name: string;
  fields: readonly TableRow[];
  secondary: boolean;
  mark: boolean;
}

/** Contenu actuel d'une table (nom de remplacement d'un document sans nom compris). */
export const tableContent = (shape: ShapeModel): TableContent => ({
  name: tableName(shape),
  fields: tableFields(shape),
  secondary: isSecondary(shape),
  mark: shownMark(shape) !== undefined,
});

/**
 * Largeur d'une table (sujet 247) : celle de son nom (gras, plus la place de l'icône d'entête de chaque côté) ou de
 * son plus long champ (icône, label et type), marges comprises, au moins `TABLE.minWidth` ; à l'échelle d'une table
 * secondaire. Mesurée à l'échelle 1 puis réduite, comme le reste de la table.
 */
export function tableWidth(kind: TableKind, content: TableContent): number {
  const name = Math.max(
    0,
    ...content.name
      .split('\n')
      .map((line) => measureText(line.trim(), { size: TABLE.nameSize, bold: true, italic: kind.look.italic ?? false })),
  );
  const fields = content.fields.map((row) => rowWidth(kind, row));
  const header = name + 2 * (TABLE.padding + (content.mark ? MARK_INSET : 0));
  const width = Math.ceil(Math.max(TABLE.minWidth, header, ...fields));
  return width * secondaryScale(content.secondary);
}

/**
 * Largeur écrite d'une table : arrondie au centième (`roundSize`), puis au pas de grille supérieur (`gridSize` ≤ 0 :
 * sans grille), la table s'étendant à droite (sujet 263). La hauteur, elle, reste celle des lignes (sujet 264).
 */
export const tableSize = (value: number, gridSize: number): number => ceilToGrid(roundSize(value), gridSize);

/** Ligne du champ `index` (pixels de page), sous l'entête, sur toute la largeur de la table (sujet 249). */
export function fieldRow(shape: ShapeModel, index: number): Rect {
  const secondary = isSecondary(shape);
  const row = TABLE.row * secondaryScale(secondary);
  const { x, y, width } = shape.bounds;
  return { x, y: y + headerHeight(secondary) + row * index, width, height: row };
}
