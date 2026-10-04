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

/** Champ numérique d'un attribut spatial : validé à Entrée ou en quittant le champ ; vide = défaut. */
export function NumberField({
  label,
  title,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  title: string;
  value: number | undefined;
  placeholder: string;
  onCommit: (value: number | undefined) => void;
}) {
  const commit = (text: string) => {
    const trimmed = text.trim();
    const next = trimmed === '' ? undefined : Number(trimmed.replace(',', '.'));
    if (next === undefined || (Number.isFinite(next) && next >= 0)) onCommit(next);
  };
  return (
    <label className="field-row" title={title}>
      {label}
      <input
        type="number"
        min={0}
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
