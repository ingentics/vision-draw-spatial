import type { ElementComment } from '../../engine';

/**
 * Commentaire d'un élément, flèche ou forme (montré en bas à gauche du rendu au survol) : aperçu et bouton Modifier,
 * qui le met en édition en place dans l'encart du rendu.
 */
export function CommentField({ comment, onEdit }: { comment: ElementComment | undefined; onEdit: () => void }) {
  const text = comment?.text ?? '';
  return (
    <div className="field-row">
      Commentaire
      <span className="field-value label-value" title={text}>
        {text.replace(/\n/g, ' ') || 'aucun'}
      </span>
      <button type="button" className="button" title="Modifier le commentaire, montré au survol" onClick={onEdit}>
        Modifier
      </button>
    </div>
  );
}
