import type { EdgeBadgeStyle } from '../render/types';
import { booleanValue, numberValue, stringValue } from './pluginSettings';
import type { PluginSetting, PluginValues } from './pluginSettings';

/**
 * Réglages des pastilles numérotées des flèches d'un mode (sujets 474, 532 ; ex. rang d'une flèche dans son flux,
 * numéro d'une histoire) : un groupe « Pastilles » puis la pastille d'une flèche avec et sans texte. Seuls l'aide du
 * groupe et le libellé du texte face à la caméra changent d'un mode à l'autre.
 */
export function edgeBadgeSettings(texts: { groupHint: string; labelFaceCamera: string }): PluginSetting[] {
  return [
    {
      key: 'badgeFaceCamera',
      type: 'toggle',
      group: 'Pastilles',
      groupHint: texts.groupHint,
      label: 'Pastille face à la caméra',
      default: true,
    },
    {
      key: 'badgeLabelFaceCamera',
      type: 'toggle',
      label: texts.labelFaceCamera,
      default: true,
    },
    {
      key: 'badgeBorderColor',
      type: 'color',
      label: 'Couleur de la bordure',
      default: '#000000',
    },
    {
      key: 'badgeBorderWidth',
      type: 'number',
      label: 'Épaisseur de la bordure',
      min: 0,
      max: 6,
      step: 0.5,
      default: 1,
      unit: 'px',
      zero: 'aucune',
    },
    {
      key: 'badgeTextColor',
      type: 'color',
      label: 'Couleur du chiffre',
      default: '#000000',
    },
    { key: 'badgeBold', type: 'toggle', label: 'Chiffre en gras', default: false },
    {
      key: 'badgeRadius',
      type: 'number',
      group: 'Pastille d’une flèche avec texte',
      label: 'Rayon',
      min: 3,
      max: 40,
      step: 0.5,
      default: 12,
      unit: 'px',
    },
    {
      key: 'badgeTextSize',
      type: 'number',
      label: 'Taille du chiffre',
      min: 4,
      max: 60,
      step: 1,
      default: 15,
      unit: 'px',
    },
    {
      key: 'badgeGap',
      type: 'number',
      label: 'Écart avec le texte',
      min: 0,
      max: 30,
      step: 1,
      default: 2,
      unit: 'px',
    },
    {
      key: 'badgeSmallRadius',
      type: 'number',
      group: 'Pastille d’une flèche sans texte',
      label: 'Rayon',
      min: 2,
      max: 20,
      step: 0.5,
      default: 5.5,
      unit: 'px',
    },
    {
      key: 'badgeSmallTextSize',
      type: 'number',
      label: 'Taille du chiffre',
      min: 3,
      max: 30,
      step: 1,
      default: 7,
      unit: 'px',
    },
  ];
}

/** Apparence des pastilles d'après les réglages `edgeBadgeSettings` du mode. */
export function edgeBadgeStyle(values: PluginValues): EdgeBadgeStyle {
  return {
    radius: numberValue(values, 'badgeRadius'),
    textSize: numberValue(values, 'badgeTextSize'),
    smallRadius: numberValue(values, 'badgeSmallRadius'),
    smallTextSize: numberValue(values, 'badgeSmallTextSize'),
    borderColor: stringValue(values, 'badgeBorderColor'),
    borderWidth: numberValue(values, 'badgeBorderWidth'),
    textColor: stringValue(values, 'badgeTextColor'),
    bold: booleanValue(values, 'badgeBold'),
    gap: numberValue(values, 'badgeGap'),
    faceCamera: booleanValue(values, 'badgeFaceCamera'),
    labelFaceCamera: booleanValue(values, 'badgeLabelFaceCamera'),
  };
}
