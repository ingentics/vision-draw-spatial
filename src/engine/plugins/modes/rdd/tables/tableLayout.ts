import { ceilToGrid } from '../../../../core/plugins';
import type { MeasureText, Rect, ShapeModel } from '../../../../core/plugins';
import type { Divider, Field, TableRow } from './fieldModel';
import { isDivider, tableFields } from './fieldModel';
import type { HeaderMark, TableKind } from './tableKinds';
import { shownMark, tableName } from './tableKinds';
import { layerFieldTexts, physicalMissing, physicalName } from './physicalLayer';
import { keys } from '../keys';

/**
 * Mise en page des tables du mode RDD (sujets 247, 248, 253, 263, 264) : tailles, échelle d'une table (L, M, S),
 * largeur calculée du contenu, lignes des champs.
 */

/** Attribut de la taille d'une table (sujet 430) : `M` ou `S` ; absent (ou autre valeur) : `L`. */
export const SIZE = 'size';
/** Taille d'une table : `L` (normale), `M` (20 % plus petite), `S` (encore 20 % plus petite). */
export type TableLevel = 'L' | 'M' | 'S';
/** Échelle de chaque taille de table, dans l'ordre du panneau. */
export const LEVEL_SCALES: Readonly<Record<TableLevel, number>> = { L: 1, M: 0.8, S: 0.64 };

/** Attribut d'une vue matérialisée (sujet 272). */
export const MATERIALIZED = 'materialized';
/** Attribut d'une vue privée (sujet 342) : clé à gauche du nom. */
export const PRIVATE = 'private';

/** Tailles d'une table en `L`, en pixels de page (× `LEVEL_SCALES` pour les autres tailles). */
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
  /** Icône d'alerte d'un nom ou type physique manquant (sujet 425), calée à droite : côté du cadre, air avant. */
  warning: { size: 12, gap: 6 },
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
  /** Corps d'un document (sujet 269) : taille du texte, taille par défaut à la pose (sur la grille de 10). */
  body: { size: 7, width: 200, height: 120 },
} as const;

/** Taille voisine, d'un cran vers `S` (`1`) ou vers `L` (`-1`) ; la même au bout. */
export function steppedLevel(level: TableLevel, step: 1 | -1): TableLevel {
  const levels = Object.keys(LEVEL_SCALES) as TableLevel[];
  return levels[levels.indexOf(level) + step] ?? level;
}

/** Valeur d'une taille de table ? */
export const isTableLevel = (value: string | undefined): value is TableLevel =>
  value !== undefined && Object.prototype.hasOwnProperty.call(LEVEL_SCALES, value);

/** Taille de la table `shape` ; un ancien `spatial.rdd.secondary` est ignoré (sans migration, sujet 430). */
export function tableLevel(shape: ShapeModel): TableLevel {
  const value = keys.value(shape, SIZE);
  return isTableLevel(value) ? value : 'L';
}

/** Icône d'entête à gauche du nom (sujet 342) : la clé d'une vue privée ; aucune sinon. */
export const leftMark = (shape: ShapeModel): HeaderMark | undefined =>
  shape.kind === 'rdd-view' && keys.flag(shape, PRIVATE) ? 'key' : undefined;

/** Échelle d'une taille de table. */
export const levelScale = (level: TableLevel): number => LEVEL_SCALES[level];

/** Échelle de la table `shape`. */
export const tableScale = (shape: ShapeModel): number => levelScale(tableLevel(shape));

/** Arrondi des tailles écrites, au centième (échelles 0,8 et 0,64 : pas de traîne de flottants). */
export const roundSize = (value: number): number => Math.round(value * 100) / 100;

/** Hauteur de l'entête, à l'échelle de la table. */
export function headerHeight(level: TableLevel): number {
  return TABLE.header * levelScale(level);
}

/**
 * Hauteur de la table pour `count` champs : entête et une ligne par champ (au moins une ligne vide), plus la place de
 * la vague d'un bas ondulé.
 */
export function tableHeight(kind: TableKind, level: TableLevel, count: number): number {
  const rows = Math.max(1, count) * TABLE.row + (kind.look.wavy ? 2 * TABLE.wave : 0);
  return headerHeight(level) + rows * levelScale(level);
}

/**
 * Retrait du nom de chaque côté pour l'icône d'entête (marge, icône agrandie, air avant le titre), à l'échelle 1 : le
 * nom reste centré dans la table.
 */
export const MARK_INSET = TABLE.mark.margin + TABLE.mark.width * TABLE.mark.zoom + TABLE.mark.gap;

/**
 * Zone du nom : l'entête (label dessiné et éditeur en place), réduite des deux côtés de la place de l'icône d'entête
 * pour que le nom, centré, ne la recouvre pas (sujet 221).
 */
export function nameZone(shape: ShapeModel): Rect {
  const { x, y, width } = shape.bounds;
  const inset = shownMark(shape) ? Math.min(MARK_INSET * tableScale(shape), width / 2) : 0;
  return { x: x + inset, y, width: width - 2 * inset, height: headerHeight(tableLevel(shape)) };
}

/** Abscisse du label d'un champ depuis le bord gauche de la table, à l'échelle 1 : après l'icône de kind. */
export const FIELD_LABEL_X = TABLE.padding + TABLE.fieldIcon.size + TABLE.fieldIcon.gap;

/**
 * Mise en page d'une ligne de champ (sujet 248), en abscisses depuis le bord gauche de la table, à l'échelle 1 : icône
 * de kind, label, puis texte gris (`fieldNote` : type ou préfixe ; absent sans texte) ; `width` : largeur de la ligne,
 * marge de droite comprise. `measure` : la mesure du texte du moteur (sujet 377). `physical` : textes de la couche
 * physique (sujet 414), une valeur manquante en italique et la place de l'icône d'alerte au bout (sujet 425).
 */
export function fieldLayout(
  field: Field,
  measure: MeasureText,
  physical = false,
): { label: number; type?: number; width: number } {
  const texts = layerFieldTexts(field, physical);
  const label = FIELD_LABEL_X;
  const end = label + measure(texts.label.text, { size: TABLE.fieldSize, bold: false, italic: texts.label.missing });
  const warning = physical && physicalMissing(field) ? TABLE.warning.gap + TABLE.warning.size : 0;
  if (!texts.note.text) return { label, width: end + warning + TABLE.padding };
  const type = end + TABLE.typeGap;
  const note = measure(texts.note.text, { size: TABLE.fieldSize, bold: false, italic: texts.note.missing });
  return { label, type, width: type + note + warning + TABLE.padding };
}

/** Coupure du trait d'un séparateur pour son label (sujet 253), air compris, à l'échelle 1 ; 0 sans label. */
export function dividerLabelWidth(divider: Divider, measure: MeasureText): number {
  const { size, gap } = TABLE.divider;
  return divider.label ? measure(divider.label, { size, bold: false, italic: false }) + 2 * gap : 0;
}

/**
 * Largeur d'un séparateur (sujet 253), à l'échelle 1 : son label (s'il en a un) entre deux traits d'au moins
 * `TABLE.divider.stroke`, marges comprises.
 */
function dividerWidth(divider: Divider, measure: MeasureText): number {
  return 2 * TABLE.padding + 2 * TABLE.divider.stroke + dividerLabelWidth(divider, measure);
}

/** Largeur d'une ligne de la zone des champs, à l'échelle 1 ; `physical` : dans la couche physique (sujet 414). */
export const rowWidth = (row: TableRow, measure: MeasureText, physical = false): number =>
  isDivider(row) ? dividerWidth(row, measure) : fieldLayout(row, measure, physical).width;

/** Ce dont dépend la taille d'une table : noms affichés, lignes, échelle, icône d'entête. */
export interface TableContent {
  name: string;
  /** Nom en base d'une table qui a une couche physique (sujet 414) ; absent : le nom, en italique. */
  physicalName?: string;
  fields: readonly TableRow[];
  level: TableLevel;
  mark: boolean;
}

/** Contenu actuel d'une table (nom de remplacement d'un document sans nom compris). */
export const tableContent = (shape: ShapeModel): TableContent => ({
  name: tableName(shape),
  physicalName: physicalName(shape),
  fields: tableFields(shape),
  level: tableLevel(shape),
  mark: shownMark(shape) !== undefined,
});

/** Largeur du plus long nom (gras), ligne à ligne. */
const nameWidth = (name: string, italic: boolean, measure: MeasureText): number =>
  Math.max(0, ...name.split('\n').map((line) => measure(line.trim(), { size: TABLE.nameSize, bold: true, italic })));

/**
 * Largeur d'une table (sujet 247) : celle de son nom (gras, plus la place de l'icône d'entête de chaque côté) ou de
 * son plus long champ (icône, label et type), marges comprises, au moins `TABLE.minWidth` ; à l'échelle de la taille
 * de la table. Mesurée à l'échelle 1 puis réduite, comme le reste de la table. Une table qui a une couche physique a la
 * place des textes des deux couches (sujet 414) : basculer ne la change pas.
 */
export function tableWidth(kind: TableKind, content: TableContent, measure: MeasureText): number {
  const physical = !!kind.rules.physicalLayer;
  const name = Math.max(
    nameWidth(content.name, kind.look.italic ?? false, measure),
    kind.rules.physicalName
      ? nameWidth(content.physicalName ?? content.name, content.physicalName === undefined, measure)
      : 0,
  );
  const fields = content.fields.flatMap((row) => [
    rowWidth(row, measure),
    ...(physical ? [rowWidth(row, measure, true)] : []),
  ]);
  const header = name + 2 * (TABLE.padding + (content.mark ? MARK_INSET : 0));
  const width = Math.ceil(Math.max(TABLE.minWidth, header, ...fields));
  return width * levelScale(content.level);
}

/**
 * Largeur écrite d'une table : arrondie au centième (`roundSize`), puis au pas de grille supérieur (`gridSize` ≤ 0 :
 * sans grille), la table s'étendant à droite (sujet 263). La hauteur, elle, reste celle des lignes (sujet 264).
 */
export const tableSize = (value: number, gridSize: number): number => ceilToGrid(roundSize(value), gridSize);

/**
 * Ligne du champ `index` (pixels de page), sous l'entête, sur toute la largeur de la table (sujet 249) ; `bounds` et
 * `level` : ceux de la table, ou ceux qu'une opération vient d'écrire.
 */
export function fieldRowIn(bounds: Rect, level: TableLevel, index: number): Rect {
  const row = TABLE.row * levelScale(level);
  const { x, y, width } = bounds;
  return { x, y: y + headerHeight(level) + row * index, width, height: row };
}

/** Ligne du champ `index` de la table `shape` (pixels de page). */
export const fieldRow = (shape: ShapeModel, index: number): Rect => fieldRowIn(shape.bounds, tableLevel(shape), index);

/** Zone du corps d'un document (sujet 269) : sous l'entête, dans les marges des champs. */
export function bodyZone(shape: ShapeModel): Rect {
  const scale = tableScale(shape);
  const padding = TABLE.padding * scale;
  const { x, y, width, height } = shape.bounds;
  const top = y + Math.min(height, headerHeight(tableLevel(shape))) + padding / 2;
  return {
    x: x + padding,
    y: top,
    width: Math.max(0, width - 2 * padding),
    height: Math.max(0, y + height - top - padding / 2),
  };
}
