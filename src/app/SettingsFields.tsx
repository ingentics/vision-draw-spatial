/** Champs du panneau des paramètres partagés avec les sections rangées à part (ex. commentaires). */

/** Curseur d'un réglage numérique, avec sa valeur formatée. */
export function Slider({
  label,
  value,
  limits,
  format,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  limits: { min: number; max: number; step: number };
  format: (value: number) => string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={disabled ? 'field disabled' : 'field'}>
      <span className="field-row">
        <span>{label}</span>
        <span className="field-value">{format(value)}</span>
      </span>
      <input
        type="range"
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

/** Couleur d'un réglage (#rrggbb). */
export function ColorField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={disabled ? 'field color-field disabled' : 'field color-field'}>
      <span>{label}</span>
      <span className="field-row">
        <span className="field-value">{value}</span>
        <input type="color" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}
