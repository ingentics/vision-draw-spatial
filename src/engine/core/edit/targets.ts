import { canMoveCell } from '../../format/edit';
import type { PageTree } from '../../format/xmlTree';
import { isLocked } from '../../edit/move';
import { GRAPH_PAGE_ID } from '../../graph/graphPage';
import type { EdgeModel, PageModel, ShapeModel } from '../../model/types';
import type { EngineCore } from '../EngineCore';

/** Édition activée ou non, et ce qu'on peut modifier : la page courante, la forme ou la flèche sélectionnée seule. */
export class EditTargets {
  editable: boolean;

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
    if (!page || page.id === GRAPH_PAGE_ID || this.core.transitions.active) return undefined;
    const pageTree = this.core.file.pageTreeOf(page.id);
    if (!pageTree || pageTree.encoding === 'unreadable') return undefined;
    return { page, pageTree };
  }

  /** Forme sélectionnée sur la page courante, si on peut la modifier (poignées affichées). */
  editableSelection(): { page: PageModel; pageTree: PageTree; shape: ShapeModel } | undefined {
    const editable = this.editablePage();
    const picked = this.core.selection.current?.picked;
    if (!editable || picked?.type !== 'shape' || this.core.selection.current?.pageId !== editable.page.id)
      return undefined;
    // Poignées, redimensionnement et connecteur : une seule forme sélectionnée.
    if (this.core.selection.isMultiSelection()) return undefined;
    const shape = editable.page.shapes.find((s) => s.id === picked.element.id);
    if (!shape || isLocked(shape) || !canMoveCell(editable.pageTree, shape.id)) return undefined;
    return { ...editable, shape };
  }

  /** Flèche sélectionnée seule sur la page courante, si on peut la modifier (poignées de ses bouts). */
  editableEdgeSelection(): { page: PageModel; pageTree: PageTree; edge: EdgeModel } | undefined {
    const editable = this.editablePage();
    const picked = this.core.selection.current?.picked;
    if (!editable || picked?.type !== 'edge' || this.core.selection.current?.pageId !== editable.page.id)
      return undefined;
    if (this.core.selection.isMultiSelection()) return undefined;
    const edge = editable.page.edges.find((e) => e.id === picked.element.id);
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
