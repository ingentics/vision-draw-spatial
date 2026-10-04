/**
 * Position du texte d'une forme (panneau « Forme », section Texte), comme le menu « Position » de draw.io :
 * neuf places, au milieu (dans la forme) ou autour. Hors de la forme, le texte est aligné du côté qui touche
 * la forme (`labelPosition=left` → `align=right`, `verticalLabelPosition=bottom` → `verticalAlign=top`).
 */
export type Horizontal = 'left' | 'center' | 'right';
export type Vertical = 'top' | 'middle' | 'bottom';

export interface LabelPlace {
  horizontal: Horizontal;
  vertical: Vertical;
}

/** Les neuf places, ligne par ligne (de haut en bas, de gauche à droite). */
export const LABEL_PLACES: LabelPlace[] = (['top', 'middle', 'bottom'] as const).flatMap((vertical) =>
  (['left', 'center', 'right'] as const).map((horizontal) => ({ horizontal, vertical })),
);

/** Place actuelle du texte d'après le style (valeurs inconnues : au milieu). */
export function labelPlaceOf(style: Record<string, string>): LabelPlace {
  const { labelPosition: h, verticalLabelPosition: v } = style;
  return {
    horizontal: h === 'left' || h === 'right' ? h : 'center',
    vertical: v === 'top' || v === 'bottom' ? v : 'middle',
  };
}

const OPPOSITE = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' } as const;

/**
 * Clés de style d'une place, au format de draw.io ; les valeurs par défaut (center, middle) sont retirées.
 * Au milieu : texte centré dans la forme.
 */
export function labelPlacePatch({ horizontal, vertical }: LabelPlace): Record<string, string | undefined> {
  return {
    labelPosition: horizontal === 'center' ? undefined : horizontal,
    align: horizontal === 'center' ? undefined : OPPOSITE[horizontal],
    verticalLabelPosition: vertical === 'middle' ? undefined : vertical,
    verticalAlign: vertical === 'middle' ? undefined : OPPOSITE[vertical],
  };
}

/** Nom d'une place, pour l'infobulle et l'accessibilité. */
export function labelPlaceName({ horizontal, vertical }: LabelPlace): string {
  if (horizontal === 'center' && vertical === 'middle') return 'Au milieu';
  const v = { top: 'en haut', middle: '', bottom: 'en bas' }[vertical];
  const h = { left: 'à gauche', center: '', right: 'à droite' }[horizontal];
  if (!h) return vertical === 'top' ? 'Dessus' : 'Dessous';
  if (!v) return h === 'à gauche' ? 'À gauche' : 'À droite';
  return `${v[0]!.toUpperCase()}${v.slice(1)} ${h}`;
}
