import { cellLabelValue, setCellRichLabel } from '../format/cellEdits';
import type { DrawioTree } from '../format/xmlTree';
import type { DocumentModel, PageModel, ShapeModel } from '../model/types';

/**
 * Labels des formes réécrits dans l'arbre XML (sujet 478) : `labelOf` reçoit le label tel qu'écrit dans le fichier
 * (`value`, HTML si `html=1`) et donne celui à écrire, undefined pour le laisser. Sert au passage entre le fichier et l'appli quand un mode écrit dans le
 * fichier plus que ce que l'appli garde (ex. nom du type en tête d'un post-it Event storming). Les pages touchées
 * sont marquées modifiées (une page compressée sera réencodée) ; renvoie les ids de ces pages.
 */
export function rewriteLabels(
  document: DocumentModel,
  tree: DrawioTree,
  labelOf: (page: PageModel, shape: ShapeModel, value: string) => string | undefined,
): string[] {
  const changed: string[] = [];
  document.pages.forEach((page, index) => {
    const pageTree = tree.pages[index];
    if (!pageTree) return;
    for (const shape of page.shapes) {
      const value = cellLabelValue(pageTree, shape.id);
      const label = labelOf(page, shape, value);
      if (label === undefined || label === value) continue;
      setCellRichLabel(pageTree, shape.id, label);
      if (!changed.includes(page.id)) changed.push(page.id);
    }
  });
  return changed;
}
