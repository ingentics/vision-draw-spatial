import type { ReactNode } from 'react';
import { useTooltip } from './Tooltip';

/** Une option d'un groupe de choix : une icône (avec son infobulle), ou à défaut son nom écrit. */
export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Icône (un `<svg>`) ; absente : le nom est écrit dans le bouton. */
  icon?: ReactNode;
  /** Infobulle au survol : ce que fait le choix ; défaut : `label` pour une icône, rien pour un nom écrit. */
  title?: string;
}

/**
 * Choix par boutons liés (sujet 317) : un bouton par option, celui de la valeur enfoncé. Avec `inherited`, un bouton
 * « Défaut » en tête, enfoncé quand la valeur n'est pas écrite (`value` undefined) ; il dit la valeur héritée et le
 * cliquer efface la valeur (`onChange(undefined)`). Une valeur écrite hors des options (version plus récente,
 * draw.io) n'enfonce aucun bouton, encadre le groupe en pointillé et est dite dans l'infobulle de chaque bouton.
 * Infobulles par `useTooltip` (comme les noms des formes de la palette). `columns` : boutons en grille.
 */
export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  inherited,
  inheritedFrom,
  unknownLabel = (value) => `Inconnu (${value})`,
  columns,
  disabled,
  className,
  onChange,
}: {
  /** Nom du groupe (lecteur d'écran). */
  label: string;
  value: string | undefined;
  options: ReadonlyArray<ChoiceOption<T>>;
  /** Nom de la valeur héritée : présent, le groupe commence par « Défaut ». */
  inherited?: string;
  /** D'où vient la valeur héritée (« la page », « les paramètres »), pour l'infobulle de « Défaut ». */
  inheritedFrom?: string;
  /** Texte d'une valeur inconnue, dans les infobulles des boutons. */
  unknownLabel?: (value: string) => string;
  columns?: number;
  disabled?: boolean;
  className?: string;
  onChange: (value: T | undefined) => void;
}) {
  const unknown = value !== undefined && !options.some((option) => option.value === value);
  const { hover, tooltip } = useTooltip();
  const button = (key: string, checked: boolean, content: ReactNode, tip: string | undefined, pick: () => void) => (
    <button
      key={key}
      type="button"
      role="radio"
      className={typeof content === 'string' ? 'group-button' : 'group-button choice-icon'}
      aria-checked={checked}
      aria-pressed={checked}
      aria-label={tip}
      disabled={disabled}
      {...hover(tip && (unknown ? `${tip}\nValeur écrite : ${unknownLabel(value)}` : tip))}
      onClick={pick}
    >
      {content}
    </button>
  );
  return (
    <span
      className={['button-group', columns && 'button-grid', unknown && 'unknown-choice', className]
        .filter(Boolean)
        .join(' ')}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, auto)` } : undefined}
      role="radiogroup"
      aria-label={label}
    >
      {inherited !== undefined &&
        button(
          '',
          value === undefined,
          'Défaut',
          `Défaut : rien n’est écrit, ${inheritedFrom ? `suit ${inheritedFrom}` : 'valeur héritée'} (${inherited})`,
          () => onChange(undefined),
        )}
      {options.map((option) =>
        button(
          option.value,
          value === option.value,
          option.icon ?? option.label,
          option.title ?? (option.icon ? option.label : undefined),
          () => onChange(option.value),
        ),
      )}
      {tooltip}
    </span>
  );
}
