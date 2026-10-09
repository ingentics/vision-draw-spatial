import { Color, SRGBColorSpace } from 'three';
import { isHexColor, styleNumber, styleOpacity } from '../model/styleValues';
import { dashPattern } from './geometry/stroke';
import type { ShapeSettings } from '../settings/types';

/** Trait d'un style draw.io : couleur, opacité, épaisseur et pointillés (sujet 307). */
export interface StyleStroke {
  color: Color;
  opacity: number;
  width: number;
  /** Motif des pointillés (`dashed`, `dashPattern`, `fixDash`) ; undefined pour un trait plein. */
  dash: number[] | undefined;
}

/**
 * Trait d'un style (`strokeColor`, `fallback` si absente ou `default` ; `strokeOpacity`, `strokeWidth`, pointillés) ;
 * undefined sans trait (`none`, ou épaisseur nulle). Lecture commune des formes, du tronc comme des plugins.
 */
export function styleStroke(style: Record<string, string>, fallback: string | null): StyleStroke | undefined {
  const color = styleColor(style, 'strokeColor', fallback);
  const width = styleNumber(style, 'strokeWidth', 1);
  if (!color || width <= 0) return undefined;
  return { color, opacity: styleOpacity(style, 'strokeOpacity'), width, dash: dashPattern(style, width) };
}

/** Couleurs lues dans le style du modèle neutre, défauts de draw.io (nombres, booléens : `model/styleValues.ts`). */

/** Couleur d'accent par défaut (paramètre `selection.accentColor`) : sélection, poignées, vue de la mini-carte. */
export const DEFAULT_ACCENT = '#1a73e8';

/**
 * Valeur brute d'une couleur du style : `null` si elle vaut `none` (rien à dessiner), `fallback` si elle est absente ou
 * vaut `default`. Règle commune à `styleColor` et aux lecteurs qui gardent la chaîne (mini-carte, canvas).
 */
export function styleColorValue(style: Record<string, string>, key: string, fallback: string | null): string | null {
  const raw = style[key]?.trim();
  if (raw === 'none') return null;
  return !raw || raw === 'default' ? fallback : raw;
}

/** Couleur, ou `null` si le style vaut `none` (rien à dessiner). */
export function styleColor(style: Record<string, string>, key: string, fallback: string | null): Color | null {
  const value = styleColorValue(style, key, fallback);
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
export const DEFAULT_LABEL_BACKDROP: LabelBackdropSettings = { kind: 'halo', haloWidth: 1.5, haloBlur: 1 };

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

/** Fond d'un texte de flèche sans fond explicite (paramètres `shapes.edgeLabel…`) : halo, fond uni, ou rien. */
export interface LabelBackdropSettings {
  kind: 'halo' | 'solid' | 'none';
  /** Épaisseur et flou du halo, en pixels de page. */
  haloWidth: number;
  haloBlur: number;
}

/** Réglages du fond des textes de flèche, lus des paramètres `shapes.edgeLabel…` (scène et éditeur en place). */
export function labelBackdropSettings(
  shapes: Pick<ShapeSettings, 'edgeLabelBackdrop' | 'edgeLabelHaloWidth' | 'edgeLabelHaloBlur'>,
): LabelBackdropSettings {
  return { kind: shapes.edgeLabelBackdrop, haloWidth: shapes.edgeLabelHaloWidth, haloBlur: shapes.edgeLabelHaloBlur };
}

/** Fond d'un label (#rrggbb ou #rgb, en minuscules) : fond uni, ou halo autour de chaque lettre. */
export interface LabelBackdrop {
  background?: string;
  halo?: { color: string; width: number; blur: number };
}

/**
 * Fond d'un label, commun au texte dessiné et à l'éditeur en place : un `labelBackgroundColor` hexadécimal est
 * pris tel quel ; sinon une flèche a le fond des réglages (halo de la couleur de la page par défaut, lisible sur le
 * trait), une forme le fond de la page si la clé vaut `default`, et rien d'autre (les noms de couleur ne sont pas
 * repris ici : le label d'une forme dessiné lit son fond par `labelBackground`).
 */
export function labelBackdropOf(
  style: Record<string, string>,
  onEdge: boolean,
  settings: LabelBackdropSettings = DEFAULT_LABEL_BACKDROP,
  page = PAGE_BACKGROUND,
): LabelBackdrop {
  const value = style.labelBackgroundColor?.trim().toLowerCase();
  if (isHexColor(value, true)) return { background: value };
  if (!onEdge) return value === 'default' ? { background: page } : {};
  if (settings.kind === 'solid') return { background: page };
  return settings.kind === 'halo' ? { halo: { color: page, width: settings.haloWidth, blur: settings.haloBlur } } : {};
}

/**
 * Teinte (degrés), saturation et luminosité (0–1) d'un #rrggbb, calcul HSL pur sur les octets : contours dérivés des
 * styles pastel (`deriveStroke`), dont les valeurs écrites dans le fichier ne doivent pas bouger. `darken` passe par
 * le HSL de Three.js (flottants) : les deux arrondis diffèrent d'une unité sur quelques couleurs, d'où deux calculs.
 */
export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

/** #rrggbb d'une teinte (degrés), saturation et luminosité (0–1), l'inverse de `hexToHsl`. */
export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return `#${[r, g, b]
    .map((v) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/**
 * Couleur assombrie (luminosité × (1 − `amount`), en HSL sRGB) : trait d'une flèche colorée par un mode. Garde la
 * teinte perçue ; pour un retrait de gravure comme draw.io, voir `shade` (RVB).
 */
export function darken(color: string, amount: number): string {
  const hsl = { h: 0, s: 0, l: 0 };
  new Color(color).getHSL(hsl, SRGBColorSpace);
  return `#${new Color().setHSL(hsl.h, hsl.s, hsl.l * (1 - amount), SRGBColorSpace).getHexString()}`;
}

/**
 * Couleur éclaircie : chaque composante RVB sRGB rapprochée du blanc de `amount` (0 : inchangée, 1 : blanc). Fond d'une
 * région du mode RDD, plus clair que la couleur de son style (sujet 345).
 */
export function lighten(color: string | Color, amount: number): string {
  const rgb = { r: 0, g: 0, b: 0 };
  new Color(color).getRGB(rgb, SRGBColorSpace);
  const mix = (value: number) => value + (1 - value) * amount;
  return `#${new Color().setRGB(mix(rgb.r), mix(rgb.g), mix(rgb.b), SRGBColorSpace).getHexString()}`;
}

/**
 * Couleur × `factor` en RVB (#rrggbb), `color` en #rrggbb ou en `Color` : retrait des gravures et des socles, comme
 * draw.io. Diffère de `darken` (HSL), d'où deux noms.
 */
export function shade(color: string | Color, factor: number): string {
  return `#${new Color(color).multiplyScalar(factor).getHexString()}`;
}

/**
 * Texte lisible sur un fond (#rrggbb ou couleur) posé à `opacity` sur la page blanche : noir sur une couleur claire,
 * blanc sinon (luminance relative, WCAG).
 */
export function readableOn(background: string | Color, opacity = 1): string {
  const rgb = { r: 0, g: 0, b: 0 };
  new Color(background).getRGB(rgb, SRGBColorSpace);
  // Fond posé à `opacity` sur la page blanche (sujet 307 : ex. onglet d'une région RDD), arrondi à l'octet ; la
  // composante est d'abord ramenée à l'octet du #rrggbb, pour que l'arrondi du mélange ne dépende pas des flottants.
  const channel = (value: number) => {
    const byte = Math.round(255 * (1 - opacity) + Math.round(value * 255) * opacity);
    const c = byte / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  // Contraste égal avec le blanc et le noir pour une luminance d'environ 0,18.
  return luminance > 0.18 ? '#000000' : '#ffffff';
}
