import type { ModeSetting } from '../types';

/** Clé du réglage de l'écart entre régions sœurs. */
export const OBSTACLE_GAP = 'obstacleGap';

/** Réglages globaux du mode RDD (Paramètres › Modes › RDD, ticket 283). */
export const RDD_SETTINGS: ModeSetting[] = [
  {
    key: OBSTACLE_GAP,
    type: 'number',
    label: 'Écart entre régions sœurs',
    hint: 'Une région qu’on déplace ou redimensionne s’arrête à cette distance de ses voisines (même niveau), onglets compris ; une ligne rouge en pointillé montre la limite.',
    min: 0,
    max: 80,
    step: 1,
    default: 20,
    unit: 'px',
    legacy: 'modeObstacleGap',
  },
];
