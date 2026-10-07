import type { Node } from '@xmldom/xmldom';
import { markPageDirty, reindexPage } from './xmlTree';
import type { CellNodes, PageTree } from './xmlTree';

/**
 * Ordre de dessin (ticket 130), comme « Disposition » de draw.io : l'ordre est celui des cellules dans le fichier.
 * Une cellule se déplace parmi les cellules de même parent, avec ses descendants (contenu d'un conteneur, labels
 * d'une flèche) et l'indentation qui précède chaque nœud.
 */
export type OrderMove = 'front' | 'back' | 'forward' | 'backward';

/** Déplace les cellules `cellIds` dans l'ordre de dessin ; faux si rien ne change. */
export function reorderCells(page: PageTree, cellIds: Iterable<string>, move: OrderMove): boolean {
  const selected = new Set(cellIds);
  const parentOf = new Map(page.cellList.map((nodes) => [nodes.id, nodes.cell?.getAttribute('parent') ?? undefined]));
  const parents = new Set([...selected].filter((id) => page.cells.has(id)).map((id) => parentOf.get(id)));
  let changed = false;
  for (const parent of parents) {
    const siblings = page.cellList.filter((nodes) => parentOf.get(nodes.id) === parent).map((nodes) => nodes.id);
    const order = reordered(siblings, selected, move);
    if (order.every((id, i) => id === siblings[i])) continue;
    moveBlocks(page, order, parentOf);
    changed = true;
  }
  if (!changed) return false;
  reindexPage(page);
  markPageDirty(page);
  return true;
}

/**
 * Envoie les cellules `cellIds` au fond, dans cet ordre (la première tout au fond), parmi leurs sœurs (ex. régions RDD
 * derrière leur contenu, sujet 230) ; faux si elles y sont déjà.
 */
export function sendToBackInOrder(page: PageTree, cellIds: readonly string[]): boolean {
  const parentOf = new Map(page.cellList.map((nodes) => [nodes.id, nodes.cell?.getAttribute('parent') ?? undefined]));
  const ids = cellIds.filter((id) => page.cells.has(id));
  let changed = false;
  for (const parent of new Set(ids.map((id) => parentOf.get(id)))) {
    const siblings = page.cellList.filter((nodes) => parentOf.get(nodes.id) === parent).map((nodes) => nodes.id);
    const picked = ids.filter((id) => parentOf.get(id) === parent);
    const order = [...picked, ...siblings.filter((id) => !picked.includes(id))];
    if (order.every((id, i) => id === siblings[i])) continue;
    moveBlocks(page, order, parentOf);
    changed = true;
  }
  if (!changed) return false;
  reindexPage(page);
  markPageDirty(page);
  return true;
}

/** Nouvel ordre des cellules sœurs ; les cellules choisies gardent leur ordre entre elles. */
function reordered(siblings: string[], selected: ReadonlySet<string>, move: OrderMove): string[] {
  const order = [...siblings];
  const picked = (i: number) => selected.has(order[i]!);
  const swap = (i: number) => ([order[i], order[i + 1]] = [order[i + 1]!, order[i]!]);
  if (move === 'front') return [...order.filter((id) => !selected.has(id)), ...order.filter((id) => selected.has(id))];
  if (move === 'back') return [...order.filter((id) => selected.has(id)), ...order.filter((id) => !selected.has(id))];
  // Avancer / reculer : chaque cellule choisie passe la voisine non choisie (au plus une place).
  if (move === 'forward') {
    for (let i = order.length - 2; i >= 0; i--) if (picked(i) && !picked(i + 1)) swap(i);
  } else {
    for (let i = 1; i < order.length; i++) if (picked(i) && !picked(i - 1)) swap(i - 1);
  }
  return order;
}

/**
 * Réécrit les nœuds des cellules sœurs (chacune suivie de ses descendants) dans l'ordre `order`, à la place du
 * premier d'entre eux.
 */
function moveBlocks(page: PageTree, order: string[], parentOf: ReadonlyMap<string, string | undefined>): void {
  const root = page.cells.get(order[0]!)?.element.parentNode;
  if (!root) return;
  const blockOf = (nodes: CellNodes): string | undefined => {
    const seen = new Set<string>();
    for (let id: string | undefined = nodes.id; id && !seen.has(id); id = parentOf.get(id)) {
      if (order.includes(id)) return id;
      seen.add(id);
    }
    return undefined;
  };
  const blocks = new Map(order.map((id) => [id, [] as Node[]]));
  let anchor: Node | null | undefined;
  for (const nodes of page.cellList) {
    const block = blockOf(nodes);
    if (!block) continue;
    const element: Node = nodes.element;
    const previous = element.previousSibling;
    const indent = previous && previous.nodeType === 3 && !previous.nodeValue?.trim() ? previous : undefined;
    if (anchor === undefined) anchor = (indent ?? element).previousSibling;
    blocks.get(block)!.push(...(indent ? [indent, element] : [element]));
  }
  for (const nodes of blocks.values()) for (const node of nodes) root.removeChild(node);
  const before = anchor ? anchor.nextSibling : root.firstChild;
  for (const id of order) for (const node of blocks.get(id)!) root.insertBefore(node, before);
}
