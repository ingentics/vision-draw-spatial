import type { PageModeDefinition } from '../../../core/plugins';
import { isToggled, toggleValue, numberValue, elementName, yamlProblem } from '../../../core/plugins';
import { convertDocumentKeys, documentBody, hasBody } from './tables/documentBody';
import { PRIMARY_KEY, fieldProblems, misplacedPrimaryKey } from './tables/fieldModel';
import { fitTable } from './tables/operations';
import { fieldHandleClicked, fieldHandles } from './editing/fieldHandles';
import { fieldParts } from './editing/fieldParts';
import { FIELD_PROPERTIES } from './editing/fieldProperties';
import { REGION_KIND, placeInRegions, regionContent, regionDrawnStyle, regionObstacles } from './regions/regionLayout';
import { FIT_REGION_KEY } from './regions/regionProperties';
import { OBSTACLE_GAP, RDD_SETTINGS, REGION_LIGHTENING } from './settings';
import {
  CARDINALITIES,
  RELATION_PROPERTIES,
  arrivalEdges,
  canLink,
  cardinalitiesShown,
  forbiddenLinks,
  isRelationEdge,
  syncRelations,
} from './relations';
import { ADD_DIVIDER_PROPERTY, TABLE_PROPERTIES, addDividerAfter } from './editing/tableProperties';
import { TABLE_KINDS, missingRequiredName, tableName } from './tables/tableKinds';
import { rowOf } from './editing/tableTargets';
import { RDD_KEYS } from './keys';

/** Flèche tirée ou rebranchée vers une partie de sa forme d'arrivée (sujet 333). */
const arrivalOf = (edgeId: string, part: string | undefined) => (part === undefined ? undefined : { edgeId, part });

/**
 * Mode « RDD — Relational Database Designer » (sujet 179) : une page de tables (modèles, entités…), lue à plat. Ses
 * formes sont les seules de la palette ; leurs réglages (champs, table secondaire) sont ceux du mode, la couleur de
 * l'entête vient du style de la forme (sujet 260). Dans draw.io, une table est un swimlane de la couleur de son entête.
 */
export const definition: PageModeDefinition = {
  id: 'rdd',
  ...RDD_KEYS,
  name: 'RDB Designer — Relational Database Designer',
  shortName: 'RDB Designer',
  description: 'Modèles de données relationnels : tables, champs et couleurs d’entête, en 2D',
  // Une table : entête pleine, lignes des champs en accent.
  icon: {
    fill: 'M2.5 2h11a1 1 0 0 1 1 1v3h-13V3a1 1 0 0 1 1-1z',
    line: 'M1.5 6v7.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V6',
    accent: 'M4 9h6M4 12h4.5',
  },
  settings: RDD_SETTINGS,
  // Fond des régions dessiné plus clair que la couleur de leur style (sujet 345), le fichier garde celle du style.
  dressing: (_page, values) => ({
    shapeStyle: (shape) => regionDrawnStyle(shape, numberValue(values, REGION_LIGHTENING)),
  }),
  page: {
    viewModes: ['top'],
    palette: {
      // Toutes les tables, la région (sujet 182), puis Texte et Titre ; le modèle abstrait, sans élément de palette, n'y apparaît pas.
      shapes: [...Object.keys(TABLE_KINDS), REGION_KIND, 'text', 'title'],
      categories: [{ id: 'rdd', name: 'RDB Designer', order: 5 }],
    },
    properties: [
      {
        // Encart du mode sur la page (sujets 265, 266) : textes des cardinalités, sur toutes les relations (les pointes
        // restent).
        type: 'toggle',
        key: CARDINALITIES,
        section: 'RDB Designer',
        label: 'Afficher les cardinalités',
        title:
          'Textes des cardinalités aux bouts des flèches de relation ; les pointes restent (spatial.rdd.cardinalities)',
        value: (page) => toggleValue(cardinalitiesShown(page)),
        write: (edit, _target, value) => {
          const shown = isToggled(value);
          edit.setPageAttribute(CARDINALITIES, shown ? undefined : '0');
          syncRelations(edit, { cardinalities: shown });
        },
      },
    ],
  },
  lifecycle: {
    // À l'ouverture, chaque table prend la taille de son contenu (sujet 255), ses champs de relation suivent les flèches
    // (sujet 265) ; les clés d'un document d'avant le corps YAML deviennent son corps (sujet 269).
    opened: (edit) => {
      for (const shape of edit.page.shapes) {
        convertDocumentKeys(edit, shape);
        fitTable(edit, shape);
      }
      syncRelations(edit);
    },
    // Éléments supprimés : les champs de relation suivent leurs flèches (sujet 265).
    removed: syncRelations,
    check: (page) => [
      // Clé primaire absente ou déplacée (fichier modifié) : remise en tête à l'affichage.
      ...page.shapes.filter(misplacedPrimaryKey).map((shape) => ({
        cellId: shape.id,
        message: `Table « ${elementName(shape)} » : clé primaire ${PRIMARY_KEY} absente ou déplacée, remise en tête`,
      })),
      // Champs illisibles, type inconnu, clé primaire nullable (sujet 246).
      ...page.shapes.flatMap((shape) =>
        fieldProblems(shape).map((problem) => ({
          cellId: shape.id,
          message: `Table « ${elementName(shape)} » : ${problem}`,
        })),
      ),
      // Flèche entre deux formes qui ne peuvent pas être liées (sujet 265).
      ...forbiddenLinks(page).map(({ edgeId, message }) => ({ cellId: edgeId, message })),
      // Corps d'un document en YAML invalide (sujet 269) : signalé, la saisie reste libre.
      ...page.shapes.flatMap((shape) => {
        const problem = hasBody(shape) ? yamlProblem(documentBody(shape)) : undefined;
        return problem === undefined
          ? []
          : [{ cellId: shape.id, message: `Document « ${tableName(shape)} » : YAML invalide, ${problem}` }];
      }),
      // Document JSONB sans nom : affiché « Document » (sujet 181).
      ...page.shapes.flatMap((shape) => {
        const name = missingRequiredName(shape);
        return name === undefined ? [] : [{ cellId: shape.id, message: `${name} sans nom : le nom est obligatoire` }];
      }),
    ],
  },
  // Relations (sujet 265) : flèches permises, et le champ de relation de la table d'arrivée qui suit sa flèche
  // (créée, rebranchée, supprimée, collée) ; une flèche d'un document arrive sur la ligne d'un champ dynamique, qui la
  // retient (sujet 269).
  edges: {
    // Formulaire d'une flèche de relation : celui de sa sorte (sujets 265, 268).
    properties: RELATION_PROPERTIES,
    connects: (_page, source, target, part) => canLink(source, target, part),
    // Flèche de relation : bouts imposés par sa sorte (cardinalités d'après « Optionnel » du champ entre tables, aucune
    // pointe depuis un embedded, sujet 268) ; le reste en lecture seule.
    manages: isRelationEdge,
    // Flèche vers un champ : arrivée sur sa ligne, même en ancrage automatique ou Typon (sujet 338).
    placedEntries: arrivalEdges,
    created: (edit, edgeId, _current, part) => syncRelations(edit, undefined, undefined, arrivalOf(edgeId, part)),
    reconnected: (edit, edgeId, part) => syncRelations(edit, undefined, undefined, arrivalOf(edgeId, part)),
  },
  gestures: {
    // Table, puis ligne sélectionnée : champ (sections du mode, PostgreSQL, Gouvernance), séparateur (sujets 249, 253,
    // 260), ou champ d'une relation embedded (formulaire de sa flèche, sujet 268) ; le bouton du séparateur en bas. Une
    // région n'a pas de réglage du mode, sa couleur est dans la section Style (sujet 345).
    properties: [...TABLE_PROPERTIES, ...FIELD_PROPERTIES, ADD_DIVIDER_PROPERTY],
    // Une région emporte son contenu (sujet 182).
    carries: (page, shape) => regionContent(page, shape),
    // Une région ne passe pas sur ses sœurs (sujet 241).
    obstacles: (page, shape, values) => regionObstacles(page, shape, numberValue(values, OBSTACLE_GAP)),
    // Une forme posée qui dépasse de sa région l'agrandit, marge comprise (sujet 183) ; les régions restent derrière
    // leur contenu (sujet 230).
    placed: (edit, shapeIds, before) => {
      placeInRegions(edit, shapeIds, before);
      syncRelations(edit);
    },
    // Table renommée : sa largeur suit le nom (sujet 247).
    relabeled: (edit, elementId) => {
      const shape = edit.page.shapes.find((s) => s.id === elementId);
      if (shape) fitTable(edit, shape);
    },
    // « + » sous la table : ajoute aussitôt un champ sans type (sujets 250, 256).
    handles: { list: (_page, shape) => fieldHandles(shape), clicked: fieldHandleClicked },
  },
  // Champs des tables, sélectionnables dans la table (sujet 249).
  parts: fieldParts,
  keys: {
    // « - » sur une ligne sélectionnée : un séparateur après elle, son texte en édition (sujet 253).
    '-': {
      label: 'Ajouter un séparateur',
      applies: (_page, target, part) => rowOf(target, part) !== undefined,
      run: (edit, target, _current, part) => addDividerAfter(edit, target, part),
    },
    f: FIT_REGION_KEY,
  },
};
