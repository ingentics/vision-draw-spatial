import type { Point, Rect } from '../model/types';

/**
 * Aligner et répartir la sélection (ticket 136), comme « Arrange › Align / Distribute » de draw.io. Calcul pur : à
 * partir des cadres des formes (repère de page), le décalage de chacune ; une forme absente du résultat ne bouge pas.
 */

/** Alignement : à gauche de la référence, bords gauches, centres, bords droits, à droite ; de même en hauteur. */
export type AlignMove =
  'leftOf' | 'left' | 'center' | 'right' | 'rightOf' | 'above' | 'top' | 'middle' | 'bottom' | 'below';

/** Répartition : bords gauches, centres, bords droits, espacement ; de même en hauteur. */
export type DistributeMove = 'left' | 'center' | 'right' | 'spacingX' | 'top' | 'middle' | 'bottom' | 'spacingY';

/** Référence d'un alignement : cadre de la sélection, premier ou dernier élément sélectionné (qui ne bouge pas). */
export type AlignReference = 'selection' | 'first' | 'last';

export const ALIGN_REFERENCES: readonly AlignReference[] = ['selection', 'first', 'last'];

export interface AlignItem {
  id: string;
  bounds: Rect;
}

/** Décalages qui alignent `items` (dans l'ordre de sélection) sur la référence ; vide sous deux formes. */
export function alignDeltas(
  items: readonly AlignItem[],
  move: AlignMove,
  reference: AlignReference,
): Map<string, Point> {
  const deltas = new Map<string, Point>();
  if (items.length < 2) return deltas;
  const anchor = reference === 'first' ? items[0]! : reference === 'last' ? items[items.length - 1]! : undefined;
  const ref = anchor?.bounds ?? unionOf(items.map((item) => item.bounds));
  for (const item of items) {
    if (item === anchor) continue;
    const b = item.bounds;
    const delta = { x: 0, y: 0 };
    switch (move) {
      case 'leftOf':
        delta.x = ref.x - (b.x + b.width);
        break;
      case 'left':
        delta.x = ref.x - b.x;
        break;
      case 'center':
        delta.x = ref.x + ref.width / 2 - (b.x + b.width / 2);
        break;
      case 'right':
        delta.x = ref.x + ref.width - (b.x + b.width);
        break;
      case 'rightOf':
        delta.x = ref.x + ref.width - b.x;
        break;
      case 'above':
        delta.y = ref.y - (b.y + b.height);
        break;
      case 'top':
        delta.y = ref.y - b.y;
        break;
      case 'middle':
        delta.y = ref.y + ref.height / 2 - (b.y + b.height / 2);
        break;
      case 'bottom':
        delta.y = ref.y + ref.height - (b.y + b.height);
        break;
      case 'below':
        delta.y = ref.y + ref.height - b.y;
        break;
    }
    if (delta.x !== 0 || delta.y !== 0) deltas.set(item.id, delta);
  }
  return deltas;
}

/**
 * Décalages qui répartissent `items` à intervalles égaux, comme draw.io : rangées par position (bord, centre ou bord
 * opposé selon `move`), la première et la dernière restent en place ; vide sous trois formes.
 */
export function distributeDeltas(items: readonly AlignItem[], move: DistributeMove): Map<string, Point> {
  const deltas = new Map<string, Point>();
  if (items.length < 3) return deltas;
  const horizontal = move === 'left' || move === 'center' || move === 'right' || move === 'spacingX';
  const start = (r: Rect) => (horizontal ? r.x : r.y);
  const size = (r: Rect) => (horizontal ? r.width : r.height);
  // Position repérée de chaque forme : bord de début, centre ou bord de fin.
  const fraction = move === 'left' || move === 'top' ? 0 : move === 'right' || move === 'bottom' ? 1 : 0.5;
  const spacing = move === 'spacingX' || move === 'spacingY';
  const keyOf = (r: Rect) => start(r) + size(r) * (spacing ? 0.5 : fraction);
  const sorted = [...items].sort((a, b) => keyOf(a.bounds) - keyOf(b.bounds));
  const first = sorted[0]!.bounds;
  const last = sorted[sorted.length - 1]!.bounds;
  const n = sorted.length - 1;
  const set = (item: AlignItem, target: number) => {
    const d = target - start(item.bounds);
    if (d !== 0) deltas.set(item.id, horizontal ? { x: d, y: 0 } : { x: 0, y: d });
  };
  if (spacing) {
    // Espaces égaux entre formes voisines, de la fin de la première au début de la dernière.
    const inner = sorted.slice(1, -1).reduce((sum, item) => sum + size(item.bounds), 0);
    const gap = (start(last) - (start(first) + size(first)) - inner) / n;
    let cursor = start(first) + size(first) + gap;
    for (const item of sorted.slice(1, -1)) {
      set(item, cursor);
      cursor += size(item.bounds) + gap;
    }
    return deltas;
  }
  const from = keyOf(first);
  const step = (keyOf(last) - from) / n;
  sorted.slice(1, -1).forEach((item, i) => set(item, from + step * (i + 1) - size(item.bounds) * fraction));
  return deltas;
}

function unionOf(rects: readonly Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.width));
  const bottom = Math.max(...rects.map((r) => r.y + r.height));
  return { x, y, width: right - x, height: bottom - y };
}
