import type { DrawioTree, PageTree } from '../../format/xmlTree';
import { canMoveShape, isLocked } from '../../edit/moveSet';
import type { EdgeModel, PageModel, ShapeModel } from '../../model/types';
import type { EngineCore } from '../EngineCore';
import { edgeOf, shapeOf } from '../../model/pageIndex';

/** Édition activée ou non, et ce qu'on peut modifier : la page courante, la forme ou la flèche sélectionnée seule. */
export class EditTargets {
  private editable: boolean;

  constructor(
    private readonly core: EngineCore,
    editable: boolean,
  ) {
    this.editable = editable;
  }

  isEditable(): boolean {
    return this.editable;
  }

  setEditable(editable: boolean): void {
    if (this.editable === editable) return;
    this.core.gesture.endMove();
    this.editable = editable;
    this.core.highlight.update();
  }

  /** Page courante modifiable (pas la vue graphe, ni une page illisible) et son arbre XML. */
  editablePage(): { page: PageModel; pageTree: PageTree } | undefined {
    return this.editable ? this.writablePage() : undefined;
  }

  /**
   * Page courante qu'on peut écrire, édition activée ou non : pour ce qui se modifie hors du mode édition, comme le
   * commentaire d'un élément (ticket 201).
   */
  writablePage(): { page: PageModel; pageTree: PageTree } | undefined {
    const page = this.core.pages.getCurrentPage();
    if (!page || this.core.graph.isGraph(page.id) || !this.core.canInteract()) return undefined;
    const pageTree = this.core.file.pageTreeOf(page.id);
    if (!pageTree || pageTree.encoding === 'unreadable') return undefined;
    return { page, pageTree };
  }

  /**
   * Page du document dont on change un réglage (mode, effets, ancrage, sauts) : édition activée, page lisible dans un
   * `<diagram>` et pas de transition en cours.
   */
  editablePageById(pageId: string): { page: PageModel; pageTree: PageTree; xmlTree: DrawioTree } | undefined {
    const xmlTree = this.core.file.xmlTree;
    const page = this.core.pages.pageById(pageId);
    const pageTree = this.core.file.pageTreeOf(pageId);
    if (!xmlTree || !page || !pageTree?.diagram || !this.editable || !this.core.canInteract()) return undefined;
    return { page, pageTree, xmlTree };
  }

  /** Forme sélectionnée sur la page courante, si on peut la modifier (poignées affichées). */
  editableSelection(): { page: PageModel; pageTree: PageTree; shape: ShapeModel } | undefined {
    const editable = this.editablePage();
    const picked = this.core.selection.current?.picked;
    if (!editable || picked?.type !== 'shape' || this.core.selection.current?.pageId !== editable.page.id)
      return undefined;
    // Poignées, redimensionnement et connecteur : une seule forme sélectionnée.
    if (this.core.selection.isMultiSelection()) return undefined;
    const shape = shapeOf(editable.page, picked.element.id);
    if (!shape || !canMoveShape(editable.pageTree, shape)) return undefined;
    return { ...editable, shape };
  }

  /** Flèche sélectionnée seule sur la page courante, si on peut la modifier (poignées de ses bouts). */
  editableEdgeSelection(): { page: PageModel; pageTree: PageTree; edge: EdgeModel } | undefined {
    const editable = this.editablePage();
    const picked = this.core.selection.current?.picked;
    if (!editable || picked?.type !== 'edge' || this.core.selection.current?.pageId !== editable.page.id)
      return undefined;
    if (this.core.selection.isMultiSelection()) return undefined;
    const edge = edgeOf(editable.page, picked.element.id);
    if (!edge || isLocked(edge) || !editable.pageTree.cells.get(edge.id)?.cell) return undefined;
    return { ...editable, edge };
  }

  /**
   * Flèche dont les poignées sont affichées et saisissables : la flèche modifiable sélectionnée, sauf pendant
   * l'édition de son texte du milieu (les poignées gêneraient la saisie).
   */
  edgeHandlesSelection(): ReturnType<EditTargets['editableEdgeSelection']> {
    const editable = this.editableEdgeSelection();
    const editing = this.core.labelEditor.editing;
    const editingMiddle = editing?.elementId === editable?.edge.id && !editing?.end && !editing?.labelCellId;
    return editingMiddle ? undefined : editable;
  }
}
