import type { PageModeDefinition } from '../../../core/plugins';
import { PRIMARY_KEY, fieldProblems, misplacedPrimaryKey } from './tables/fieldModel';
import { fitTable } from './tables/operations';
import { fieldHandleClicked, fieldHandles } from './editing/fieldHandles';
import { fieldParts } from './editing/fieldParts';
import { FIELD_PROPERTIES } from './editing/fieldProperties';
import { REGION_KIND, placeInRegions, regionContent, regionObstacles } from './regions/regionLayout';
import { FIT_REGION_KEY, REGION_PROPERTIES } from './regions/regionProperties';
import { OBSTACLE_GAP, RDD_SETTINGS } from './settings';
import {
  CARDINALITIES,
  RELATION_PROPERTIES,
  canLink,
  cardinalitiesShown,
  forbiddenLinks,
  isRelationEdge,
  syncRelations,
} from './relations';
import { ADD_DIVIDER_PROPERTY, TABLE_PROPERTIES, addDividerAfter } from './editing/tableProperties';
import { TABLE_KINDS, missingRequiredName } from './tables/tableKinds';
import { rowOf, shapeName } from './editing/tableTargets';

/**
 * Mode « RDD — Relational Database Designer » (sujet 179) : une page de tables (modèles, entités…), lue à plat. Ses
 * formes sont les seules de la palette ; leurs réglages (champs, table secondaire) sont ceux du mode, la couleur de
 * l'entête vient du style de la forme (sujet 260). Dans draw.io, une table est un swimlane de la couleur de son entête.
 */
export const definition: PageModeDefinition = {
  id: 'rdd',
  name: 'RDD — Relational Database Designer',
  shortName: 'RDD',
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
  settings: RDD_SETTINGS,
  pageProperties: [
    {
      // Encart du mode sur la page (sujets 265, 266) : textes des cardinalités, sur toutes les relations (les pointes
      // restent).
      type: 'toggle',
      key: CARDINALITIES,
      section: 'RDD',
      label: 'Afficher les cardinalités',
      title: 'Textes des cardinalités aux bouts des flèches de relation ; les pointes restent (spatial.cardinalities)',
      value: (page) => (cardinalitiesShown(page) ? '1' : undefined),
      write: (edit, _target, value) => {
        const shown = value === '1';
        edit.setPageAttribute(CARDINALITIES, shown ? undefined : '0');
        syncRelations(edit, { cardinalities: shown });
      },
    },
  ],
  // Formulaire d'une flèche de relation : celui de sa sorte (sujets 265, 268).
  edgeProperties: RELATION_PROPERTIES,
  // Région, table, puis ligne sélectionnée : champ (sections du mode, PostgreSQL, Gouvernance), séparateur (sujets 249,
  // 253, 260), ou champ d'une relation embedded (formulaire de sa flèche, sujet 268) ; le bouton du séparateur en bas.
  shapeProperties: [...REGION_PROPERTIES, ...TABLE_PROPERTIES, ...FIELD_PROPERTIES, ADD_DIVIDER_PROPERTY],
  // À l'ouverture, chaque table prend la taille de son contenu (sujet 255), ses champs de relation suivent les flèches
  // (sujet 265).
  opened: (edit) => {
    for (const shape of edit.page.shapes) fitTable(edit, shape);
    syncRelations(edit);
  },
  // Relations (sujet 265) : flèches permises, et le champ de relation de la table d'arrivée qui suit sa flèche
  // (créée, rebranchée, supprimée, collée).
  connects: (_page, source, target) => canLink(source, target),
  // Flèche de relation : bouts imposés par sa sorte (cardinalités d'après « Optionnel » du champ entre tables, aucune
  // pointe depuis un embedded, sujet 268) ; le reste en lecture seule.
  managesEdge: isRelationEdge,
  edgeCreated: (edit) => syncRelations(edit),
  edgeReconnected: (edit) => syncRelations(edit),
  repair: syncRelations,
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
  placed: (edit, shapeIds, before) => {
    placeInRegions(edit, shapeIds, before);
    syncRelations(edit);
  },
  // Une région ne passe pas sur ses sœurs (sujet 241).
  obstacles: (page, shape, values) => regionObstacles(page, shape, values[OBSTACLE_GAP] as number),
  keys: {
    // « - » sur une ligne sélectionnée : un séparateur après elle, son texte en édition (sujet 253).
    '-': {
      label: 'Ajouter un séparateur',
      applies: (_page, target, part) => rowOf(target, part) !== undefined,
      run: (edit, target, _current, part) => addDividerAfter(edit, target, part),
    },
    f: FIT_REGION_KEY,
  },
  // Clé primaire absente ou déplacée (fichier modifié) : remise en tête à l'affichage.
  check: (page) => [
    ...page.shapes.filter(misplacedPrimaryKey).map((shape) => ({
      cellId: shape.id,
      message: `Table « ${shapeName(shape)} » : clé primaire ${PRIMARY_KEY} absente ou déplacée, remise en tête`,
    })),
    // Champs illisibles, type inconnu, clé primaire nullable (sujet 246).
    ...page.shapes.flatMap((shape) =>
      fieldProblems(shape).map((problem) => ({
        cellId: shape.id,
        message: `Table « ${shapeName(shape)} » : ${problem}`,
      })),
    ),
    // Flèche entre deux formes qui ne peuvent pas être liées (sujet 265).
    ...forbiddenLinks(page).map(({ edgeId, message }) => ({ cellId: edgeId, message })),
    // Document JSONB sans nom : affiché « Document » (sujet 181).
    ...page.shapes.flatMap((shape) => {
      const name = missingRequiredName(shape);
      return name === undefined ? [] : [{ cellId: shape.id, message: `${name} sans nom : le nom est obligatoire` }];
    }),
  ],
};
