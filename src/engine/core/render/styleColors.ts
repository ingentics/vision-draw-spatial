import { Color } from 'three';

/** Couleurs lues dans le style du modèle neutre, défauts de draw.io (nombres, booléens : `model/styleValues.ts`). */

/** Couleur, ou `null` si le style vaut `none` (rien à dessiner). */
export function styleColor(style: Record<string, string>, key: string, fallback: string | null): Color | null {
  const raw = style[key]?.trim();
  if (raw === 'none') return null;
  const value = !raw || raw === 'default' ? fallback : raw;
  if (!value) return null;
  const color = new Color();
  try {
    color.setStyle(value);
  } catch {
    return fallback ? new Color(fallback) : null;
  }
  return color;
}

/** Couleur de fond de la page, utilisée quand un style vaut `default` pour un fond de label. */
export const PAGE_BACKGROUND = '#ffffff';

/** Fond par défaut du texte des flèches : halo de 1,5 px, flou de 1 px (paramètres `shapes.edgeLabel…`). */
export const DEFAULT_LABEL_BACKDROP = { kind: 'halo', haloWidth: 1.5, haloBlur: 1 } as const;

/** `labelBackgroundColor` : `default` = fond de la page ; défaut propre au type d'élément sinon. */
export function labelBackground(
  style: Record<string, string>,
  fallback: string | null,
  page = PAGE_BACKGROUND,
): Color | undefined {
  const raw = style.labelBackgroundColor?.trim();
  if (raw === 'default') return new Color(page);
  return styleColor(style, 'labelBackgroundColor', fallback) ?? undefined;
}

/** Texte lisible sur un fond #rrggbb : noir sur une couleur claire, blanc sinon (luminance relative, WCAG). */
export function readableOn(background: string): string {
  const channel = (offset: number) => {
    const c = parseInt(background.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // Contraste égal avec le blanc et le noir pour une luminance d'environ 0,18.
  return luminance > 0.18 ? '#000000' : '#ffffff';
}
