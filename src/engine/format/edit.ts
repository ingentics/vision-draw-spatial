import type { Point } from '../model/types';
import { markPageDirty } from './xmlTree';
import type { PageTree } from './xmlTree';

/**
 * Modifications in situ de l'arbre XML (SPEC §14.2) : seuls les attributs concernés changent.
 */

/** Grille de la page (`grid`, `gridSize` de `<mxGraphModel>`) ; 0 si elle est désactivée. */
export function gridSizeOf(page: PageTree): number {
  if (!page.model || page.model.getAttribute('grid') === '0') return 0;
  const size = parseFloat(page.model.getAttribute('gridSize') ?? '');
  return Number.isFinite(size) && size > 0 ? size : 10;
}

/**
 * Vrai si la cellule peut être déplacée en réécrivant sa géométrie : elle a un `<mxGeometry>`
 * non relatif (une géométrie relative, ex. un port, est exprimée en fractions de son parent).
 */
export function canMoveCell(page: PageTree, cellId: string): boolean {
  if (page.encoding === 'unreadable' || page.encoding === 'empty') return false;
  const geometry = page.cells.get(cellId)?.geometry;
  return geometry !== undefined && geometry.getAttribute('relative') !== '1';
}

/**
 * Déplace une cellule : `x` et `y` de son `<mxGeometry>` (relatifs à son parent, ses enfants
 * suivent donc d'eux-mêmes). Un attribut absent vaut 0, comme dans draw.io.
 */
export function moveCell(page: PageTree, cellId: string, delta: Point): void {
  if (!canMoveCell(page, cellId)) throw new Error(`Cellule ${cellId} non déplaçable`);
  if (delta.x === 0 && delta.y === 0) return;
  const geometry = page.cells.get(cellId)!.geometry!;
  for (const [name, d] of [
    ['x', delta.x],
    ['y', delta.y],
  ] as const) {
    if (d === 0) continue;
    const current = parseFloat(geometry.getAttribute(name) ?? '');
    const value = (Number.isFinite(current) ? current : 0) + d;
    if (value === 0) geometry.removeAttribute(name);
    else geometry.setAttribute(name, formatNumber(value));
  }
  markPageDirty(page);
}

/** Nombre au format draw.io : entier tel quel, sinon au plus deux décimales. */
export function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}
