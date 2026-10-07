import { useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { CommentSettings, ElementComment } from '../../engine';
import { useRichEditor } from '../richEditor';
import type { LabelContent, RichEditorHandle, SelectionFormat, ToggleMark } from '../richEditor';
import { commentCardStyle } from './CommentCard';

/**
 * Édition en place du commentaire d'un élément, dans l'encart en bas à gauche du rendu (affiché tant que dure
 * l'édition) : texte riche comme le texte d'une forme, mis en forme depuis le panneau de format (sur la sélection, ou
 * sur tout le commentaire). Entrée ajoute une ligne, Ctrl+Entrée (ou un clic ailleurs) valide, Échap annule.
 */
export function CommentEditor({
  comment,
  settings,
  onCommit,
  onCancel,
  onToggle,
  onSelectionFormat,
  handle,
}: {
  comment: ElementComment | undefined;
  settings: CommentSettings;
  onCommit: (content: LabelContent) => void;
  onCancel: () => void;
  onToggle: (mark: ToggleMark) => void;
  onSelectionFormat: (format: SelectionFormat | undefined) => void;
  handle: MutableRefObject<RichEditorHandle | undefined>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const handlers = useRichEditor({
    ref,
    box: ref,
    text: comment?.text ?? '',
    html: comment?.html,
    onCommit,
    onCancel,
    onToggle,
    onSelectionFormat,
    handle,
    baseStyle: () => commentTextStyle(settings),
    wholeWithoutSelection: true,
    selectAll: true,
  });
  return (
    <div className="comment-card visible editing" style={commentCardStyle(settings)}>
      <div
        ref={ref}
        className="comment-text"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Commentaire de l’élément"
        {...handlers}
      />
    </div>
  );
}

/** Format de tout le commentaire, en clés de style draw.io (pour le panneau de format) : celui des réglages. */
export function commentTextStyle(settings: CommentSettings): Record<string, string> {
  return { fontSize: String(settings.textSize), fontColor: settings.textColor };
}
