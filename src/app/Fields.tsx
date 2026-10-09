import { useEffect, useRef, type KeyboardEvent } from 'react';

/** Champs du panneau contextuel, validés à Entrée ou en quittant le champ. */

/**
 * Champ texte : validé à Entrée ou en quittant le champ (ou à chaque frappe avec `onLive`), Échap annule. Hors
 * saisie, le champ suit `value` (annulation).
 */
export function TextField({
  label,
  title,
  value,
  placeholder,
  multiline,
  monospace,
  readOnly,
  onLive,
  onCommit,
}: {
  label: string;
  title: string;
  value: string;
  placeholder?: string;
  /** Zone de texte sur plusieurs lignes : Entrée va à la ligne, ⌘ / Ctrl + Entrée valide. */
  multiline?: boolean;
  /** Police à chasse fixe, sans retour automatique (zone de texte seulement). */
  monospace?: boolean;
  readOnly?: boolean;
  /** Appelé à chaque frappe, pour un réglage en direct ; Échap y renvoie la valeur d'avant le passage. */
  onLive?: (text: string) => void;
  onCommit: (text: string) => void;
}) {
  const input = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  // Valeur à l'entrée dans le champ : Échap y revient, la validation compare avec elle.
  const initial = useRef(value);
  useEffect(() => {
    if (input.current && document.activeElement !== input.current) {
      input.current.value = value;
      initial.current = value;
    }
  }, [value]);
  const props = {
    ref: input,
    defaultValue: value,
    placeholder,
    readOnly,
    onFocus: () => {
      initial.current = value;
    },
    onInput: (event: { currentTarget: { value: string } }) => onLive?.(event.currentTarget.value),
    onBlur: (event: { target: { value: string } }) => {
      if (event.target.value !== initial.current) onCommit(event.target.value);
      initial.current = event.target.value;
    },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement & HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (!multiline || event.metaKey || event.ctrlKey)) event.currentTarget.blur();
      else if (event.key === 'Escape') {
        event.currentTarget.value = initial.current;
        onLive?.(initial.current);
        event.currentTarget.blur();
      }
    },
  };
  return (
    <label className={multiline ? 'field-row multiline' : 'field-row'} data-tip={title}>
      {label}
      {multiline ? (
        <textarea
          // Au plus 16 lignes de haut ; au-delà, ascenseurs.
          rows={Math.min(16, Math.max(3, value.split('\n').length + 1))}
          {...(monospace && { wrap: 'off', className: 'mono' })}
          {...props}
        />
      ) : (
        <input type="text" {...props} />
      )}
    </label>
  );
}

/**
 * Champ numérique d'un attribut spatial : validé à Entrée ou en quittant le champ ; vide = défaut. Positif ou
 * nul, sauf `signed` (un décalage, par exemple). `onLive` : appelé à chaque saisie d'une valeur complète
 * (frappe, flèches du champ), pour un réglage en direct. Hors saisie, le champ suit `value` (annulation).
 */
export function NumberField({
  label,
  title,
  value,
  placeholder,
  signed = false,
  onLive,
  onCommit,
}: {
  label: string;
  title: string;
  value: number | undefined;
  placeholder: string;
  signed?: boolean;
  onLive?: (value: number) => void;
  onCommit: (value: number | undefined) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (input.current && document.activeElement !== input.current) input.current.value = String(value ?? '');
  }, [value]);
  const parse = (text: string) => {
    const trimmed = text.trim();
    const next = trimmed === '' ? undefined : Number(trimmed.replace(',', '.'));
    return next === undefined || (Number.isFinite(next) && (signed || next >= 0)) ? { value: next } : undefined;
  };
  const commit = (text: string) => {
    const parsed = parse(text);
    if (parsed) onCommit(parsed.value);
  };
  return (
    <label className="field-row" data-tip={title}>
      {label}
      <input
        type="number"
        min={signed ? undefined : 0}
        step={1}
        ref={input}
        defaultValue={value ?? ''}
        placeholder={placeholder}
        onInput={(event) => {
          const parsed = onLive && parse(event.currentTarget.value);
          if (parsed?.value !== undefined) onLive!(parsed.value);
        }}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
    </label>
  );
}

/** Liste de choix : validée au changement. Une option peut porter une pastille de couleur (montrée à côté). */
export function SelectField({
  label,
  title,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  title: string;
  value: string;
  options: Array<{ value: string; label: string; color?: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const color = options.find((option) => option.value === value)?.color;
  return (
    <label className="field-row" data-tip={title}>
      {label}
      <span className="select-with-swatch">
        {color && <span className="color-dot" style={{ background: color }} aria-hidden="true" />}
        <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
