import type { ModeCurrentLook, PluginSetting, PluginValues } from '../../../core/plugins';
import { edgeBadgeSettings, numberValue } from '../../../core/plugins';

/** Réglages globaux du mode Story telling (Paramètres › Modes › Histoires), repris de Séquences (sujet 474). */
export const STORY_SETTINGS: PluginSetting[] = [
  {
    key: 'dimOpacity',
    type: 'number',
    group: 'Histoire courante',
    label: 'Opacité hors de l’histoire courante',
    hint: 'Flèches hors de l’histoire courante et formes qu’aucune de ses flèches ne relie.',
    min: 0.05,
    max: 1,
    step: 0.05,
    default: 0.3,
    unit: '%',
  },
  ...edgeBadgeSettings({
    groupHint: 'Numéro de l’histoire, sur la flèche qui l’ouvre.',
    labelFaceCamera: 'Texte des flèches numérotées face à la caméra',
  }),
  {
    key: 'edgeWidth',
    type: 'number',
    group: 'Flèches et couleurs',
    label: 'Épaisseur des flèches',
    hint: 'Épaisseur minimale du trait de toutes les flèches de la page, à l’écran seulement (le fichier garde la sienne).',
    min: 1,
    max: 8,
    step: 0.5,
    default: 3,
    unit: 'px',
  },
  {
    key: 'edgeGap',
    type: 'number',
    label: 'Écart des flèches aux formes',
    hint: 'Les flèches s’arrêtent à cette distance des formes qu’elles relient, à l’écran seulement.',
    min: 0,
    max: 40,
    step: 1,
    default: 10,
    unit: 'px',
    zero: 'aucun',
  },
  {
    key: 'edgeDarken',
    type: 'number',
    label: 'Assombrissement du trait',
    hint: 'Une flèche colorée par son histoire prend cette couleur assombrie. Les couleurs des nouvelles histoires sont les fonds des styles de forme.',
    min: 0,
    max: 0.9,
    step: 0.05,
    default: 0.25,
    unit: '%',
  },
];

/** Apparence de l’histoire courante d'après les réglages du mode. */
export function currentLook(values: PluginValues): ModeCurrentLook {
  return { dimOpacity: numberValue(values, 'dimOpacity') };
}
