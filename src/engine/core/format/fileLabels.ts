import { cellLabelValue, setCellLabel, setCellRichLabel, textToHtml } from './cellEdits';
import { htmlToText } from './richText';
import type { Element } from '@xmldom/xmldom';
import type { DrawioTree, PageTree } from './xmlTree';
import type { DocumentModel, PageModel, ShapeModel } from '../model/types';
import { styleFlag } from '../model/styleValues';

/**
 * Labels des formes réécrits dans l'arbre XML (sujets 478, 503), au passage entre le fichier et l'appli quand un mode
 * écrit dans le fichier plus que ce que l'appli garde (ex. nom du type en tête d'un post-it Event storming).
 */

/**
 * Label à écrire pour `shape`, d'après `value`, son label en HTML (un label en texte brut, `html=0`, est d'abord
 * converti : un `<` du texte arrive en `&lt;`) ; undefined pour le laisser.
 */
export type LabelRewrite = (page: PageModel, shape: ShapeModel, value: string) => string | undefined;

/** Réécrit les labels des pages du document ; renvoie les ids des pages touchées (marquées modifiées). */
export function rewriteLabels(document: DocumentModel, tree: DrawioTree, labelOf: LabelRewrite): string[] {
  return document.pages.flatMap((page, index) => {
    const pageTree = tree.pages[index];
    return pageTree && rewritePageLabels(page, pageTree, labelOf) ? [page.id] : [];
  });
}

/**
 * Réécrit les labels des formes d'une page (`only` : seulement celles-ci) ; vrai si un label a changé. Un label en
 * texte brut le reste tant que le label réécrit n'a pas de mise en forme ; sinon il passe en `html=1`. `before` est
 * appelé avec l'id de chaque cellule juste avant qu'elle change.
 */
export function rewritePageLabels(
  page: PageModel,
  pageTree: PageTree,
  labelOf: LabelRewrite,
  only?: ReadonlySet<string>,
  before?: (cellId: string) => void,
): boolean {
  let changed = false;
  for (const shape of page.shapes) {
    if (only && !only.has(shape.id)) continue;
    const html = styleFlag(shape.style, 'html');
    const written = cellLabelValue(pageTree, shape.id);
    const value = html ? written : textToHtml(written);
    const label = labelOf(page, shape, value);
    if (label === undefined || label === value) continue;
    before?.(shape.id);
    const text = htmlToText(label);
    if (!html && textToHtml(text) === label) setCellLabel(pageTree, shape.id, text);
    else setCellRichLabel(pageTree, shape.id, label);
    changed = true;
  }
  return changed;
}

/**
 * Labels d'une page réécrits le temps d'écrire le fichier (sujet 513), en place dans l'arbre du document : renvoie de
 * quoi remettre le label et le style d'avant de chaque cellule touchée, sur les mêmes nœuds (rien n'est relu), ou
 * undefined si rien n'a changé. La page reste marquée modifiée : compressée, elle sera réencodée à l'écriture suivante
 * au lieu de garder les labels écrits.
 */
export function rewriteLabelsForWriting(
  page: PageModel,
  pageTree: PageTree,
  labelOf: LabelRewrite,
): (() => void) | undefined {
  const restores: Array<() => void> = [];
  const keep = (element: Element, name: string) => {
    const value = element.getAttribute(name);
    restores.push(() => (value === null ? element.removeAttribute(name) : element.setAttribute(name, value)));
  };
  const changed = rewritePageLabels(page, pageTree, labelOf, undefined, (cellId) => {
    const nodes = pageTree.cells.get(cellId);
    if (!nodes?.cell) return;
    if (nodes.wrapper) keep(nodes.wrapper, 'label');
    else keep(nodes.cell, 'value');
    keep(nodes.cell, 'style');
  });
  if (!changed) return undefined;
  return () => {
    for (const restore of restores.reverse()) restore();
    pageTree.dirty = true;
  };
}
