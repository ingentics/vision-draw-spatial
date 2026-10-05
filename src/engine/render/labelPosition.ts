import type { Rect } from '../model/types';
import { styleNumber } from './styleValues';

/**
 * Label hors de la forme, comme draw.io (`mxGraphView.updateVertexLabelOffset`) :
 * `labelPosition=left|right` décale le cadre du label d'une largeur de forme à gauche ou à droite,
 * `verticalLabelPosition=top|bottom` d'une hauteur au-dessus ou en dessous. Le texte s'y place ensuite
 * selon `align` / `verticalAlign` (la palette de draw.io les pose à l'opposé : `labelPosition=left;align=right`,
 * `verticalLabelPosition=bottom;verticalAlign=top`, texte collé à la forme).
 */
export function outsideLabelBox(bounds: Rect, style: Record<string, string>): Rect | undefined {
  const dx = style.labelPosition === 'left' ? -1 : style.labelPosition === 'right' ? 1 : 0;
  const dy = style.verticalLabelPosition === 'top' ? -1 : style.verticalLabelPosition === 'bottom' ? 1 : 0;
  if (dx === 0 && dy === 0) return undefined;
  return { ...bounds, x: bounds.x + dx * bounds.width, y: bounds.y + dy * bounds.height };
}

/**
 * Marges propres à draw.io (`mxText.baseSpacingTop` / `baseSpacingBottom` de `Graph`), ajoutées à `spacing` :
 * 5 px au-dessus d'un texte aligné en haut, 1 px sous un texte aligné en bas (export SVG de draw.io).
 */
export const BASE_SPACING = { top: 5, bottom: 1 } as const;

/** Marges d'un label, côté par côté, en pixels de page. */
export interface LabelInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Marges propres au style (`spacingTop`, `spacingRight`, `spacingBottom`, `spacingLeft`) : elles réduisent la zone
 * de texte de la forme, et le cadre de l'éditeur en place avec elle (ex. la tranche d'un process étiqueté).
 */
export function labelMargins(style: Record<string, string>): LabelInsets {
  return {
    top: styleNumber(style, 'spacingTop', 0),
    right: styleNumber(style, 'spacingRight', 0),
    bottom: styleNumber(style, 'spacingBottom', 0),
    left: styleNumber(style, 'spacingLeft', 0),
  };
}

/**
 * Marges communes du label, dans la zone réduite par `labelMargins` : `spacing` (2) sur chaque côté, plus
 * `BASE_SPACING` en haut ou en bas selon `verticalAlign`. Ce sont les marges intérieures de l'éditeur en place.
 */
export function labelPadding(style: Record<string, string>): LabelInsets {
  const spacing = styleNumber(style, 'spacing', 2);
  return {
    top: spacing + (style.verticalAlign === 'top' ? BASE_SPACING.top : 0),
    right: spacing,
    bottom: spacing + (style.verticalAlign === 'bottom' ? BASE_SPACING.bottom : 0),
    left: spacing,
  };
}

/** Zone réduite de marges (largeur et hauteur au moins 0). */
export function insetRect(rect: Rect, insets: LabelInsets): Rect {
  return {
    x: rect.x + insets.left,
    y: rect.y + insets.top,
    width: Math.max(0, rect.width - insets.left - insets.right),
    height: Math.max(0, rect.height - insets.top - insets.bottom),
  };
}

/**
 * Toutes les marges du label dans la zone de texte de sa forme, comme draw.io : celles du style
 * (`labelMargins`) plus les communes (`labelPadding`). Le label dessiné les applique d'un coup ; l'éditeur en place
 * réduit son cadre des premières et garde les secondes à l'intérieur : le texte ne bouge pas entre les deux.
 */
export function labelInsets(style: Record<string, string>): LabelInsets {
  const margins = labelMargins(style);
  const padding = labelPadding(style);
  return {
    top: margins.top + padding.top,
    right: margins.right + padding.right,
    bottom: margins.bottom + padding.bottom,
    left: margins.left + padding.left,
  };
}
