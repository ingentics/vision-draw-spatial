import { gridSizeOf } from '../../../format/cellEdits';
import { copyCells, pasteCells, readClipboardModel, stripCellKeys } from '../../../format/clipboardCells';
import type { PageTree } from '../../../format/xmlTree';
import type { PickedElement } from '../../../interaction/pick';
import type { Point } from '../../../model/types';
import type { EngineCore } from '../../EngineCore';

/** Copier, couper, coller et dupliquer (ticket 59), au format du presse-papier de draw.io. */
export class Clipboard {
  /**
   * Dernière copie faite dans l'appli (ticket 59) : son XML, sa page d'origine et le parent de ses
   * éléments (pour recoller dans le même conteneur), et le décalage du prochain collage, en pas de grille.
   */
  private stored:
    { xml: string; fileId?: string; pageId: string; parents: Map<string, string>; steps: number } | undefined;

  constructor(private readonly core: EngineCore) {}

  copySelection(): string | undefined {
    const xml = this.selectionClipboard();
    if (!xml || !this.core.selection.current) return undefined;
    const parents = new Map<string, string>();
    for (const { element } of this.core.selection.current.items)
      if (element.parentId) parents.set(element.id, element.parentId);
    this.stored = { xml, fileId: this.core.file.fileId, pageId: this.core.selection.current.pageId, parents, steps: 1 };
    return xml;
  }

  cutSelection(): string | undefined {
    if (!this.core.targets.editablePage()) return undefined;
    const xml = this.copySelection();
    if (!xml || !this.stored) return undefined;
    this.stored.steps = 0;
    this.core.elements.deleteSelection('Couper');
    return xml;
  }

  paste(text?: string): boolean {
    const editable = this.core.targets.editablePage();
    if (!editable) return false;
    if (text !== undefined && text.trim() !== this.stored?.xml.trim()) {
      if (!readClipboardModel(text)) return false;
      this.stored = { xml: text, pageId: '', parents: new Map(), steps: 1 };
    }
    const clipboard = this.stored;
    if (!clipboard) return false;
    const step = this.gridStep(editable.pageTree);
    const delta = { x: clipboard.steps * step, y: clipboard.steps * step };
    const samePage = clipboard.fileId === this.core.file.fileId && clipboard.pageId === editable.page.id;
    if (!this.pasteXml(clipboard.xml, delta, 'Coller', samePage ? clipboard.parents : undefined)) return false;
    clipboard.steps++;
    return true;
  }

  duplicateSelection(): void {
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || !selection) return;
    const xml = this.selectionClipboard();
    if (!xml) return;
    const parents = new Map<string, string>();
    for (const { element } of selection.items) if (element.parentId) parents.set(element.id, element.parentId);
    const step = this.gridStep(editable.pageTree);
    this.pasteXml(xml, { x: step, y: step }, 'Dupliquer', parents);
  }

  /** XML du presse-papier pour la sélection de la page courante. */
  private selectionClipboard(): string | undefined {
    const page = this.core.pages.getCurrentPage();
    const selection = this.core.selection.current;
    if (!page || !selection || selection.pageId !== page.id) return undefined;
    const pageTree = this.core.file.pageTreeOf(page.id);
    if (!pageTree || pageTree.encoding === 'unreadable') return undefined;
    return copyCells(
      pageTree,
      selection.items.map((item) => item.element.id),
      {
        origin: (id) => page.shapes.find((s) => s.id === id)?.bounds,
        edgeEnd: (id, end) => {
          const route = this.core.sceneView.sceneObject(id)?.userData.route as Point[] | undefined;
          return end === 'source' ? route?.[0] : route?.at(-1);
        },
      },
    );
  }

  /** Pas de décalage d'un collage : la grille de la page, sinon le paramètre `edit.pasteOffset`. */
  private gridStep(pageTree: PageTree): number {
    return gridSizeOf(pageTree) || this.core.settings.edit.pasteOffset;
  }

  /** Colle un contenu du presse-papier sur la page courante (une étape d'annulation) et le sélectionne. */
  private pasteXml(xml: string, delta: Point, label: string, parents?: Map<string, string>): boolean {
    const editable = this.core.targets.editablePage();
    const model = readClipboardModel(xml);
    if (!editable || !model) return false;
    this.core.gesture.endMove();
    const { page, pageTree } = editable;
    this.core.edits.recordEdit(label);
    // Données des modes de page (ex. flux et rang d'une flèche) : la copie ne les reprend pas.
    stripCellKeys(model, this.core.modes.pasteKeys());
    const ids = pasteCells(pageTree, model, {
      delta,
      parentOf: (id) => {
        const parentId = parents?.get(id);
        const parent = parentId ? page.shapes.find((s) => s.id === parentId) : undefined;
        return parent && pageTree.cells.has(parent.id) ? { id: parent.id, origin: parent.bounds } : undefined;
      },
    });
    // Le mode de la page reçoit les formes collées comme des ajouts (ex. couleur d'une région, sujet 239).
    this.core.modeFollowUps.shapesPlaced(page.id, ids);
    this.core.file.documentChanged([page.id]);
    const current = this.core.pages.getCurrentPage();
    const items = ids.flatMap((id): PickedElement[] => {
      const shape = current?.shapes.find((s) => s.id === id);
      if (shape) return [{ type: 'shape', element: shape }];
      const edge = current?.edges.find((e) => e.id === id);
      return edge ? [{ type: 'edge', element: edge }] : [];
    });
    this.core.selection.selectItems(items);
    return true;
  }
}
