/**
 * Modèle neutre (SPEC §7.3).
 *
 * Aucune notion propre à draw.io n'apparaît ici, hormis les champs `raw` (debug, placeholders).
 * Toutes les coordonnées sont absolues, dans le repère de la page (1 px draw.io = 1 unité).
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LinkModel = { type: 'page'; pageId: string } | { type: 'url'; href: string };

export interface DocumentModel {
  pages: PageModel[];
  /** Problèmes non bloquants rencontrés pendant le parsing (page illisible, lien cassé…). */
  warnings: ParseWarning[];
}

export interface ParseWarning {
  pageId?: string;
  cellId?: string;
  message: string;
}

export interface LayerModel {
  id: string;
  name: string;
  visible: boolean;
}

export interface PageModel {
  id: string;
  name: string;
  layers: LayerModel[];
  shapes: ShapeModel[];
  edges: EdgeModel[];
  /** Emprise de toutes les formes et arêtes ; rectangle nul si la page est vide. */
  bounds: Rect;
}

/**
 * Mise en forme d'une partie d'un label HTML (`<b>`, `<span style="font-size: …">`…) ; absente = celle
 * du style de l'élément. `false` annule explicitement (ex. partie non grasse d'un label en gras).
 */
export interface TextMarks {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** Taille en pixels de page. */
  fontSize?: number;
  /** #rrggbb */
  color?: string;
  fontFamily?: string;
}

export interface TextRun extends TextMarks {
  text: string;
}

/** Une ligne de texte riche : segments de même mise en forme. */
export type RichLine = TextRun[];

interface ElementBase {
  id: string;
  /** Texte brut du label (HTML éventuel déjà converti en texte). */
  label: string;
  /** Texte riche, seulement si le label HTML a une mise en forme partielle (sinon `label` + style). */
  rich?: RichLine[];
  style: Record<string, string>;
  link?: LinkModel;
  /** Forme parente (groupe / conteneur), absente si l'élément est directement sur un calque. */
  parentId?: string;
  layerId: string;
  /** Visibilité propre de l'élément (ne tient pas compte de la visibilité du calque). */
  visible: boolean;
  /** Ordre de dessin dans la page, commun aux formes et aux arêtes (croissant = au-dessus). */
  z: number;
  /** Attributs personnalisés (portés par `<object>` / `<UserObject>`). */
  attributes: Record<string, string>;
  raw: { styleString: string };
}

export interface ShapeModel extends ElementBase {
  /**
   * Nom canonique de la forme : 'rectangle', 'ellipse', 'text', 'group', 'swimlane',
   * ou le nom de forme draw.io tel quel (ex. 'cylinder3', 'mxgraph.aws4.lambda').
   * C'est le registre de renderers qui décide si ce nom est supporté (sinon placeholder).
   */
  kind: string;
  bounds: Rect;
}

export interface EdgeLabelPlacement {
  /** Position le long de l'arête : -1 = source, 0 = milieu, 1 = cible. */
  position: number;
  /** Distance perpendiculaire à l'arête, en pixels. */
  distance: number;
  /** Décalage libre en pixels, appliqué après le placement sur l'arête. */
  offset: Point;
}

export interface EdgeLabelModel {
  id: string;
  label: string;
  rich?: RichLine[];
  placement: EdgeLabelPlacement;
  style: Record<string, string>;
}

export interface EdgeModel extends ElementBase {
  sourceId?: string;
  targetId?: string;
  /** Extrémités libres (utilisées quand la source / cible n'est pas une forme). */
  sourcePoint?: Point;
  targetPoint?: Point;
  /** Points intermédiaires, en coordonnées absolues. */
  points: Point[];
  /** Placement du label principal (`label`). */
  labelPlacement: EdgeLabelPlacement;
  /** Labels secondaires portés par des cellules enfants de l'arête. */
  labels: EdgeLabelModel[];
}
