import type { ModeCurrentLook, PluginSetting, PluginValues } from '../../../core/plugins';
import { edgeBadgeSettings, numberValue } from '../../../core/plugins';

/** Réglages globaux du mode Séquences (Paramètres › Modes › Séquences, ticket 283). */
export const SEQUENCES_SETTINGS: PluginSetting[] = [
  {
    key: 'dimOpacity',
    type: 'number',
    group: 'Flux courant',
    label: 'Opacité hors du flux courant',
    hint: 'Flèches hors du flux courant et formes qu’aucune de ses flèches ne relie ; rien n’est estompé si le flux courant n’a pas de flèche.',
    min: 0.05,
    max: 1,
    step: 0.05,
    default: 0.3,
    unit: '%',
  },
  {
    key: 'barSlideDuration',
    type: 'number',
    label: 'Glissement de la barre du flux',
    hint: 'Pendant une transition entre pages, la barre remonte hors de la vue au départ et redescend à l’arrivée.',
    min: 0,
    max: 1000,
    step: 10,
    default: 200,
    unit: 'ms',
    zero: 'sans',
  },
  ...edgeBadgeSettings({
    groupHint: 'Rang d’une flèche dans son flux.',
    labelFaceCamera: 'Texte des flèches en séquence face à la caméra',
  }),
  {
    key: 'edgeDarken',
    type: 'number',
    group: 'Flèches et couleurs',
    label: 'Assombrissement du trait',
    hint: 'Une flèche colorée par son flux prend cette couleur assombrie. Les couleurs des nouveaux flux sont les fonds des styles de forme, à partir du troisième.',
    min: 0,
    max: 0.9,
    step: 0.05,
    default: 0.25,
    unit: '%',
  },
];

/** Apparence du flux courant d'après les réglages du mode. */
export function currentLook(values: PluginValues): ModeCurrentLook {
  return { dimOpacity: numberValue(values, 'dimOpacity'), barSlideDuration: numberValue(values, 'barSlideDuration') };
}
