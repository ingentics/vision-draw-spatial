import type { ShapeModel } from '../../model/types';
import type { ModeTarget, PageModeDefinition } from '../types';
import {
  DEFAULT_HEADER_COLOR,
  FIELDS,
  ICON,
  PRIMARY_KEY,
  SECONDARY,
  TABLE_KINDS,
  isSecondary,
  misplacedPrimaryKey,
  missingName,
  shownMark,
  tableKindOf,
} from './tables';
import { fieldsText, setFields, setHeaderColor, setSecondary } from './operations';
import {
  REGION_COLORS,
  REGION_KIND,
  fitRegion,
  isRegion,
  placeInRegions,
  regionContent,
  setRegionColor,
} from './regions';

/** Table du mode sélectionnée ; undefined pour une flèche, la page ou une autre forme. */
const tableOf = (target: ModeTarget): ShapeModel | undefined =>
  'kind' in target && tableKindOf(target) ? target : undefined;
const notTable = (_page: unknown, target: ModeTarget) => !tableOf(target);
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
      write: (edit, target, value) => edit.setElementAttribute(target.id, ICON, value === '1' ? undefined : '0'),
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
  // Une région emporte son contenu (sujet 182).
  carries: (page, shape) => regionContent(page, shape),
  // Une forme posée qui dépasse de sa région l'agrandit, marge comprise (sujet 183) ; les régions restent derrière
  // leur contenu (sujet 230).
  placed: placeInRegions,
  keys: {
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
      message: `Table « ${shape.label || shape.id} » : clé primaire ${PRIMARY_KEY} absente ou déplacée, remise en tête`,
    })),
    // Document JSONB sans nom : affiché « Document » (sujet 181).
    ...page.shapes.filter(missingName).map((shape) => ({
      cellId: shape.id,
      message: `${tableKindOf(shape)!.requiredName} sans nom : le nom est obligatoire`,
    })),
  ],
};
