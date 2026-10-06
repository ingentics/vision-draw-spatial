import type { EdgeEndsSnapshot, EndAttachment, TerminalEnd } from '../../../edit/edgeEnds';
import type { PointHandle, PointsContext } from '../../../edit/edgePoints';
import type { MoveSet } from '../../../edit/move';
import type { ConnectSide, ResizeHandle } from '../../../edit/handles';
import type { EdgeLabelPlacement, Point, Rect } from '../../../model/types';

/** Glisser d'édition en cours (SPEC §14.1). */
export interface MoveDrag {
  kind: 'move';
  pageId: string;
  /** Formes dont la géométrie XML est réécrite (plusieurs en sélection multiple). */
  rootIds: string[];
  set: MoveSet;
  /**
   * Flèches sélectionnées avec les formes (hors groupe déplacé) : elles bougent aussi, et un bout dont la
   * forme ne bouge pas est détaché, comme draw.io (`disconnectOnMove`) ; point libre au début du glisser.
   */
  edges: Array<{ id: string; detach: Array<{ end: TerminalEnd; point?: Point }> }>;
  start: Point;
  origin: Rect;
  applied: Point;
  grid: number;
  started: boolean;
  /** Flèches réparties en aperçu pendant le glisser (ancrage automatique ou Typon) : modèle à relire si rien n'est écrit. */
  arranged?: boolean;
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
  started: boolean;
}

export interface ConnectDrag {
  kind: 'connect';
  pageId: string;
  sourceId: string;
  /** Côté de la forme d'où part la flèche (poignée tirée). */
  side: ConnectSide;
  /** Point de départ retenu : point libre de ce côté le plus proche de la cible visée. */
  exit?: Point;
  /** Coudes d'une boucle sur la forme de départ, écrits en points intermédiaires. */
  loop?: Point[];
  /** Forme visée, en attache auto ou sur un point de connexion (entrée fixe). */
  target?: Exclude<EndAttachment, { kind: 'free' }>;
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

/** Glisser d'édition en cours (déplacement, redimensionnement, connecteur, bout ou points d'une flèche, texte). */
export type Drag = MoveDrag | ResizeDrag | ConnectDrag | EdgeEndDrag | EdgePointsDrag | LabelDrag;
