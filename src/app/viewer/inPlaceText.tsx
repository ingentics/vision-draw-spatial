import { useRef, useState } from 'react';
import type { CommentEditRequest, ElementComment, Engine, LabelEditRequest, Settings } from '../../engine';
import { labelPlacePatch } from '../../engine';
import { CommentCard, CommentEditor, commentTextStyle } from '../comment';
import { LabelEditor } from '../LabelEditor';
import type { RichEditorHandle, SelectionFormat } from '../LabelEditor';
import { wholeTextChange } from '../TextFormat';
import type { TextAction, TextEdit } from '../TextFormat';

/**
 * Édition de texte en place (texte d'un élément, commentaire) : éditeur affiché sur le rendu, format de sa
 * sélection, et ce qu'en montre le panneau de format (`textEdit`).
 */
export function useInPlaceText({
  engine,
  labelEdit,
  commentEdit,
  settings,
}: {
  engine: Engine | undefined;
  labelEdit: LabelEditRequest | undefined;
  commentEdit: CommentEditRequest | undefined;
  settings: Settings;
}) {
  /** Éditeur de texte en place (commandes du panneau de format) et format de sa sélection. */
  const editorHandle = useRef<RichEditorHandle | undefined>(undefined);
  const [selectionFormat, setSelectionFormat] = useState<SelectionFormat>();
  /** Taille obtenue par « Ajuster » dans le texte en cours d'édition (panneau de format). */
  const [fittedSize, setFittedSize] = useState<number>();

  /**
   * Format du texte en cours d'édition en place (panneau latéral, Ctrl+B / I / U) : sur la sélection
   * dans le texte (mise en forme partielle, écrite à la validation), sinon sur tout le texte (clés du
   * style de la cellule, et les mises en forme partielles de même nature sont retirées).
   */
  const formatText = (action: TextAction) => {
    const editor = editorHandle.current;
    const cellId = labelEdit?.styleCellId;
    if (action.type === 'align') {
      if (cellId) engine?.setTextFormat(cellId, { [action.key]: action.value });
      return;
    }
    if (action.type === 'place') {
      if (cellId) engine?.setTextFormat(cellId, labelPlacePatch(action.place));
      return;
    }
    if (action.type === 'fit') {
      if (cellId) engine?.setTextFormat(cellId, { fitText: action.on ? '1' : undefined });
      return;
    }
    if (editor?.hasSelection()) {
      if (action.type === 'toggle') editor.toggle(action.mark);
      else if (action.type === 'size') editor.setMarks({ fontSize: action.size });
      else if (action.type === 'color') editor.setMarks({ color: action.color ?? null });
      else
        editor.setMarks({
          fontSize: action.preset.fontSize,
          color: action.preset.fontColor ?? null,
          fontFamily: action.preset.fontFamily ?? null,
        });
      return;
    }
    if (!cellId || !labelEdit) return;
    const { patch, clear } = wholeTextChange(action, labelEdit.style);
    editor?.clear(clear);
    engine?.setTextFormat(cellId, patch);
  };

  const onOwner = () => editorHandle.current?.commit();
  const textEdit: TextEdit | undefined =
    // Texte brut (sujet 258) : pas de panneau de format.
    labelEdit && !labelEdit.plain
      ? {
          style: labelEdit.style,
          selection: selectionFormat,
          canFormat: labelEdit.styleCellId !== undefined,
          onEdge: labelEdit.onEdge,
          fittedSize,
          presets: settings.styles.text,
          onAction: formatText,
          onOwner,
        }
      : labelEdit || commentEdit?.part !== undefined
        ? undefined
        : commentEdit && {
            // Commentaire : le format de tout le texte est celui des réglages, les commandes du panneau
            // portent sur la sélection ou sur tout le commentaire (`CommentEditor`).
            style: commentTextStyle(settings.comment),
            selection: selectionFormat,
            canFormat: true,
            onEdge: commentEdit.onEdge,
            comment: true,
            presets: settings.styles.text,
            onAction: formatText,
            onOwner,
          };

  return { editorHandle, setSelectionFormat, setFittedSize, formatText, textEdit };
}

type InPlaceText = ReturnType<typeof useInPlaceText>;

/** Éditeur du texte d'un élément, posé sur le rendu ; la validation écrit le texte là où il a été ouvert. */
export function ViewerLabelEditor({
  engine,
  request,
  text,
  onClose,
}: {
  engine: Engine | undefined;
  request: LabelEditRequest;
  text: InPlaceText;
  onClose: () => void;
}) {
  return (
    <LabelEditor
      key={`${request.pageId}:${request.elementId}:${request.end ?? ''}:${request.part ?? ''}`}
      request={request}
      handle={text.editorHandle}
      onMoveText={request.onEdge && request.styleCellId ? (screen) => engine?.moveEditedText(screen) : undefined}
      onMoveTextEnd={() => engine?.endEditedTextMove()}
      onFlip={() => engine?.flipEditedText()}
      onToggle={(mark) => text.formatText({ type: 'toggle', mark })}
      onSelectionFormat={text.setSelectionFormat}
      onFitSize={text.setFittedSize}
      onTextInput={request.onEdge ? undefined : (value) => engine?.previewEditedLabel(value)}
      onCommit={({ text: value, html }) => {
        onClose();
        engine?.closeLabelEdit();
        if (request.part !== undefined) engine?.setPartText(request.elementId, request.part, value);
        else if (request.labelCellId) engine?.setEdgeText(request.elementId, request.labelCellId, value, html);
        else if (request.end) engine?.setEdgeEndLabel(request.elementId, request.end, value, html, request.flipped);
        else engine?.setLabel(request.elementId, value, request.plain ? undefined : html);
        engine?.focusCanvas();
      }}
      onCancel={() => {
        onClose();
        engine?.closeLabelEdit();
        engine?.focusCanvas();
      }}
    />
  );
}

/** Commentaire en cours d'édition dans l'encart du rendu, sinon celui de l'élément survolé. */
export function ViewerComment({
  engine,
  request,
  hovered,
  settings,
  text,
  onClose,
}: {
  engine: Engine | undefined;
  request: CommentEditRequest | undefined;
  hovered: ElementComment | undefined;
  settings: Settings['comment'];
  text: InPlaceText;
  onClose: () => void;
}) {
  if (!request) return <CommentCard comment={hovered} settings={settings} />;
  return (
    <CommentEditor
      key={`${request.elementId}:${request.part ?? ''}`}
      comment={request.comment}
      plain={request.part !== undefined}
      settings={settings}
      handle={text.editorHandle}
      onToggle={(mark) => text.formatText({ type: 'toggle', mark })}
      onSelectionFormat={text.setSelectionFormat}
      onCommit={(content) => {
        onClose();
        // Commentaire d'une partie (ex. champ, sujet 262) : texte brut, écrit par le mode.
        if (request.part !== undefined) engine?.setPartComment(request.elementId, request.part, content.text);
        else engine?.setComment(request.elementId, content);
        if (request.fromNavigation) engine?.clearSelection();
        engine?.focusCanvas();
      }}
      onCancel={() => {
        onClose();
        if (request.fromNavigation) engine?.clearSelection();
        engine?.focusCanvas();
      }}
    />
  );
}
