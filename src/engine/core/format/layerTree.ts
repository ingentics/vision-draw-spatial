import type { Element } from '@xmldom/xmldom';
import type { PageTree } from './xmlTree';

/**
 * Calques dans l'arbre XML d'une page (sujet 523) : cellules racines (ni vertex ni arête, sans parent), calques (ni
 * vertex ni arête, enfants d'une racine), calque de chaque cellule. Lecture seule, sur l'arbre tel qu'il est indexé.
 */

/** Ce qui fait d'une cellule une racine ou un calque : ni vertex ni arête (règle partagée avec `cellIndex.ts`). */
export function isStructuralCell(cell: { vertex: boolean; edge: boolean }): boolean {
  return !cell.vertex && !cell.edge;
}

/**
 * Première cellule qui répond à `match` en partant de `cellId` (elle-même comprise) et en remontant ses parents ;
 * undefined au bout de la chaîne ou sur un cycle.
 */
export function firstAncestor(
  cellId: string,
  parentOf: (id: string) => string | undefined,
  match: (id: string) => boolean,
): string | undefined {
  const seen = new Set<string>();
  for (let id: string | undefined = cellId; id && !seen.has(id); id = parentOf(id)) {
    if (match(id)) return id;
    seen.add(id);
  }
  return undefined;
}

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
function layerOfCell(page: PageTree, cellId: string, layers: ReadonlySet<string>): string | undefined {
  return firstAncestor(
    cellId,
    (id) => parentOf(page, id),
    (id) => layers.has(id),
  );
}

/** Dernier nœud du bloc d'un calque dans le fichier : le calque ou la dernière cellule qui y est. */
export function lastOfLayer(page: PageTree, layerId: string): Element | undefined {
  const layers = new Set(layerIdsOf(page));
  if (!layers.has(layerId)) return undefined;
  let last: Element | undefined;
  for (const nodes of page.cellList) if (layerOfCell(page, nodes.id, layers) === layerId) last = nodes.element;
  return last;
}

export function parentOf(page: PageTree, cellId: string): string | undefined {
  return page.cells.get(cellId)?.cell?.getAttribute('parent') || undefined;
}

function isStructural(cell: Element | undefined): boolean {
  return (
    cell !== undefined &&
    isStructuralCell({ vertex: cell.getAttribute('vertex') === '1', edge: cell.getAttribute('edge') === '1' })
  );
}
