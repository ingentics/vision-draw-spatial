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
  shiftGeometry(page, cellId, { x: delta.x, y: delta.y });
}

/**
 * Redimensionne une cellule : variations de position (bord gauche / haut déplacé) et de taille,
 * appliquées aux attributs de son `<mxGeometry>`. Seuls les attributs qui changent sont réécrits.
 */
export function resizeCell(page: PageTree, cellId: string, delta: Partial<Record<GeometryKey, number>>): void {
  shiftGeometry(page, cellId, delta);
}

type GeometryKey = 'x' | 'y' | 'width' | 'height';

function shiftGeometry(page: PageTree, cellId: string, delta: Partial<Record<GeometryKey, number>>): void {
  if (!canMoveCell(page, cellId)) throw new Error(`Cellule ${cellId} non modifiable`);
  const changes = (Object.entries(delta) as Array<[GeometryKey, number]>).filter(([, d]) => d !== 0);
  if (changes.length === 0) return;
  const geometry = page.cells.get(cellId)!.geometry!;
  for (const [name, d] of changes) {
    const current = parseFloat(geometry.getAttribute(name) ?? '');
    const value = (Number.isFinite(current) ? current : 0) + d;
    if (value === 0 && (name === 'x' || name === 'y')) geometry.removeAttribute(name);
    else geometry.setAttribute(name, formatNumber(value));
  }
  markPageDirty(page);
}

/**
 * Remplace le label d'une cellule (attribut `label` de l'enveloppe, sinon `value`). Avec
 * `html=1`, le texte est échappé et les retours à la ligne deviennent des `<br>`, comme draw.io.
 */
export function setCellLabel(page: PageTree, cellId: string, text: string): void {
  const nodes = page.cells.get(cellId);
  if (!nodes?.cell) throw new Error(`Cellule ${cellId} introuvable`);
  const html = /(^|;)\s*html=1\s*(;|$)/.test(nodes.cell.getAttribute('style') ?? '');
  const value = html ? textToHtml(text) : text;
  if (nodes.wrapper) nodes.wrapper.setAttribute('label', value);
  else nodes.cell.setAttribute('value', value);
  markPageDirty(page);
}

/** Texte brut → label HTML draw.io. */
export function textToHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>');
}

/** Nombre au format draw.io : entier tel quel, sinon au plus deux décimales. */
export function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}
