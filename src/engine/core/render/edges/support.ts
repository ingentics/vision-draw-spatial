import { isKnownMarker } from './markers';
import { routingKind } from './route';

export type EdgeUnsupportedCategory = 'edgeStyle' | 'startArrow' | 'endArrow';

/**
 * Styles d'une arête que le rendu ne sait qu'approcher (SPEC §8.4) : style de routage
 * inconnu (dessiné en orthogonal), pointe inconnue (dessinée en classic).
 */
export function edgeUnsupported(
  style: Record<string, string>,
): Array<{ category: EdgeUnsupportedCategory; name: string }> {
  const result: Array<{ category: EdgeUnsupportedCategory; name: string }> = [];
  if (!routingKind(style).supported) result.push({ category: 'edgeStyle', name: style.edgeStyle ?? '' });
  for (const category of ['startArrow', 'endArrow'] as const) {
    const type = style[category];
    if (type && type !== 'none' && !isKnownMarker(type)) result.push({ category, name: type });
  }
  return result;
}
