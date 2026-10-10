import type { MeasureText, Rect, ShapeModel } from '../../../../../core/plugins';
import { keys } from '../../keys';

/**
 * Mise en page d'un post-it typé (sujet 475) : le label du type en haut, à 8 du bord, puis le texte du ticket dans
 * la zone dessous. Sans label (réglage « Labels » de la page décoché), le texte prend toute la forme.
 */
export const STICKY = {
  size: 160,
  /** Label : 16, réduit jusqu'à 10 s'il ne tient pas en largeur, puis « … ». */
  labelSize: 16,
  labelMinSize: 10,
  labelTop: 8,
  /** Écart entre le label et la zone du texte. */
  labelGap: 4,
  /** Marges du texte (`spacing=8` du style) et du label. */
  margin: 8,
  /** Interligne du rendu (`LINE_HEIGHT` du texte) : hauteur de la ligne du label. */
  lineHeight: 1.2,
} as const;

/** Nom court de la clé posée sur chaque post-it quand la page masque les labels (`spatial.es.labels=0`). */
export const LABELS = 'labels';

/** Le post-it montre-t-il son label ? Faux quand sa page masque les labels (clé recopiée sur la forme). */
export const showsLabel = (shape: ShapeModel): boolean => keys.value(shape, LABELS) !== '0';

/** Ligne du label, sans les marges latérales. */
export function labelZone({ x, y, width }: Rect): Rect {
  const { margin, labelTop, labelSize, lineHeight } = STICKY;
  return { x: x + margin, y: y + labelTop, width: Math.max(width - 2 * margin, 0), height: labelSize * lineHeight };
}

/**
 * Zone du texte du ticket, marges `spacing` (8) comprises : sous le label (haut de la zone de texte à 4 du label),
 * sinon toute la forme. La zone suit la taille de 16 même quand le label est réduit : le texte ne bouge pas avec lui.
 */
export function stickyTextZone(shape: ShapeModel): Rect {
  const { bounds } = shape;
  if (!showsLabel(shape)) return bounds;
  const label = labelZone(bounds);
  const top = Math.min(label.y + label.height + STICKY.labelGap - STICKY.margin, bounds.y + bounds.height);
  return { x: bounds.x, y: top, width: bounds.width, height: bounds.y + bounds.height - top };
}

/** Taille du label : la plus grande de 16 à 10 qui tient dans `width` ; 10 sinon (le texte finit alors par « … »). */
export function labelFontSize(label: string, width: number, measure: MeasureText): number {
  for (let size = STICKY.labelSize; size > STICKY.labelMinSize; size--)
    if (measure(label, { size, bold: true, italic: false }) <= width) return size;
  return STICKY.labelMinSize;
}
