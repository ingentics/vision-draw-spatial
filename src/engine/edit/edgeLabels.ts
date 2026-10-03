import type { EdgeLabelModel, EdgeLabelPlacement, EdgeModel, Point } from '../model/types';

/**
 * Textes de début et de fin d'une flèche (SPEC §14.1) : labels enfants de l'arête, près de la source
 * ou de la cible. Un label dont la position (−1 = source, 1 = cible) dépasse ±0,5 compte comme texte
 * de début ou de fin ; le plus proche du bout l'emporte.
 */

export type EdgeEnd = 'start' | 'end';

/** Position des textes créés : 10 % de la longueur depuis le bout, hors de la pointe et de la forme. */
export const END_LABEL_POSITION = 0.8;
const END_THRESHOLD = 0.5;

export function endLabelOf(edge: EdgeModel, end: EdgeEnd): EdgeLabelModel | undefined {
  const sign = end === 'start' ? -1 : 1;
  return edge.labels
    .filter((label) => label.placement.position * sign >= END_THRESHOLD)
    .sort((a, b) => b.placement.position * sign - a.placement.position * sign)[0];
}

/** Bout de la flèche visé par une position le long du tracé (-1…1) ; undefined = vers le milieu. */
export function endAt(position: number): EdgeEnd | undefined {
  if (position <= -END_THRESHOLD) return 'start';
  if (position >= END_THRESHOLD) return 'end';
  return undefined;
}

export function endLabelPosition(end: EdgeEnd): number {
  return end === 'start' ? -END_LABEL_POSITION : END_LABEL_POSITION;
}

/** Un texte d'une flèche : son label (cellule de l'arête) ou un label enfant. */
export interface EdgeText {
  cellId: string;
  label: string;
  placement: EdgeLabelPlacement;
}

/** Textes non vides d'une flèche : son label, puis ses labels enfants (début, fin, autres). */
export function edgeTexts(edge: EdgeModel): EdgeText[] {
  const texts: EdgeText[] = [];
  if (edge.label.trim()) texts.push({ cellId: edge.id, label: edge.label, placement: edge.labelPlacement });
  for (const label of edge.labels) {
    if (label.label.trim()) texts.push({ cellId: label.id, label: label.label, placement: label.placement });
  }
  return texts;
}

/** Ancre d'un texte d'après sa position le long du tracé (mêmes seuils que les textes de début / fin). */
export function anchorOf(placement: EdgeLabelPlacement): 'start' | 'middle' | 'end' {
  return endAt(placement.position) ?? 'middle';
}

/** Placement d'un texte dans le modèle (pendant un glisser, avant l'écriture dans le fichier). */
export function setEdgeTextPlacement(edge: EdgeModel, cellId: string, placement: EdgeLabelPlacement): void {
  if (cellId === edge.id) edge.labelPlacement = placement;
  else {
    const label = edge.labels.find((l) => l.id === cellId);
    if (label) label.placement = placement;
  }
}

/** Écarts d'un texte de début / fin : le long de la flèche depuis la forme, et de côté depuis le trait. */
export const END_TEXT_GAP = { along: 6, across: 4 };

/** Placement et alignement d'un texte de flèche (configuration par défaut d'un début, d'un milieu ou d'une fin). */
export interface EdgeTextLayout {
  placement: EdgeLabelPlacement;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
}

/**
 * Configuration par défaut d'un texte de flèche, d'après son tracé. Milieu : centré sur le trait. Début
 * et fin : contre leur bout, juste après la forme, et le texte s'étend en s'éloignant de la forme (et du
 * trait, s'il a plusieurs lignes) :
 * - segment horizontal : le début au-dessus du trait, la fin en dessous ; aligné à gauche si la flèche
 *   part vers la droite depuis ce bout, à droite sinon ;
 * - segment vertical : le début à droite du trait, la fin à gauche ; le texte part vers le bas si la
 *   flèche descend depuis ce bout, vers le haut sinon.
 * Placement écrit comme draw.io : au bout (x = ±1) avec un décalage `offset`.
 */
export function edgeTextLayout(route: Point[], anchor: EdgeEnd | 'middle'): EdgeTextLayout {
  const middle: EdgeTextLayout = {
    placement: { position: 0, distance: 0, offset: { x: 0, y: 0 } },
    align: 'center',
    verticalAlign: 'middle',
  };
  if (anchor === 'middle' || route.length < 2) return middle;
  // Bout et direction de la flèche en partant de ce bout (premier segment non nul).
  const points = anchor === 'start' ? route : [...route].reverse();
  const tip = points[0]!;
  const next = points.find((p) => p.x !== tip.x || p.y !== tip.y);
  if (!next) return middle;
  const length = Math.hypot(next.x - tip.x, next.y - tip.y);
  const u = { x: (next.x - tip.x) / length, y: (next.y - tip.y) / length };
  const { along, across } = END_TEXT_GAP;
  const start = anchor === 'start';
  const round = (v: number) => Math.round(v * 100) / 100 || 0;
  if (Math.abs(u.x) >= Math.abs(u.y)) {
    // Horizontal : au-dessus (début) ou en dessous (fin), le texte s'éloigne de la forme.
    return {
      placement: {
        position: start ? -1 : 1,
        distance: 0,
        offset: { x: round(u.x * along), y: round(u.y * along + (start ? -across : across)) },
      },
      align: u.x > 0 ? 'left' : 'right',
      verticalAlign: start ? 'bottom' : 'top',
    };
  }
  // Vertical : à droite (début) ou à gauche (fin), le texte s'éloigne de la forme le long du trait.
  return {
    placement: {
      position: start ? -1 : 1,
      distance: 0,
      offset: { x: round(u.x * along + (start ? across : -across)), y: round(u.y * along) },
    },
    align: start ? 'left' : 'right',
    verticalAlign: u.y > 0 ? 'top' : 'bottom',
  };
}
