import type { EdgeEndsSnapshot, EndAttachment, Side, TerminalEnd } from '../../../edit/edgeEnds';
import type { PointHandle, PointsContext } from '../../../edit/edgePointEdits';
import type { MoveSet } from '../../../edit/moveSet';
import type { EdgeSnapping } from '../../../edit/edgeSnap';
import type { MovePlan, ResizeBounds } from '../../../edit/movePlan';
import type { ResizeHandle } from '../../../edit/handleKinds';
import type { EdgeLabelPlacement, Point, Rect } from '../../../model/types';

/** Glisser d'édition en cours (SPEC §14.1). */
export interface MoveDrag extends MovePlan {
  kind: 'move';
  pageId: string;
  /**
   * Même déplacement sans les formes emportées par le mode (Ctrl maintenu, sujet 351), échangé avec le plan courant
   * quand Ctrl change ; absent si rien n'est emporté ou si des flèches sont sélectionnées.
   */
  other?: MovePlan;
  /** Le plan courant est-il celui sans les formes emportées ? */
  detached: boolean;
  start: Point;
  origin: Rect;
  applied: Point;
  grid: number;
  started: boolean;
  /** Flèches réparties en aperçu pendant le glisser (ancrage automatique ou Typon) : modèle à relire si rien n'est écrit. */
  arranged?: boolean;
  /** Aimantation bord à bord du mode (sujet 477) ; absente : aucune (ni pour un pas au clavier). */
  snapping?: EdgeSnapping;
  /** Places du mode proposées pendant le glisser (sujet 481) : forme seule, sans rien d'emporté. */
  places: boolean;
  /** Forme dont la forme glissée prendra la place, lâchée maintenant (échange, sujet 481). */
  swapWith?: string;
}

export interface ResizeDrag {
  kind: 'resize';
  pageId: string;
  shapeId: string;
  handle: ResizeHandle;
  start: Point;
  origin: Rect;
  grid: number;
  /** La forme, son contenu (déplacé si le coin haut-gauche bouge) et ses arêtes reliées. */
  children: MoveSet;
  /** Bornes du mode de la page (sujet 241) : obstacles, et ce que la forme dessine au-dessus de ses bornes. */
  bounded?: ResizeBounds;
  /** Aimantation bord à bord du mode (sujet 477). */
  snapping?: EdgeSnapping;
  started: boolean;
}

export interface ConnectDrag {
  kind: 'connect';
  pageId: string;
  sourceId: string;
  /** Côté de la forme d'où part la flèche (poignée tirée). */
  side: Side;
  /** Point de départ retenu : point libre de ce côté le plus proche de la cible visée. */
  exit?: Point;
  /** Coudes d'une boucle sur la forme de départ, écrits en points intermédiaires. */
  loop?: Point[];
  /** Forme visée, en attache auto ou sur un point de connexion (entrée fixe). */
  target?: Exclude<EndAttachment, { kind: 'free' }>;
  /** Partie de la forme visée sous le pointeur (sujet 333) ; undefined = la forme elle-même. */
  part?: string;
  started: boolean;
}

/** Bout d'une flèche déplacé par sa poignée : attaché à une forme (auto ou point fixe) ou libre. */
export interface EdgeEndDrag {
  kind: 'edgeEnd';
  pageId: string;
  edgeId: string;
  end: TerminalEnd;
  /** Extrémités d'origine, remises en place si le bout revient où il était. */
  original: EdgeEndsSnapshot;
  /** Point d'ancrage occupé par ce bout au début du glisser (reste pris pendant le glisser). */
  origin?: { shapeId: string; constraint: Point };
  /** Points intermédiaires d'origine (remplacés par les coudes si le bout referme une boucle). */
  originalPoints: Point[];
  attachment?: EndAttachment;
  /** Partie de la forme visée sous le pointeur, bout d'arrivée seulement (sujet 333). */
  part?: string;
  started: boolean;
}

/** Poignée entre les bouts d'une flèche (segment, coude, point) : points intermédiaires réécrits. */
export interface EdgePointsDrag {
  kind: 'edgePoints';
  pageId: string;
  edgeId: string;
  handle: PointHandle;
  /** État de la flèche au début du glisser : les points se calculent toujours à partir de lui. */
  context: PointsContext;
  original: Point[];
  points?: Point[];
  started: boolean;
}

/** Texte d'une flèche déplacé par sa poignée (le long du tracé et de côté). */
export interface LabelDrag {
  kind: 'label';
  pageId: string;
  edgeId: string;
  /** Cellule du texte : l'arête (son label) ou un label enfant (début, fin…). */
  cellId: string;
  /** Décalage libre du label, gardé ; position et distance suivent le pointeur. */
  offset: Point;
  placement?: EdgeLabelPlacement;
  started: boolean;
}

/** Partie sélectionnée d'une forme glissée à une autre place (sujet 252, ex. champ d'une table RDD). */
export interface PartDrag {
  kind: 'part';
  pageId: string;
  shapeId: string;
  part: string;
  /** Place visée (`ModeParts.dropAt`) ; absente : hors de toute place, le lâcher ne fait rien. */
  target?: string;
  started: boolean;
}

/** Glisser d'édition en cours (déplacement, redimensionnement, connecteur, bout ou points d'une flèche, texte, partie). */
export type Drag = MoveDrag | ResizeDrag | ConnectDrag | EdgeEndDrag | EdgePointsDrag | LabelDrag | PartDrag;
