import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Texte modifiable sur place (nom d'une page, titre d'un flux…) : un bouton qui affiche la valeur et devient un champ
 * au clic ou au double-clic. Entrée ou quitter le champ : valider ; Échap : annuler. La valeur est validée sans les
 * espaces autour ; une valeur vide est refusée (l'ancienne revient), une valeur inchangée n'est pas transmise. Le champ
 * ne se voit pas (`.inline-edit-input` : sans cadre ni fond, à la largeur de son texte) : seuls le curseur et la
 * sélection montrent la saisie.
 */
export function InlineEdit({
  value,
  onCommit,
  label,
  trigger = 'click',
  onClick,
  title,
  className,
  inputClassName,
  children,
}: {
  value: string;
  /** Nouvelle valeur (sans espaces autour, non vide, différente) ; absent : pas d'édition. */
  onCommit?: (value: string) => void;
  /** Nom accessible du champ. */
  label: string;
  /** Geste qui ouvre l'édition ; avec `doubleClick`, le clic simple reste `onClick` (ex. choisir l'onglet). */
  trigger?: 'click' | 'doubleClick';
  onClick?: () => void;
  title?: string;
  className?: string;
  inputClassName?: string;
  /** Affichage hors édition (défaut : la valeur). */
  children?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const cancelled = useRef(false);
  if (editing && onCommit) {
    return (
      <input
        className={inputClassName ? `inline-edit-input ${inputClassName}` : 'inline-edit-input'}
        defaultValue={value}
        aria-label={label}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => {
          const next = event.currentTarget.value.trim();
          setEditing(false);
          if (!cancelled.current && next && next !== value) onCommit(next);
        }}
        onKeyDown={(event) => {
          // Les touches restent au champ (pas de raccourci de la vue pendant la saisie).
          event.stopPropagation();
          if (event.key === 'Enter') event.currentTarget.blur();
          else if (event.key === 'Escape') {
            cancelled.current = true;
            event.currentTarget.blur();
          }
        }}
      />
    );
  }
  const start = () => {
    cancelled.current = false;
    setEditing(true);
  };
  return (
    <button
      type="button"
      className={className}
      data-tip={title}
      onClick={trigger === 'click' && onCommit ? start : onClick}
      onDoubleClick={trigger === 'doubleClick' && onCommit ? start : undefined}
    >
      {children ?? value}
    </button>
  );
}
