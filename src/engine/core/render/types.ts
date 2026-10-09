import type { Color, Object3D } from 'three';
import type { RichLine } from '../model/types';
import type { DeepReadonly } from '../model/readonly';
import type { PluginValues } from '../settings/pluginSettings';
import type { JumpDefaults } from './edges/jumps';
import type { MeasureText } from './richLayout';
import type { EdgeSplitSettings } from './edges/split';
import type { TextAlong } from './textPath';
import type { LabelBackdropSettings } from './styleColors';

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
  rich?: DeepReadonly<RichLine[]>;
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
  /**
   * Texte posé lettre par lettre le long d'un tracé (texte du milieu qui suit sa flèche) : `x` / `y` ne
   * servent plus qu'à repérer le point d'ancrage. Fond, souligné et barré ne sont pas dessinés.
   */
  along?: TextAlong;
}

/**
 * Fabrique de textes, injectée par le moteur (troika en production, bouchon en test).
 * L'objet renvoyé est en espace page, lisible en vue de dessus.
 */
export interface TextFactory {
  create(spec: TextSpec): Object3D;
}

/**
 * Mesure du texte du moteur (sujet 377), remise aux formes (rendu et points d'entrée géométriques) et aux modes : celle
 * des polices du texte SDF une fois chargées, une approximation avant (et sans DOM). Le moteur reconstruit ses scènes
 * quand elle devient exacte.
 */
export interface MeasureContext {
  /** Largeur du texte en pixels de page. */
  readonly measureText: MeasureText;
}

export interface RenderContext extends MeasureContext {
  text: TextFactory;
  /**
   * Volume des formes en vue iso (niveau `iso`) : épaisseur par défaut, en pixels de page, et
   * luminosité des côtés (fraction de la couleur de fond) face éclairée / face à l'ombre.
   */
  volume?: { depth: number; shadeLight?: number; shadeDark?: number };
  /** Couleurs du placeholder des formes non supportées (#rrggbb). */
  placeholder?: { fill: string; stroke: string };
  /** Couleur d'accent, #rrggbb. */
  accent?: string;
  /** Couleur du texte des flèches sans `fontColor` (#rrggbb, noir par défaut). */
  edgeFontColor?: string;
  /** Saut par défaut des flèches de la page (celui de la page, sinon le paramètre) ; absent = aucun. */
  edgeJumps?: JumpDefaults;
  /** Scène en volume (iso, 3D) : les sauts Arc et Marche se lèvent hors du plan de la page (ticket 146). */
  raisedJumps?: boolean;
  /** Fond du texte des flèches sans fond explicite : halo (épaisseur et flou en pixels de page), uni, ou aucun. */
  edgeLabelBackdrop?: LabelBackdropSettings;
  /** Couleur du fond de la vue : fond des labels `labelBackgroundColor=default` (blanc par défaut). */
  background?: string;
  /** Flèches coupées (`split=1`, ticket 219) : longueur des tronçons, fondu, marge du cadre de renvoi. */
  edgeSplit?: EdgeSplitSettings;
  /**
   * Réglages des catégories de formes (sujet 380), bornés, par id de catégorie : le registre en remet à chaque forme
   * ceux de sa catégorie (`values`).
   */
  categoryValues?: Readonly<Record<string, PluginValues>>;
  /**
   * Réglages de la catégorie de la forme dessinée (`palette.category`), posés par le registre des formes ; absents
   * pour une forme hors catégorie ou sans contexte complet (tests) : la forme garde alors son défaut.
   */
  values?: PluginValues;
}

/** Apparence de la pastille d'une flèche (réglages du mode qui la pose, `PageDressing.edgeBadgeStyle`), en pixels de page. */
export interface EdgeBadgeStyle {
  /** Flèche avec texte : pastille au-dessus du texte du milieu. */
  radius: number;
  textSize: number;
  /** Flèche sans texte : pastille au milieu de la flèche. */
  smallRadius: number;
  smallTextSize: number;
  /** #rrggbb */
  borderColor: string;
  borderWidth: number;
  /** #rrggbb */
  textColor: string;
  bold: boolean;
  /** Écart entre la pastille et le texte du milieu. */
  gap: number;
  /** Pastille face à la caméra (sinon à plat dans le plan de la page). */
  faceCamera: boolean;
  /** Texte de la flèche qui porte la pastille face à la caméra (sinon à plat). */
  labelFaceCamera: boolean;
}
