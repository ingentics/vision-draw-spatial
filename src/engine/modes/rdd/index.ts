import type { ShapeModel } from '../../model/types';
import type { ModeTarget, PageModeDefinition } from '../types';
import {
  DEFAULT_HEADER_COLOR,
  ICON,
  PRIMARY_KEY,
  SECONDARY,
  TABLE_KINDS,
  fieldProblems,
  isSecondary,
  misplacedPrimaryKey,
  missingName,
  FIELD_TYPES,
  isDivider,
  shownMark,
  tableFields,
  tableKindOf,
} from './tables';
import { addDivider, fitTable, setField, setHeaderColor, setIcon, setSecondary } from './operations';
import { fieldHandleClicked, fieldHandles } from './fieldHandles';
import { fieldIndex, fieldParts } from './fieldParts';
import type { Field, FieldKind, TableRow } from './tables';
import {
  REGION_COLORS,
  REGION_KIND,
  fitRegion,
  isRegion,
  placeInRegions,
  regionContent,
  regionObstacles,
  setRegionColor,
} from './regions';

/** Table du mode sélectionnée ; undefined pour une flèche, la page ou une autre forme. */
const tableOf = (target: ModeTarget): ShapeModel | undefined =>
  'kind' in target && tableKindOf(target) ? target : undefined;
const notTable = (_page: unknown, target: ModeTarget) => !tableOf(target);
/** Ligne sélectionnée d'une table (champ, sujet 249, ou séparateur, sujet 253) : la table, le rang et la ligne. */
function rowOf(
  target: ModeTarget,
  part: string | undefined,
): { shape: ShapeModel; index: number; row: TableRow } | undefined {
  const shape = tableOf(target);
  const index = shape && fieldIndex(shape, part);
  return shape && index !== undefined ? { shape, index, row: tableFields(shape)[index]! } : undefined;
}
/** Champ sélectionné d'une table (pas un séparateur). */
function fieldOf(
  target: ModeTarget,
  part: string | undefined,
): { shape: ShapeModel; index: number; field: Field } | undefined {
  const selected = rowOf(target, part);
  return selected && !isDivider(selected.row) ? { ...selected, field: selected.row } : undefined;
}
/** Kinds proposés pour un champ : jamais la clé primaire, unique et en tête. */
const FIELD_KIND_OPTIONS: Array<{ value: Exclude<FieldKind, 'pk'>; label: string }> = [
  { value: 'property', label: 'Propriété' },
  { value: 'fk', label: 'Clé étrangère' },
  { value: 'external-fk', label: 'Clé étrangère (autre domaine)' },
];
const notField = (_page: unknown, target: ModeTarget, part?: string) => !fieldOf(target, part);
/** Pas de champ, ou la clé primaire (ni kind ni nullable modifiables). */
const notPlainField = (_page: unknown, target: ModeTarget, part?: string) =>
  (fieldOf(target, part)?.field.kind ?? 'pk') === 'pk';
/** Région du mode sélectionnée (sujet 182). */
const regionTarget = (target: ModeTarget): ShapeModel | undefined =>
  'kind' in target && isRegion(target) ? target : undefined;

/**
 * Mode « RDD — Relational Database Designer » (sujet 179) : une page de tables (modèles, entités…), lue à plat. Ses
 * formes sont les seules de la palette ; leurs réglages (champs, couleur d'entête, table secondaire) sont ceux du
 * mode. Dans draw.io, une table est un swimlane de la couleur de son entête.
 */
export const definition: PageModeDefinition = {
  id: 'rdd',
  name: 'RDD — Relational Database Designer',
  description: 'Modèles de données relationnels : tables, champs et couleurs d’entête, en 2D',
  // Une table : entête pleine, lignes des champs en accent.
  icon: {
    fill: 'M2.5 2h11a1 1 0 0 1 1 1v3h-13V3a1 1 0 0 1 1-1z',
    line: 'M1.5 6v7.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V6',
    accent: 'M4 9h6M4 12h4.5',
  },
  viewModes: ['top'],
  // Sélection toujours en contour, quel que soit le paramètre (sujet 254).
  selectionStyle: 'outline',
  // Toutes les tables, puis la région (sujet 182) ; le modèle abstrait, sans élément de palette, n'y apparaît pas.
  shapes: [...Object.keys(TABLE_KINDS), REGION_KIND],
  paletteCategories: [{ id: 'rdd', name: 'RDD', order: 5 }],
  shapeProperties: [
    {
      type: 'select',
      key: 'fillColor',
      label: 'Couleur',
      title: 'Couleur de l’entête (fillColor) ; texte noir ou blanc selon le contraste',
      options: (_page, palette) =>
        [...new Set([DEFAULT_HEADER_COLOR, ...palette])].map((color) => ({ value: color, label: color, color })),
      value: (_page, target) => tableOf(target)?.style.fillColor,
      write: (edit, target, value) => {
        const shape = tableOf(target);
        if (shape) setHeaderColor(edit, shape, value);
      },
      hidden: notTable,
    },
    {
      // Région (sujets 182, 233) : sa propre palette, bordure grise.
      type: 'select',
      key: 'rdd.regionColor',
      label: 'Couleur',
      title: 'Couleur du fond de la région (fillColor)',
      options: () => REGION_COLORS.map((color) => ({ value: color, label: color, color })),
      value: (_page, target) => regionTarget(target)?.style.fillColor,
      write: (edit, target, value) => {
        const shape = regionTarget(target);
        if (shape) setRegionColor(edit, shape, value);
      },
      hidden: (_page, target) => !regionTarget(target),
    },
    {
      type: 'toggle',
      key: SECONDARY,
      label: 'Table secondaire',
      title: 'Table secondaire (spatial.secondary) : 20 % plus petite',
      value: (_page, target) => {
        const shape = tableOf(target);
        return shape && isSecondary(shape) ? '1' : undefined;
      },
      write: (edit, target, value) => {
        const shape = tableOf(target);
        if (shape) setSecondary(edit, shape, value === '1');
      },
      hidden: notTable,
    },
    {
      type: 'toggle',
      key: ICON,
      label: 'Icône',
      title: 'Icône de la table en haut à droite de l’entête (spatial.icon=0 la masque)',
      value: (_page, target) => {
        const shape = tableOf(target);
        return shape && shownMark(shape) ? '1' : undefined;
      },
      write: (edit, target, value) => {
        const shape = tableOf(target);
        if (shape) setIcon(edit, shape, value === '1');
      },
      hidden: (_page, target) => {
        const shape = tableOf(target);
        return !shape || !tableKindOf(shape)?.mark;
      },
    },
    {
      type: 'text',
      key: 'rdd.primaryKey',
      label: 'Clé primaire',
      title: 'Clé primaire de la table : toujours le premier champ, ni retirée ni déplacée',
      readOnly: true,
      value: (_page, target) => {
        const shape = tableOf(target);
        return shape && tableFields(shape)[0]?.label;
      },
      hidden: (_page, target) => {
        const shape = tableOf(target);
        return !shape || !tableKindOf(shape)?.primaryKey;
      },
    },
    // Champ sélectionné dans sa table (sujet 249).
    {
      type: 'text',
      part: true,
      key: 'rdd.field.label',
      label: 'Champ',
      title: 'Nom du champ (double-clic sur la ligne : modification sur place) ; jamais vide',
      value: (_page, target, part) => fieldOf(target, part)?.field.label,
      write: (edit, target, value, part) => {
        const selected = fieldOf(target, part);
        if (selected) setField(edit, selected.shape, selected.index, { label: value ?? '' });
      },
      hidden: notField,
    },
    {
      // Séparateur sélectionné (sujet 253) : son texte, vide permis (un simple trait).
      type: 'text',
      part: true,
      key: 'rdd.divider.label',
      label: 'Séparateur',
      title: 'Texte au milieu du séparateur ; vide : un simple trait',
      value: (_page, target, part) => rowOf(target, part)?.row.label,
      write: (edit, target, value, part) => {
        const selected = rowOf(target, part);
        if (selected) fieldParts.setText!(edit, selected.shape, String(selected.index), value ?? '');
      },
      hidden: (_page, target, part) => {
        const selected = rowOf(target, part);
        return !selected || !isDivider(selected.row);
      },
    },
    {
      // Type de donnée, modifiable à tout moment (sujet 256) ; « Aucun » pour un champ ajouté par le « + ».
      type: 'select',
      part: true,
      key: 'rdd.field.type',
      label: 'Type',
      title: 'Type de donnée du champ',
      options: () => [
        { value: '', label: 'Aucun' },
        ...Object.entries(FIELD_TYPES).map(([value, label]) => ({ value, label })),
      ],
      value: (_page, target, part) => fieldOf(target, part)?.field.type,
      write: (edit, target, value, part) => {
        const selected = fieldOf(target, part);
        if (selected) setField(edit, selected.shape, selected.index, { type: value ?? '' });
      },
      hidden: notField,
    },
    {
      type: 'select',
      part: true,
      key: 'rdd.field.kind',
      label: 'Rôle',
      title: 'Propriété, clé étrangère, ou clé étrangère vers un autre domaine',
      options: () => FIELD_KIND_OPTIONS,
      value: (_page, target, part) => fieldOf(target, part)?.field.kind,
      write: (edit, target, value, part) => {
        const selected = fieldOf(target, part);
        const kind = FIELD_KIND_OPTIONS.find((option) => option.value === value)?.value;
        if (selected && kind) setField(edit, selected.shape, selected.index, { kind });
      },
      hidden: notPlainField,
    },
    {
      type: 'toggle',
      part: true,
      key: 'rdd.field.nullable',
      label: 'Nullable',
      title: 'Le champ peut être vide (NULL)',
      value: (_page, target, part) => (fieldOf(target, part)?.field.nullable ? '1' : undefined),
      write: (edit, target, value, part) => {
        const selected = fieldOf(target, part);
        if (selected) setField(edit, selected.shape, selected.index, { nullable: value === '1' });
      },
      hidden: notPlainField,
    },
    {
      // Tout en bas de l'encart, table ou ligne sélectionnée : un séparateur après la ligne (sinon en fin de liste),
      // sélectionné et son texte en édition (sujet 253).
      type: 'button',
      anyPart: true,
      key: 'rdd.addDivider',
      label: 'Ajouter un séparateur',
      title: 'Ajoute un séparateur après la ligne sélectionnée, sinon en fin de liste (touche « - » sur une ligne)',
      write: (edit, target, _value, part) => {
        const shape = tableOf(target);
        const index = shape && addDivider(edit, shape, rowOf(target, part)?.index);
        return index === undefined ? undefined : String(index);
      },
      hidden: notTable,
    },
  ],
  // À l'ouverture, chaque table prend la taille de son contenu (sujet 255).
  opened: (edit) => {
    for (const shape of edit.page.shapes) fitTable(edit, shape);
  },
  // Champs des tables, sélectionnables dans la table (sujet 249).
  parts: fieldParts,
  // « + » sous la table : ajoute aussitôt un champ sans type (sujets 250, 256).
  handles: (_page, shape) => fieldHandles(shape),
  handleClicked: fieldHandleClicked,
  // Table renommée : sa largeur suit le nom (sujet 247).
  relabeled: (edit, elementId) => {
    const shape = edit.page.shapes.find((s) => s.id === elementId);
    if (shape) fitTable(edit, shape);
  },
  // Une région emporte son contenu (sujet 182).
  carries: (page, shape) => regionContent(page, shape),
  // Une forme posée qui dépasse de sa région l'agrandit, marge comprise (sujet 183) ; les régions restent derrière
  // leur contenu (sujet 230).
  placed: placeInRegions,
  // Une région ne passe pas sur ses sœurs (sujet 241).
  obstacles: regionObstacles,
  keys: {
    // « - » sur une ligne sélectionnée : un séparateur après elle, son texte en édition (sujet 253).
    '-': {
      label: 'Ajouter un séparateur',
      applies: (_page, target, part) => rowOf(target, part) !== undefined,
      run: (edit, target, _current, part) => {
        const selected = rowOf(target, part);
        const index = selected && addDivider(edit, selected.shape, selected.index);
        return index === undefined ? undefined : String(index);
      },
    },
    // « f » : région ajustée à son contenu (sujet 184) ; sur un autre élément, la touche garde son effet.
    f: {
      label: 'Ajuster la région',
      applies: (_page, target) => 'kind' in target && isRegion(target),
      run: (edit, target) => {
        if ('kind' in target) fitRegion(edit, target);
      },
    },
  },
  // Clé primaire absente ou déplacée (fichier modifié) : remise en tête à l'affichage.
  check: (page) => [
    ...page.shapes.filter(misplacedPrimaryKey).map((shape) => ({
      cellId: shape.id,
      message: `Table « ${shape.label || shape.id} » : clé primaire ${PRIMARY_KEY.label} absente ou déplacée, remise en tête`,
    })),
    // Champs illisibles, type inconnu, clé primaire nullable (sujet 246).
    ...page.shapes.flatMap((shape) =>
      fieldProblems(shape).map((problem) => ({
        cellId: shape.id,
        message: `Table « ${shape.label || shape.id} » : ${problem}`,
      })),
    ),
    // Document JSONB sans nom : affiché « Document » (sujet 181).
    ...page.shapes.filter(missingName).map((shape) => ({
      cellId: shape.id,
      message: `${tableKindOf(shape)!.requiredName} sans nom : le nom est obligatoire`,
    })),
  ],
};
