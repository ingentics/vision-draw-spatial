import type { Element } from '@xmldom/xmldom';
import type { PageTree } from './xmlTree';

/**
 * Calques dans l'arbre XML d'une page (sujet 523) : cellules racines (ni vertex ni arête, sans parent), calques (ni
 * vertex ni arête, enfants d'une racine), calque de chaque cellule. Lecture seule, sur l'arbre tel qu'il est indexé.
 */

/** Racines de la page, dans l'ordre du fichier. */
export function rootIdsOf(page: PageTree): string[] {
  return page.cellList.filter((nodes) => isStructural(nodes.cell) && !parentOf(page, nodes.id)).map((n) => n.id);
}

/** Calques de la page, dans l'ordre du fichier (ordre de rendu : le dernier est au-dessus). */
export function layerIdsOf(page: PageTree): string[] {
  const roots = new Set(rootIdsOf(page));
  return page.cellList
    .filter((nodes) => isStructural(nodes.cell) && roots.has(parentOf(page, nodes.id) ?? ''))
    .map((nodes) => nodes.id);
}

/** Calque d'une cellule (elle-même si c'en est un), en remontant ses parents ; undefined hors de tout calque. */
export function layerOfCell(page: PageTree, cellId: string, layers = new Set(layerIdsOf(page))): string | undefined {
  const seen = new Set<string>();
  for (let id: string | undefined = cellId; id && !seen.has(id); id = parentOf(page, id)) {
    if (layers.has(id)) return id;
    seen.add(id);
  }
  return undefined;
}

/** Dernier nœud du bloc d'un calque dans le fichier : le calque ou la dernière cellule qui y est. */
export function lastOfLayer(page: PageTree, layerId: string): Element | undefined {
  const layers = new Set(layerIdsOf(page));
  if (!layers.has(layerId)) return undefined;
  let last: Element | undefined;
  for (const nodes of page.cellList) if (layerOfCell(page, nodes.id, layers) === layerId) last = nodes.element;
  return last;
}

/** Cellules posées directement sur un calque (pas dans un conteneur ni sur une flèche), dans l'ordre du fichier. */
export function layerChildIds(page: PageTree, layerId: string): string[] {
  return page.cellList.filter((nodes) => parentOf(page, nodes.id) === layerId).map((nodes) => nodes.id);
}

export function parentOf(page: PageTree, cellId: string): string | undefined {
  return page.cells.get(cellId)?.cell?.getAttribute('parent') || undefined;
}

function isStructural(cell: Element | undefined): boolean {
  return cell !== undefined && cell.getAttribute('vertex') !== '1' && cell.getAttribute('edge') !== '1';
}
