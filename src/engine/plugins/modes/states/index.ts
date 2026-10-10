import type { PageModeDefinition } from '../../../core/plugins';
import { numberValue, shapeOf } from '../../../core/plugins';
import { FIT_COMPOSITE_KEY } from './composites/compositeKey';
import { ERROR_COLOR, EXIT_PROPERTY, leadsToError } from './exits/exitKind';
import {
  compositeContent,
  compositeDrawnStyle,
  compositeObstacles,
  placeInComposites,
} from './composites/compositeLayout';
import { COMPOSITE_KIND, FINAL_KIND, INITIAL_KIND, STATE_KIND } from './kinds';
import { STATES_KEYS } from './keys';
import { COMPOSITE_LIGHTENING, OBSTACLE_GAP, STATES_SETTINGS } from './settings';
import { BODY_PROPERTY, fitState } from './state/stateBody';
import { stateParts } from './state/stateParts';
import { TRANSITION_PROPERTIES, canConnect, styleTransition, transitionIssues } from './transitions/transitionRules';

/**
 * Mode « Machine à états » (sujets 433 à 436) : états (titre et contenu), points d'entrée et de sortie, ensembles
 * d'états, et des transitions entre eux, exportés en diagramme d'états PlantUML. Lu à plat, en 2D seulement.
 */
export const definition: PageModeDefinition = {
  id: 'states',
  ...STATES_KEYS,
  name: 'Machine à états',
  shortName: 'États',
  description: 'Machines à états : états, points d’entrée et de sortie, ensembles et transitions, en 2D',
  // Un point d'entrée, sa transition, puis un état en rectangle arrondi.
  icon: {
    fill: 'M3 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    accent:
      'M5.5 8H7.5M6.6 7.1 7.5 8l-.9.9M10.5 4.5h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z',
  },
  settings: STATES_SETTINGS,
  // Fond des ensembles dessiné plus clair que la couleur de leur style, le fichier garde celle du style ; transitions
  // vers une sortie en erreur en rouge, sans assombrissement.
  dressing: (page, values) => ({
    shapeStyle: (shape) => compositeDrawnStyle(shape, numberValue(values, COMPOSITE_LIGHTENING)),
    edgeColor: (edge) => (leadsToError(page, edge) ? ERROR_COLOR : undefined),
    edgeDarken: 0,
  }),
  page: {
    viewModes: ['top'],
    // Transitions en ancrage manuel, tracées droites (sujet 442).
    defaults: { anchoring: 'manual', edgeLine: 'straight' },
    palette: {
      shapes: [STATE_KIND, INITIAL_KIND, FINAL_KIND, COMPOSITE_KIND, 'text', 'title', 'post-it'],
      categories: [{ id: 'states', name: 'États', order: 5 }],
    },
  },
  lifecycle: {
    // À l'ouverture, chaque état prend la hauteur de son titre et de son contenu (mesure exacte du texte).
    opened: (edit) => {
      for (const shape of edit.page.shapes) fitState(edit, shape);
    },
    // Transitions à bout libre ou refusées (collage, fichier modifié) : signalées, non exportées.
    check: transitionIssues,
  },
  edges: {
    // Toute flèche est une transition : bouts imposés, nom au milieu, commentaire ; ses bouts en tête du panneau.
    properties: TRANSITION_PROPERTIES,
    connects: (_page, source, target) => canConnect(source, target),
    attachedEnds: () => true,
    manages: () => true,
    created: (edit, edgeId) => styleTransition(edit, edgeId),
  },
  gestures: {
    properties: [
      // Contenu d'un état.
      BODY_PROPERTY,
      // Point de sortie : attendue ou en erreur.
      EXIT_PROPERTY,
    ],
    // Titre, commentaire et contenu d'un état dans une seule section.
    mainSection: { title: 'État', kinds: [STATE_KIND] },
    // Un ensemble emporte son contenu, points d'entrée et de sortie compris.
    carries: compositeContent,
    // Un ensemble ne passe pas sur ses frères.
    obstacles: (page, shape, values) => compositeObstacles(page, shape, numberValue(values, OBSTACLE_GAP)),
    // État redimensionné : sa hauteur suit sa largeur ; une forme qui dépasse de son ensemble l'agrandit, les
    // ensembles restent derrière leur contenu.
    placed: (edit, shapeIds, before) => {
      for (const id of shapeIds) {
        const shape = shapeOf(edit.page, id);
        if (shape) fitState(edit, shape);
      }
      placeInComposites(edit, shapeIds, before);
    },
    // Titre changé : la hauteur de l'état le suit.
    relabeled: (edit, elementId) => {
      const shape = shapeOf(edit.page, elementId);
      if (shape) fitState(edit, shape);
    },
  },
  parts: stateParts,
  keys: { f: FIT_COMPOSITE_KEY },
};
