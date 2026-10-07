import { documentFromTree, readDrawio } from '../../../../src/engine/core/format/parse';
import { applyModeEdit } from '../../../../src/engine/modes/modeEdits';
import {
  FIELDS,
  fieldsOf as rowsOf,
  fieldsValue,
  tableFields as tableRows,
} from '../../../../src/engine/modes/rdd/tables/fieldModel';
import type { Field, TableRow } from '../../../../src/engine/modes/rdd/tables/fieldModel';
import { fitTable } from '../../../../src/engine/modes/rdd/tables/operations';
import { approximateMeasure } from '../../../../src/engine/core/render/richLayout';
import type { ModeEdit } from '../../../../src/engine/modes/types';
import type { ShapeModel } from '../../../../src/engine/core/model/types';
import { ceilToGrid } from '../../../../src/engine/core/model/geometry';
import { fixture } from '../../../helpers';

/** Aides communes des tests du mode RDD : fixture, largeurs attendues, pose des champs. */

/** Largeur d'une ligne de champ à l'échelle 1 (sujet 248) : marge, icône, air, label, puis air et type, marge. */
export const rowWidth = (label: string, type?: string) =>
  6 +
  12 +
  4 +
  approximateMeasure(label, { size: 11, bold: false, italic: false }) +
  (type ? 6 + approximateMeasure(type, { size: 11, bold: false, italic: false }) : 0) +
  6;
/** Longueur écrite d'une table : au pas supérieur de la grille de la fixture (10, sujet 263). */
export const onGrid = (value: number) => ceilToGrid(Math.round(value * 100) / 100, 10);
/** Largeur du contenu d'une table d'après ses lignes : la plus grande, au moins 120. */
export const contentWidth = (...rows: number[]) => Math.ceil(Math.max(120, ...rows));
/** Largeur écrite d'une table d'après ses lignes, sur la grille. */
export const widthOf = (...rows: number[]) => onGrid(contentWidth(...rows));
/** Ligne de la clé primaire `id` d'une entité (« Primary key », sujet 260). */
export const KEY_ROW = rowWidth('id', 'Primary key');

/**
 * Pose les champs d'une table par leurs labels (un par ligne ; la clé primaire d'une entité reste en tête) : un label
 * déjà présent garde son champ, un nouveau est une propriété « Phrase » ; la taille suit.
 */
export function setFields(edit: ModeEdit, shape: ShapeModel, text: string): void {
  const current = tableFields(shape);
  const key = current[0]?.kind === 'pk' ? current[0] : undefined;
  const fields: Field[] = text
    .split('\n')
    .map((label) => label.trim())
    .filter((label) => label && label !== key?.label)
    .map(
      (label) => current.find((f) => f.label === label) ?? { kind: 'property', label, type: 'string', nullable: false },
    );
  const written = key ? [key, ...fields] : fields;
  edit.setElementAttribute(shape.id, FIELDS, fieldsValue(written));
  fitTable(edit, shape, { fields: written });
}

/** Labels des lignes, dans l'ordre. */
export const labels = (rows: readonly TableRow[]) => rows.map((row) => row.label);
/** Lignes d'une table qui n'a que des champs (hors tests des séparateurs, sujet 253). */
export const fieldsOf = (shape: ShapeModel) => rowsOf(shape) as Field[];
export const tableFields = (shape: ShapeModel) => tableRows(shape) as Field[];

/** Page de la fixture, et une fonction qui applique une opération puis relit la page. */
export function setup() {
  const { document, tree } = readDrawio(fixture('rdd.drawio'));
  let page = document.pages[0]!;
  const run = (operation: (edit: ModeEdit) => void): boolean => {
    // Relue avant : l'arbre a pu être écrit directement (ex. texte de la forme).
    page = documentFromTree(tree).pages[0]!;
    const changed = applyModeEdit(page, tree.pages[0]!, operation);
    page = documentFromTree(tree).pages[0]!;
    return changed;
  };
  const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
  return { run, page: () => page, shape, tree };
}
