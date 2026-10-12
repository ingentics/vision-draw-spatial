import type { Element } from '@xmldom/xmldom';
import { formatNumber, setCellLabel, setCellStyleValue } from './cellEdits';
import { SPATIAL } from '../spatial';
import { ensureLayer, ensureRoot, layerWriter, newCellId, removeCellsDeep } from './create';
import { layerIdsOf, parentOf } from './layerTree';
import { reorderCells } from './order';
import { markPageDirty, reindexPage } from './xmlTree';
import type { PageTree } from './xmlTree';

/**
 * Modifications des calques d'une page dans l'arbre XML (sujet 523), en place : un calque est une `<mxCell>` enfant
 * de la cellule racine, son nom dans `value`, masqué par `visible="0"`, verrouillé par `locked=1` dans son style,
 * élevé en iso par `spatial.elevation` dans son style (sujet 524).
 */

/** Ajoute un calque au-dessus de tous (à la fin du fichier) et renvoie son id. */
export function addLayer(page: PageTree, name: string): string {
  if (page.encoding === 'unreadable') throw new Error(`Page ${page.id} illisible : ajout impossible`);
  const rootEl = ensureRoot(page);
  const first = ensureLayer(page, rootEl);
  const id = newCellId(page);
  const cell = rootEl.ownerDocument!.createElement('mxCell');
  cell.setAttribute('id', id);
  cell.setAttribute('value', name);
  cell.setAttribute('parent', parentOf(page, first)!);
  layerWriter(page, rootEl, layerIdsOf(page).at(-1)!)(cell);
  reindexPage(page);
  markPageDirty(page);
  return id;
}

export function renameLayer(page: PageTree, layerId: string, name: string): void {
  assertLayer(page, layerId);
  setCellLabel(page, layerId, name);
}

export function setLayerVisible(page: PageTree, layerId: string, visible: boolean): void {
  assertLayer(page, layerId);
  const cell = page.cells.get(layerId)!.cell!;
  if (visible) cell.removeAttribute('visible');
  else cell.setAttribute('visible', '0');
  markPageDirty(page);
}

export function setLayerLocked(page: PageTree, layerId: string, locked: boolean): void {
  assertLayer(page, layerId);
  setCellStyleValue(page, layerId, 'locked', locked ? '1' : undefined);
}

/** Élévation du calque en iso et en 3D (`spatial.elevation` dans son style) ; 0 la retire. */
export function setLayerElevation(page: PageTree, layerId: string, elevation: number): void {
  assertLayer(page, layerId);
  setCellStyleValue(page, layerId, SPATIAL.elevation, elevation > 0 ? formatNumber(elevation) : undefined);
}

/** Monte (`up` : vers le dessus) ou descend un calque d'un rang, avec son contenu ; faux s'il est déjà au bout. */
export function moveLayer(page: PageTree, layerId: string, direction: 'up' | 'down'): boolean {
  assertLayer(page, layerId);
  return reorderCells(page, [layerId], direction === 'up' ? 'forward' : 'backward');
}

/**
 * Supprime un calque et son contenu, comme une suppression : les flèches reliées à ce contenu partent aussi. Faux
 * pour le dernier calque de la page, qui reste.
 */
export function removeLayer(page: PageTree, layerId: string): boolean {
  assertLayer(page, layerId);
  if (layerIdsOf(page).length <= 1) return false;
  removeCellsDeep(page, [layerId]);
  return true;
}

/**
 * Passe des cellules posées directement sur un calque vers le calque `layerId`, avec leur contenu, à la fin de son
 * bloc. Une cellule dans un conteneur (ou déjà sur ce calque) ne bouge pas : elle suit son conteneur. Renvoie les
 * cellules déplacées. Les coordonnées ne changent pas (un calque a l'origine de la page).
 */
export function moveCellsToLayer(page: PageTree, cellIds: Iterable<string>, layerId: string): string[] {
  assertLayer(page, layerId);
  const layers = new Set(layerIdsOf(page));
  const moved = [...new Set(cellIds)].filter((id) => {
    const parent = parentOf(page, id);
    return parent !== undefined && layers.has(parent) && parent !== layerId;
  });
  if (moved.length === 0) return [];
  const movedSet = new Set(moved);
  const inMoved = (id: string) => {
    const seen = new Set<string>();
    for (let at: string | undefined = id; at && !seen.has(at); at = parentOf(page, at)) {
      if (movedSet.has(at)) return true;
      seen.add(at);
    }
    return false;
  };
  const rootEl = page.cells.get(layerId)!.element.parentNode as Element;
  // Point d'écriture pris avant de sortir les cellules : la fin du bloc du calque, sans elles.
  const write = layerWriter(page, rootEl, layerId);
  // Nœuds déplacés (chaque cellule suivie de ses descendants), sortis du fichier avec l'indentation qui les précède.
  const elements = page.cellList.filter((nodes) => inMoved(nodes.id)).map((nodes) => nodes.element);
  for (const element of elements) {
    const previous = element.previousSibling;
    if (previous && previous.nodeType === 3 && !previous.nodeValue?.trim()) rootEl.removeChild(previous);
    rootEl.removeChild(element);
  }
  for (const id of moved) page.cells.get(id)!.cell!.setAttribute('parent', layerId);
  for (const element of elements) write(element);
  reindexPage(page);
  markPageDirty(page);
  return moved;
}

function assertLayer(page: PageTree, layerId: string): void {
  if (!layerIdsOf(page).includes(layerId)) throw new Error(`Calque ${layerId} introuvable`);
}
