import type { PluginSetting } from '../../../core/plugins';

/** Clé du réglage de l'écart entre ensembles frères (sujet 435, repris de la région RDD). */
export const OBSTACLE_GAP = 'obstacleGap';

/** Clé du réglage de l'éclaircissement du fond des ensembles (sujet 435, repris de la région RDD). */
export const COMPOSITE_LIGHTENING = 'compositeLightening';

/** Réglages globaux du mode Machine à états (Paramètres › Modes › États). */
export const STATES_SETTINGS: PluginSetting[] = [
  {
    key: OBSTACLE_GAP,
    type: 'number',
    label: 'Écart entre ensembles frères',
    hint: 'Un ensemble qu’on déplace ou redimensionne s’arrête à cette distance de ses voisins (même niveau), onglets compris ; une ligne rouge en pointillé montre la limite.',
    min: 0,
    max: 80,
    step: 1,
    default: 20,
    unit: 'px',
  },
  {
    key: COMPOSITE_LIGHTENING,
    type: 'number',
    label: 'Éclaircissement du fond des ensembles',
    hint: 'Fond d’un ensemble dessiné plus clair que la couleur de son style, rapproché du blanc de cette fraction ; le fichier garde la couleur du style (draw.io la montre telle quelle).',
    min: 0,
    max: 1,
    step: 0.05,
    default: 0.55,
    unit: '%',
  },
];
