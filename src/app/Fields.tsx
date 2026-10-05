/** Champs du panneau contextuel, validés à Entrée ou en quittant le champ. */

/** Champ texte : validé à Entrée ou en quittant le champ, Échap annule. */
export function TextField({
  label,
  title,
  value,
  placeholder,
  readOnly,
  onCommit,
}: {
  label: string;
  title: string;
  value: string;
  placeholder?: string;
  readOnly?: boolean;
  onCommit: (text: string) => void;
}) {
  return (
    <label className="field-row" title={title}>
      {label}
      <input
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onBlur={(event) => {
          if (event.target.value !== value) onCommit(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          else if (event.key === 'Escape') {
            event.currentTarget.value = value;
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

/**
 * Champ numérique d'un attribut spatial : validé à Entrée ou en quittant le champ ; vide = défaut. Positif ou
 * nul, sauf `signed` (un décalage, par exemple).
 */
export function NumberField({
  label,
  title,
  value,
  placeholder,
  signed = false,
  onCommit,
}: {
  label: string;
  title: string;
  value: number | undefined;
  placeholder: string;
  signed?: boolean;
  onCommit: (value: number | undefined) => void;
}) {
  const commit = (text: string) => {
    const trimmed = text.trim();
    const next = trimmed === '' ? undefined : Number(trimmed.replace(',', '.'));
    if (next === undefined || (Number.isFinite(next) && (signed || next >= 0))) onCommit(next);
  };
  return (
    <label className="field-row" title={title}>
      {label}
      <input
        type="number"
        min={signed ? undefined : 0}
        step={1}
        defaultValue={value ?? ''}
        placeholder={placeholder}
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
    <label className="field-row" title={title}>
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
