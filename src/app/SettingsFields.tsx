import { ChoiceGroup } from './ChoiceGroup';
import type { ChoiceOption } from './ChoiceGroup';

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

export function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={disabled ? 'field toggle disabled' : 'field toggle'}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

/** Adresse saisie librement : validée à Entrée ou en quittant le champ, Échap annule (refusée si pas http(s)). */
export function UrlField({
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
    <label className={disabled ? 'field disabled' : 'field'}>
      <span>{label}</span>
      <input
        key={value}
        type="url"
        className="url-input"
        defaultValue={value}
        placeholder="http://localhost:8080"
        disabled={disabled}
        spellCheck={false}
        onBlur={(event) => {
          const next = event.target.value.trim();
          if (next !== value) onChange(next);
          // Adresse refusée : le champ reprend la valeur gardée.
          event.target.value = value;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.value = value;
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

/** Choix par boutons, en texte (`[valeur, nom]`) ou en icônes (`ChoiceOption`, nom en infobulle). */
export function Choice<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<[T, string] | ChoiceOption<T>>;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className={disabled ? 'field disabled' : 'field'}>
      <span className="field-row">{label}</span>
      <ChoiceGroup
        className="choice"
        label={label}
        value={value}
        options={options.map((option) => (Array.isArray(option) ? { value: option[0], label: option[1] } : option))}
        disabled={disabled}
        onChange={(next) => next && onChange(next)}
      />
    </div>
  );
}
