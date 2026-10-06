import type { ShapeModel } from '../../model/types';
import type { ModeTarget, PageModeDefinition } from '../types';
import {
  DEFAULT_HEADER_COLOR,
  FIELDS,
  PRIMARY_KEY,
  SECONDARY,
  TABLE_KINDS,
  isSecondary,
  misplacedPrimaryKey,
  tableKindOf,
} from './table';
import { fieldsText, setFields, setHeaderColor, setSecondary } from './tables';

/** Table du mode sélectionnée ; undefined pour une flèche, la page ou une autre forme. */
const tableOf = (target: ModeTarget): ShapeModel | undefined =>
  'kind' in target && tableKindOf(target) ? target : undefined;
const notTable = (_page: unknown, target: ModeTarget) => !tableOf(target);

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
  // Toutes les tables ; le modèle abstrait, sans élément de palette, n'y apparaît pas.
  shapes: Object.keys(TABLE_KINDS),
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
      type: 'text',
      key: 'rdd.primaryKey',
      label: 'Clé primaire',
      title: 'Clé primaire de la table : toujours le premier champ, ni retirée ni déplacée',
      readOnly: true,
      value: () => PRIMARY_KEY,
      hidden: (_page, target) => {
        const shape = tableOf(target);
        return !shape || !tableKindOf(shape)?.primaryKey;
      },
    },
    {
      type: 'text',
      multiline: true,
      key: FIELDS,
      label: 'Champs',
      title:
        'Champs de la table (spatial.fields), un par ligne, après la clé primaire s’il y en a une ; la table grandit avec eux',
      placeholder: 'un champ par ligne',
      value: (_page, target) => {
        const shape = tableOf(target);
        return shape && fieldsText(shape);
      },
      write: (edit, target, value) => {
        const shape = tableOf(target);
        if (shape) setFields(edit, shape, value);
      },
      hidden: notTable,
    },
  ],
  // Clé primaire absente ou déplacée (fichier modifié) : remise en tête à l'affichage.
  check: (page) =>
    page.shapes.filter(misplacedPrimaryKey).map((shape) => ({
      cellId: shape.id,
      message: `Table « ${shape.label || shape.id} » : clé primaire ${PRIMARY_KEY} absente ou déplacée, remise en tête`,
    })),
};
