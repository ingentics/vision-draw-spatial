import { cellLabelValue, setCellLabel, setCellRichLabel, setCellStyleValue } from '../../../format/cellEdits';
import type { EngineCore } from '../../EngineCore';
import { byId, elementOf } from '../../../model/pageIndex';
import { emptyIfBlank } from '../../../format/labelText';

/** Texte et format du texte d'un élément de la page courante. */
export class TextEdits {
  constructor(private readonly core: EngineCore) {}

  setTextFormat(cellId: string, patch: Record<string, string | undefined>): void {
    const editable = this.core.targets.editablePage();
    if (!editable || !editable.pageTree.cells.get(cellId)?.cell) return;
    const page = editable.page;
    const labels = page.edges.flatMap((e) => e.labels);
    const style = elementOf(page, cellId)?.style ?? byId(labels, cellId)?.style;
    if (!style) return;
    const changes = Object.entries(patch).filter(([key, value]) => style[key] !== value);
    if (changes.length === 0) return;
    this.core.edits.recordEdit('Format du texte');
    for (const [key, value] of changes) setCellStyleValue(editable.pageTree, cellId, key, value);
    this.core.file.documentChanged([page.id]);
    const editing = this.core.labelEditor.editing;
    if (editing?.styleCellId === cellId) {
      const next = { ...style, ...Object.fromEntries(changes) };
      for (const [key, value] of changes) if (value === undefined) delete next[key];
      this.core.labelEditor.updateEditing({ ...editing, style: next as Record<string, string> });
      // Position du texte changée : l'éditeur suit le texte à sa nouvelle place.
      this.core.labelEditor.relocateLabelEdit();
    }
  }

  setLabel(elementId: string, given: string, givenHtml?: string): void {
    const text = emptyIfBlank(given);
    const html = text ? givenHtml : undefined;
    const editable = this.core.targets.editablePage();
    const element = editable && elementOf(editable.page, elementId);
    if (!editable || !element) return;
    if (
      html === undefined
        ? element.label === text && !element.rich
        : cellLabelValue(editable.pageTree, elementId) === html
    )
      return;
    this.core.edits.recordEdit('Texte');
    if (html === undefined) setCellLabel(editable.pageTree, elementId, text);
    else setCellRichLabel(editable.pageTree, elementId, html);
    this.core.modeFollowUps.elementRelabeled(editable.page.id, elementId);
    this.core.file.documentChanged([editable.page.id]);
  }
}
