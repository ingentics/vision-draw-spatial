import { setCellStyleValue } from '../format/cellEdits';
import { MONOSPACE_FAMILY } from '../format/richText';
import type { PageTree } from '../format/xmlTree';
import { hexToHsl, hslToHex } from '../render/styleColors';

/**
 * Styles de forme (panneau « Forme », section Style) : fond, contour et éventuellement couleur du
 * texte, comme la palette Style de draw.io. Appliquer un style n'écrit que ces clés (SPEC §14.2).
 */
export interface StylePreset {
  name: string;
  fillColor: string;
  strokeColor: string;
  fontColor?: string;
}

/** Styles de base de draw.io (palette Style), valeurs exactes. */
export const DRAWIO_STYLES: StylePreset[] = [
  { name: 'Par défaut', fillColor: '#ffffff', strokeColor: '#000000' },
  { name: 'Gris', fillColor: '#f5f5f5', strokeColor: '#666666', fontColor: '#333333' },
  { name: 'Bleu', fillColor: '#dae8fc', strokeColor: '#6c8ebf' },
  { name: 'Vert', fillColor: '#d5e8d4', strokeColor: '#82b366' },
  { name: 'Orange', fillColor: '#ffe6cc', strokeColor: '#d79b00' },
  { name: 'Jaune', fillColor: '#fff2cc', strokeColor: '#d6b656' },
  { name: 'Rouge', fillColor: '#f8cecc', strokeColor: '#b85450' },
  { name: 'Violet', fillColor: '#e1d5e7', strokeColor: '#9673a6' },
];

/** Style de base de draw.io par son nom (palette Style) ; un nom inconnu lève une exception. */
export function drawioStyle(name: string): StylePreset {
  const style = DRAWIO_STYLES.find((candidate) => candidate.name === name);
  if (!style) throw new Error(`style draw.io inconnu : « ${name} »`);
  return style;
}

/** Palette étendue : fonds pastel, contour dérivé (même teinte, plus soutenue). */
export const PASTEL_STYLES: StylePreset[] = (
  [
    ['Menthe', '#dcefea'],
    ['Jaune pâle', '#ffffe5'],
    ['Lavande', '#e8e5f0'],
    ['Rose saumon', '#fdd8d6'],
    ['Bleu pastel', '#d8e4f0'],
    ['Pêche', '#ffe4d3'],
    ['Vert tendre', '#e4f1d3'],
    ['Rose', '#fdebf2'],
    ['Gris clair', '#f2f2f2'],
    ['Mauve', '#e8d7e8'],
    ['Vert pâle', '#edf5e8'],
    ['Crème', '#fef7d7'],
  ] as const
).map(([name, fillColor]) => ({ name, fillColor, strokeColor: deriveStroke(fillColor) }));

/** Couleurs implicites d'une forme sans `fillColor` / `strokeColor` (draw.io : blanc, noir). */
const IMPLICIT = { fillColor: '#ffffff', strokeColor: '#000000' };

/**
 * Contour d'un fond pastel : même teinte, saturation modérée, plus sombre (comme les paires de
 * draw.io, ex. #dae8fc → #6c8ebf) ; un gris donne un gris moyen.
 */
export function deriveStroke(fill: string): string {
  const [h, s] = hexToHsl(fill);
  return s < 0.05 ? hslToHex(0, 0, 0.45) : hslToHex(h, Math.min(s, 0.45), 0.55);
}

/**
 * Clés de style à écrire pour appliquer un style à une forme (undefined = clé retirée) ; seules
 * les clés qui changent. `fontColor` : celle du style s'il en a une ; sinon une couleur de texte
 * posée par un autre style de la palette (`known`) est retirée, une couleur choisie à la main reste.
 * `labelBorderColor` : un cadre du nom de la couleur de la bordure suit la nouvelle bordure (sujet 347, ex. régions
 * RDD) ; un cadre d'une autre couleur reste.
 */
export function stylePresetChanges(
  style: Record<string, string>,
  preset: StylePreset,
  known: StylePreset[],
): Record<string, string | undefined> {
  const wanted: Record<string, string | undefined> = {
    fillColor: preset.fillColor,
    strokeColor: preset.strokeColor,
  };
  const font = normalize(style.fontColor);
  const frame = normalize(style.labelBorderColor);
  if (frame && frame === (normalize(style.strokeColor) ?? IMPLICIT.strokeColor))
    wanted.labelBorderColor = preset.strokeColor;
  if (preset.fontColor) wanted.fontColor = preset.fontColor;
  else if (font && known.some((p) => p.fontColor && normalize(p.fontColor) === font)) wanted.fontColor = undefined;
  const changes: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(wanted)) {
    if (normalize(style[key]) !== normalize(value)) changes[key] = value;
  }
  return changes;
}

/** Applique un style à une cellule de l'arbre XML ; vrai si quelque chose a changé. */
export function applyStylePreset(
  page: PageTree,
  cellId: string,
  style: Record<string, string>,
  preset: StylePreset,
  known: StylePreset[],
): boolean {
  const changes = Object.entries(stylePresetChanges(style, preset, known));
  for (const [key, value] of changes) setCellStyleValue(page, cellId, key, value);
  return changes.length > 0;
}

/** Le style de la forme correspond-il à ce style (fond et contour, couleurs implicites comprises) ? */
export function matchesPreset(style: Record<string, string>, preset: StylePreset): boolean {
  const color = (key: 'fillColor' | 'strokeColor') => normalize(style[key]) ?? IMPLICIT[key];
  return color('fillColor') === normalize(preset.fillColor) && color('strokeColor') === normalize(preset.strokeColor);
}

/** Couleur comparable : minuscules, `default` ou absente = undefined. */
function normalize(value: string | undefined): string | undefined {
  const v = value?.trim().toLowerCase();
  return !v || v === 'default' ? undefined : v;
}

/**
 * Style de texte (panneau « Texte ») : taille, couleur et police, appliqués à la sélection dans le
 * texte, ou à tout le texte (clés `fontSize`, `fontColor`, `fontFamily` du style draw.io).
 */
export interface TextPreset {
  name: string;
  /** Taille en pixels de page (draw.io). */
  fontSize: number;
  /** #rrggbb ; absente = couleur par défaut (noir). */
  fontColor?: string;
  /** Police draw.io ; absente = police par défaut. */
  fontFamily?: string;
}

export const TEXT_STYLES: TextPreset[] = [
  { name: 'Classique', fontSize: 12 },
  { name: 'Feutré', fontSize: 9, fontColor: '#808080' },
  { name: 'Code', fontSize: 11, fontFamily: MONOSPACE_FAMILY },
];

/** Le format (style de la cellule, ou mise en forme de la sélection) correspond-il à ce style de texte ? */
export function matchesTextPreset(
  format: { fontSize?: number; fontColor?: string; fontFamily?: string },
  preset: TextPreset,
): boolean {
  const color = (value: string | undefined) => normalize(value) ?? '#000000';
  return (
    format.fontSize === preset.fontSize &&
    color(format.fontColor) === color(preset.fontColor) &&
    (format.fontFamily ?? '').toLowerCase() === (preset.fontFamily ?? '').toLowerCase()
  );
}
