import type { ShapeModel } from '../../model/types';
import { readableOn } from '../../render/styleColors';
import type { ModeEdit } from '../types';
import type { Field, TableContent } from './tables';
import {
  FIELDS,
  ICON,
  SECONDARY,
  SECONDARY_SCALE,
  TABLE,
  headerHeight,
  isSecondary,
  fieldsValue,
  tableContent,
  tableFields,
  tableHeight,
  tableKindOf,
  tableWidth,
} from './tables';

/**
 * Opérations du mode RDD sur une table (sujets 179, 180) : champs, couleur d'entête, table secondaire. Chacune est une
 * opération de mode (une étape d'annulation) ; la forme garde la taille de son contenu (sujet 247).
 */

/** Arrondi des tailles écrites (échelle 0,8 : pas de traîne de flottants). */
const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Taille de la table recalculée de son contenu (sujet 247), depuis son coin haut-gauche ; `changes` : ce que
 * l'opération en cours vient d'écrire (la page de `edit` ne le montre pas encore).
 */
export function fitTable(edit: ModeEdit, shape: ShapeModel, changes: Partial<TableContent> = {}): void {
  const kind = tableKindOf(shape);
  if (!kind) return;
  const content = { ...tableContent(shape), ...changes };
  edit.setShapeBounds(shape.id, {
    ...shape.bounds,
    width: round(tableWidth(kind, content)),
    height: round(tableHeight(kind, content.secondary, content.fields.length)),
  });
}

/**
 * Champs de la table, depuis le texte du panneau (un label par ligne, lignes vides ignorées) ; la hauteur suit. Un
 * label déjà présent garde son champ (kind, type, nullable) ; un nouveau est une propriété « Phrase » non nullable
 * (en attendant l'ajout sur la forme, sujet 250). Une table à clé primaire la garde en tête : le texte ne donne que les
 * champs suivants.
 */
export function setFields(edit: ModeEdit, shape: ShapeModel, text: string | undefined): void {
  const kind = tableKindOf(shape);
  if (!kind) return;
  const current = tableFields(shape);
  const key = kind.primaryKey ? current[0] : undefined;
  const others = current.filter((field) => field !== key);
  const labels = (text ?? '')
    .split('\n')
    .map((label) => label.trim())
    .filter((label) => label && label !== key?.label);
  const fields: Field[] = [
    ...(key ? [key] : []),
    ...labels.map(
      (label): Field =>
        others.find((field) => field.label === label) ?? { kind: 'property', label, type: 'string', nullable: false },
    ),
  ];
  edit.setElementAttribute(shape.id, FIELDS, fieldsValue(fields));
  fitTable(edit, shape, { fields });
}

/**
 * Champ `index` de la table modifié (sujet 249) : label, kind, nullable ; la taille suit. Un label vide est refusé ;
 * la clé primaire garde son kind et n'est jamais nullable, et aucun champ ne devient clé primaire.
 */
export function setField(
  edit: ModeEdit,
  shape: ShapeModel,
  index: number,
  patch: Partial<Pick<Field, 'label' | 'kind' | 'nullable'>>,
): void {
  const fields = tableFields(shape);
  const field = fields[index];
  const label = patch.label?.trim();
  if (!tableKindOf(shape) || !field || label === '') return;
  const key = field.kind === 'pk';
  const next: Field = {
    ...field,
    ...(label !== undefined && { label }),
    ...(patch.kind !== undefined && !key && patch.kind !== 'pk' && { kind: patch.kind }),
    ...(patch.nullable !== undefined && !key && { nullable: patch.nullable }),
  };
  const written = fields.map((current, i) => (i === index ? next : current));
  edit.setElementAttribute(shape.id, FIELDS, fieldsValue(written));
  fitTable(edit, shape, { fields: written });
}

/** Labels des champs en texte pour le panneau (un par ligne), sans la clé primaire (elle n'y est pas modifiable). */
export function fieldsText(shape: ShapeModel): string {
  const fields = tableFields(shape);
  return (tableKindOf(shape)?.primaryKey ? fields.slice(1) : fields).map((field) => field.label).join('\n');
}

/** Couleur de l'entête (`fillColor`) ; le texte du fichier suit le contraste pour draw.io (`fontColor`). */
export function setHeaderColor(edit: ModeEdit, shape: ShapeModel, color: string | undefined): void {
  if (!tableKindOf(shape) || !color) return;
  edit.setElementStyle(shape.id, 'fillColor', color);
  edit.setElementStyle(shape.id, 'fontColor', readableOn(color));
}

/**
 * Table secondaire : la forme prend la taille de son contenu à la nouvelle échelle (× 0,8), depuis son coin
 * haut-gauche ; entête et taille du nom suivent dans le style, pour draw.io.
 */
export function setSecondary(edit: ModeEdit, shape: ShapeModel, secondary: boolean): void {
  const kind = tableKindOf(shape);
  if (!kind || isSecondary(shape) === secondary) return;
  edit.setElementAttribute(shape.id, SECONDARY, secondary ? '1' : undefined);
  fitTable(edit, shape, { secondary });
  edit.setElementStyle(shape.id, 'startSize', String(round(headerHeight(secondary))));
  edit.setElementStyle(shape.id, 'fontSize', String(round(TABLE.nameSize * (secondary ? SECONDARY_SCALE : 1))));
}

/** Icône d'entête affichée ou masquée (`spatial.icon=0`, sujet 222) : la place du nom change, la largeur suit. */
export function setIcon(edit: ModeEdit, shape: ShapeModel, shown: boolean): void {
  if (!tableKindOf(shape)?.mark) return;
  edit.setElementAttribute(shape.id, ICON, shown ? undefined : '0');
  fitTable(edit, shape, { mark: shown });
}
