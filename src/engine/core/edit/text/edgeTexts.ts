import {
  cellLabelValue,
  setLabelPlacement,
  setCellLabel,
  setCellRichLabel,
  setCellStyleValue,
} from '../../../format/edit';
import { addEdgeLabelCell, removeCells } from '../../../format/create';
import { anchorOf, edgeTextLayout, edgeTexts, endLabelOf, flipTarget } from '../../../edit/edgeLabels';
import type { EdgeTextLayout, EndTextGap, EdgeEnd } from '../../../edit/edgeLabels';
import type { Point } from '../../../model/types';
import { middleTextAlong } from '../../../render/edges/edge';
import type { TextAlong } from '../../../render/textPath';
import type { EdgeTextAnchor, LabelEditRequest } from '../../types';
import type { EngineCore } from '../../EngineCore';
import { styleFlag } from '../../../model/styleValues';

/** Textes d'une flèche (label, début, fin, placés ailleurs) : édition, création, position, côté du trait. */
export class EdgeTexts {
  constructor(private readonly core: EngineCore) {}

  editEdgeText(edgeId: string, cellId: string): void {
    if (cellId === edgeId) {
      this.core.labelEditor.editLabel(edgeId);
      return;
    }
    const editable = this.core.targets.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === edgeId);
    const label = edge?.labels.find((l) => l.id === cellId);
    const screen = label && this.core.labelEditor.labelEditScreen(edgeId, undefined, cellId);
    if (!editable || !edge || !label || !screen) return;
    const anchor = anchorOf(label.placement);
    this.core.labelEditor.startLabelEdit({
      pageId: editable.page.id,
      elementId: edgeId,
      end: anchor === 'middle' ? undefined : anchor,
      labelCellId: cellId,
      text: label.label,
      screen,
      styleCellId: cellId,
      style: label.style,
      html: styleFlag(label.style, 'html') ? cellLabelValue(editable.pageTree, cellId) : undefined,
      scale: this.core.labelEditor.textScale(edgeId),
      onEdge: true,
      ...this.core.labelEditor.labelEditBackdrop(label.style, true),
    });
  }

  setEdgeText(edgeId: string, cellId: string, text: string, html?: string): void {
    if (cellId === edgeId) {
      this.core.textEdits.setLabel(edgeId, text, html);
      return;
    }
    const editable = this.core.targets.editablePage();
    const label = editable?.page.edges.find((e) => e.id === edgeId)?.labels.find((l) => l.id === cellId);
    if (!editable || !label) return;
    const value = text.trim() === '' ? '' : text;
    const rich = value ? html : undefined;
    const unchanged =
      rich === undefined ? label.label === value && !label.rich : cellLabelValue(editable.pageTree, cellId) === rich;
    if (unchanged) return;
    this.core.edits.recordEdit('Texte');
    if (!value) removeCells(editable.pageTree, [cellId]);
    else if (rich === undefined) setCellLabel(editable.pageTree, cellId, value);
    else setCellRichLabel(editable.pageTree, cellId, rich);
    this.core.file.documentChanged([editable.page.id]);
  }

  moveEditedText(screen: Point): void {
    const editing = this.core.labelEditor.editing;
    const page = this.core.pages.getCurrentPage();
    const cellId = editing?.styleCellId;
    if (!editing?.onEdge || !cellId || !page || editing.pageId !== page.id) return;
    const edge = page.edges.find((e) => e.id === editing.elementId);
    if (!edge) return;
    let drag = this.core.gesture.drag;
    if (drag?.kind !== 'label') {
      const current = cellId === edge.id ? edge.labelPlacement : edge.labels.find((l) => l.id === cellId)?.placement;
      if (!current) return;
      drag = { kind: 'label', pageId: page.id, edgeId: edge.id, cellId, offset: current.offset, started: false };
      this.core.gesture.startDrag(drag);
    }
    this.core.labelDrags.follow(page, drag, screen);
    this.core.labelEditor.hideEditedLabel();
    this.core.labelEditor.relocateLabelEdit();
  }

  endEditedTextMove(): void {
    if (this.core.gesture.drag?.kind !== 'label') return;
    this.core.gesture.endMove();
    this.core.labelEditor.relocateLabelEdit();
  }

  setEdgeTextAnchor(edgeId: string, cellId: string, anchor: EdgeTextAnchor): void {
    const editable = this.core.targets.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === edgeId);
    if (!editable || !edge || !edgeTexts(edge).some((text) => text.cellId === cellId)) return;
    const route = this.core.sceneView.sceneObject(edgeId)?.userData.route as Point[] | undefined;
    if (!route?.length) return;
    // Même configuration qu'un texte créé à cet endroit : placement et alignement.
    const layout = edgeTextLayout(route, anchor, false, this.endTextGap());
    this.core.edits.recordEdit('Position du texte');
    setLabelPlacement(editable.pageTree, cellId, layout.placement);
    const centered = anchor === 'middle';
    setCellStyleValue(editable.pageTree, cellId, 'align', centered ? undefined : layout.align);
    setCellStyleValue(editable.pageTree, cellId, 'verticalAlign', centered ? undefined : layout.verticalAlign);
    this.core.file.documentChanged([editable.page.id]);
  }

  /** Écarts du placement par défaut des textes de début / fin (paramètres). */
  endTextGap(): EndTextGap {
    return {
      along: this.core.settings.shapes.edgeEndTextGapAlong,
      across: this.core.settings.shapes.edgeEndTextGapAcross,
    };
  }

  /** Configuration par défaut d'un texte de début / fin d'une flèche de la page courante. */
  endTextLayout(edgeId: string, end: EdgeEnd, flipped = false): EdgeTextLayout {
    const route = (this.core.sceneView.sceneObject(edgeId)?.userData.route as Point[] | undefined) ?? [];
    return edgeTextLayout(route, end, flipped, this.endTextGap());
  }

  /** Texte du milieu d'une flèche qui la suit : où ses lettres sont posées ; undefined s'il est horizontal. */
  followedText(edgeId: string): TextAlong | undefined {
    const edge = this.core.pages.getCurrentPage()?.edges.find((e) => e.id === edgeId);
    return edge && middleTextAlong(edge, this.core.sceneView.sceneObject(edgeId)?.userData.path as Point[] | undefined);
  }

  flipEditedText(): void {
    const editing = this.core.labelEditor.editing;
    const editable = this.core.targets.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === editing?.elementId);
    const route = edge && (this.core.sceneView.sceneObject(edge.id)?.userData.route as Point[] | undefined);
    if (!editing?.onEdge || !editing.end || !editable || !edge || !route?.length) return;
    const child = editing.labelCellId ? edge.labels.find((l) => l.id === editing.labelCellId) : undefined;
    let next: LabelEditRequest;
    if (child) {
      const target = flipTarget(route, editing.end, child.placement, child.style, this.endTextGap());
      if (!target) return;
      this.core.edits.recordEdit('Côté du texte');
      setLabelPlacement(editable.pageTree, child.id, target.layout.placement);
      setCellStyleValue(editable.pageTree, child.id, 'align', target.layout.align);
      setCellStyleValue(editable.pageTree, child.id, 'verticalAlign', target.layout.verticalAlign);
      this.core.file.documentChanged([editable.page.id]);
      const style = this.core.pages
        .getCurrentPage()
        ?.edges.find((e) => e.id === edge.id)
        ?.labels.find((l) => l.id === child.id)?.style;
      next = { ...editing, style: style ?? editing.style };
    } else {
      const flipped = !editing.flipped;
      const layout = edgeTextLayout(route, editing.end, flipped, this.endTextGap());
      next = {
        ...editing,
        flipped,
        style: { ...editing.style, align: layout.align, verticalAlign: layout.verticalAlign },
      };
    }
    const screen = this.core.labelEditor.labelEditScreen(next.elementId, next.end, next.labelCellId, next.flipped);
    this.core.labelEditor.updateEditing(
      this.core.labelEditor.withAngle(this.core.labelEditor.withFlip({ ...next, screen: screen ?? next.screen })),
    );
  }

  /** Style d'un texte de début / fin créé : taille et couleur (paramètres), alignement de sa configuration. */
  endTextStyle(layout: EdgeTextLayout): Record<string, string> {
    return {
      fontSize: String(this.core.settings.shapes.edgeEndTextSize),
      fontColor: this.core.settings.shapes.edgeEndTextColor,
      align: layout.align,
      verticalAlign: layout.verticalAlign,
    };
  }

  setEdgeEndLabel(edgeId: string, end: EdgeEnd, text: string, html?: string, flipped = false): void {
    const editable = this.core.targets.editablePage();
    const edge = editable?.page.edges.find((e) => e.id === edgeId);
    if (!editable || !edge) return;
    const current = endLabelOf(edge, end);
    const value = text.trim() === '' ? '' : text;
    const rich = value ? html : undefined;
    const unchanged =
      rich === undefined
        ? (current?.label ?? '') === value && !current?.rich
        : current !== undefined && cellLabelValue(editable.pageTree, current.id) === rich;
    if (unchanged) return;
    this.core.edits.recordEdit(end === 'start' ? 'Texte de début' : 'Texte de fin');
    const write = (id: string) =>
      rich === undefined ? setCellLabel(editable.pageTree, id, value) : setCellRichLabel(editable.pageTree, id, rich);
    if (!value && current) removeCells(editable.pageTree, [current.id]);
    else if (current) write(current.id);
    else {
      // Texte de début / fin créé : configuration par défaut d'après le tracé (contre son bout, côté et
      // alignement qui l'éloignent de la forme), plus petit et grisé (paramètres).
      const layout = this.endTextLayout(edgeId, end, flipped);
      const id = addEdgeLabelCell(editable.pageTree, edgeId, { value: '', position: layout.placement.position });
      setLabelPlacement(editable.pageTree, id, layout.placement);
      for (const [key, value] of Object.entries(this.endTextStyle(layout))) {
        setCellStyleValue(editable.pageTree, id, key, value);
      }
      write(id);
    }
    this.core.file.documentChanged([editable.page.id]);
  }
}
