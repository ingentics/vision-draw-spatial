import { cellLabelValue, setCellLabel, setCellRichLabel, textToHtml } from './cellEdits';
import { htmlToText } from './richText';
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
 * texte brut le reste tant que le label réécrit n'a pas de mise en forme ; sinon il passe en `html=1`.
 */
export function rewritePageLabels(
  page: PageModel,
  pageTree: PageTree,
  labelOf: LabelRewrite,
  only?: ReadonlySet<string>,
): boolean {
  let changed = false;
  for (const shape of page.shapes) {
    if (only && !only.has(shape.id)) continue;
    const html = styleFlag(shape.style, 'html');
    const written = cellLabelValue(pageTree, shape.id);
    const value = html ? written : textToHtml(written);
    const label = labelOf(page, shape, value);
    if (label === undefined || label === value) continue;
    const text = htmlToText(label);
    if (!html && textToHtml(text) === label) setCellLabel(pageTree, shape.id, text);
    else setCellRichLabel(pageTree, shape.id, label);
    changed = true;
  }
  return changed;
}
