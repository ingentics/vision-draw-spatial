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

/**
 * Marges du label d'une forme dans sa zone de texte, comme draw.io : `spacing` (2) sur chaque côté, plus
 * `spacingTop` / `spacingRight` / `spacingBottom` / `spacingLeft`, plus `BASE_SPACING` en haut ou en bas selon
 * `verticalAlign`. Partagées par le label dessiné et l'éditeur en place : le texte ne bouge pas entre les deux.
 */
export function labelInsets(style: Record<string, string>): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const spacing = styleNumber(style, 'spacing', 2);
  return {
    top: spacing + styleNumber(style, 'spacingTop', 0) + (style.verticalAlign === 'top' ? BASE_SPACING.top : 0),
    right: spacing + styleNumber(style, 'spacingRight', 0),
    bottom:
      spacing + styleNumber(style, 'spacingBottom', 0) + (style.verticalAlign === 'bottom' ? BASE_SPACING.bottom : 0),
    left: spacing + styleNumber(style, 'spacingLeft', 0),
  };
}
