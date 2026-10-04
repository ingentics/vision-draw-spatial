import type { Color, Object3D } from 'three';
import type { RichLine } from '../model/types';

/** Ordre de dessin des sous-parties d'un élément (ajouté à l'ordre de l'élément dans la page). */
export const PART_ORDER = { fill: 0, stroke: 1, label: 2 } as const;

/** Nombre de sous-parties réservées par élément dans l'ordre de dessin. */
export const PARTS_PER_ELEMENT = 4;

export interface TextSpec {
  text: string;
  /** Point d'ancrage en coordonnées page. */
  x: number;
  y: number;
  anchorX: 'left' | 'center' | 'right';
  /** `bottom-baseline` : la ligne de base du texte (alignement visuel des capitales, sans jambages). */
  anchorY: 'top' | 'middle' | 'bottom' | 'bottom-baseline';
  align: 'left' | 'center' | 'right';
  fontSize: number;
  color: Color;
  opacity: number;
  bold: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** Police draw.io (`fontFamily`) : une police à chasse fixe donne la police de code. */
  fontFamily?: string;
  /** Texte riche (mise en forme partielle) : remplace `text` pour le dessin. */
  rich?: RichLine[];
  /** Largeur de retour à la ligne ; absente = pas de retour automatique. */
  maxWidth?: number;
  /**
   * Mode « Ajuster » (`fitText=1`) : zone que le texte doit tenir (largeur et hauteur, marges déduites).
   * `fontSize` (et les tailles partielles, à proportion) y est réduite si besoin (`fitFontSize`).
   */
  fit?: { width: number; height: number };
  /**
   * Halo autour de chaque lettre (contour de la couleur donnée, derrière le glyphe) : texte lisible sur
   * un trait ou une forme sombre, sans fond. Épaisseur en pixels de page.
   */
  halo?: { color: Color; width: number; blur?: number };
  /** Fond du label (`labelBackgroundColor`), ajusté à la taille du texte. */
  background?: Color;
}

/**
 * Fabrique de textes, injectée par le moteur (troika en production, bouchon en test).
 * L'objet renvoyé est en espace page, lisible en vue de dessus.
 */
export interface TextFactory {
  create(spec: TextSpec): Object3D;
}

export interface RenderContext {
  text: TextFactory;
  /**
   * Volume des formes en vue iso (niveau `iso`) : épaisseur par défaut, en pixels de page, et
   * luminosité des côtés (fraction de la couleur de fond) face éclairée / face à l'ombre.
   */
  volume?: { depth: number; shadeLight?: number; shadeDark?: number; tags?: boolean };
  /** Couleurs du placeholder des formes non supportées (#rrggbb). */
  placeholder?: { fill: string; stroke: string };
  /** Couleur d'accent (pastilles de lien), #rrggbb. */
  accent?: string;
  /** Couleur du texte des flèches sans `fontColor` (#rrggbb, noir par défaut). */
  edgeFontColor?: string;
  /** Fond du texte des flèches sans fond explicite : halo (épaisseur et flou en pixels de page), uni, ou aucun. */
  edgeLabelBackdrop?: { kind: 'halo' | 'solid' | 'none'; haloWidth: number; haloBlur: number };
  /** Couleur du fond de la vue : fond des labels `labelBackgroundColor=default` (blanc par défaut). */
  background?: string;
}
