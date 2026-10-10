import { useState } from 'react';
import { choiceDisplay } from '../engine';
import type { Field, FieldOption, FieldValue } from '../engine';
import { ChoiceGroup } from './ChoiceGroup';
import type { ChoiceOption } from './ChoiceGroup';
import { NumberField, SelectField, TextField } from './Fields';
import { ModeIcon } from './ModeIcon';
import { Choice, ColorField, Slider, Toggle, UrlField } from './SettingsFields';

/**
 * Champ déclaré par un plugin (sujet 391) : réglage d'une forme, d'un mode, ou réglage global d'un plugin, rendu d'après
 * le schéma commun (`Field`). Chaque endroit garde sa mise en page autour et convertit la valeur de sa cible.
 */

/** Numéro du prochain passage dans un champ en direct (clé de fusion des frappes, unique pour toute la session). */
let nextPass = 0;

type DeclaredFieldProps = {
  field: Field;
  /**
   * Présentation : `panel` (panneau contextuel : case avec infobulle, choix nommés en liste) ou `settings` (sous-page
   * des paramètres : case sans infobulle, choix en boutons).
   */
  layout: 'panel' | 'settings';
  /** Valeur typée : booléen d'une case, nombre (undefined = défaut), texte d'un champ texte, d'un choix… */
  value: FieldValue | undefined;
  /** Cible du champ (ex. id de la forme) : le champ est recréé pour une autre cible, et les frappes ne fusionnent pas. */
  identity?: string;
  /** Affiché sans être modifiable (lecture seule, ou réglage dont un autre réglage empêche le choix). */
  disabled?: boolean;
  /** Valeur écrite (undefined = vide) ; `merge` : réglage en direct, une étape d'annulation par passage dans le champ. */
  onChange: (value: FieldValue | undefined, merge?: string) => void;
};

export function DeclaredField(props: DeclaredFieldProps) {
  const { help } = props.field;
  return help ? (
    <>
      <FieldControl {...props} />
      <p className="panel-hint">{help}</p>
    </>
  ) : (
    <FieldControl {...props} />
  );
}

/** Le champ lui-même, selon son type. */
function FieldControl({ field, layout, value, identity = '', disabled = false, onChange }: DeclaredFieldProps) {
  // Saisie en direct (sujets 271, 306) : une étape d'annulation par passage dans le champ, et le champ recréé ensuite
  // pour montrer la valeur retenue (un libellé vidé peut être refusé).
  const [pass, setPass] = useState(() => nextPass++);
  const { key, label } = field;
  const title = field.title ?? label;
  const text = typeof value === 'string' ? value : '';
  switch (field.type) {
    case 'toggle':
      return layout === 'settings' ? (
        <Toggle label={label} checked={value === true} disabled={disabled || undefined} onChange={onChange} />
      ) : (
        <label className="field toggle" data-tip={title}>
          <input
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(event) => onChange(event.target.checked)}
          />
          {label}
        </label>
      );
    case 'number': {
      const number = typeof value === 'number' ? value : undefined;
      const { min, max, step, unit, zero } = field;
      // Bornes et pas déclarés : curseur ; sinon champ numérique (vide = défaut).
      return min !== undefined && max !== undefined && step !== undefined ? (
        <Slider
          label={label}
          value={number ?? min}
          limits={{ min, max, step }}
          format={(v) =>
            v === 0 && zero
              ? zero
              : unit === '%'
                ? `${Math.round(v * 100)} %`
                : `${v.toLocaleString('fr-FR')} ${unit ?? ''}`.trim()
          }
          disabled={disabled || undefined}
          onChange={onChange}
        />
      ) : (
        <NumberField
          key={`${identity}:${key}:${number ?? ''}`}
          label={label}
          title={title}
          value={number}
          placeholder={field.placeholder ?? ''}
          onCommit={onChange}
        />
      );
    }
    case 'text': {
      const merge = `${identity}:${key}:${pass}`;
      return field.live ? (
        // Pas de valeur dans la clé : le champ garde le curseur pendant la saisie.
        <TextField
          key={merge}
          label={label}
          title={title}
          value={text}
          placeholder={field.placeholder}
          multiline={field.multiline}
          monospace={field.monospace}
          readOnly={disabled}
          onLive={(next) => onChange(next.trim() || undefined, merge)}
          onCommit={(next) => {
            onChange(next.trim() || undefined, merge);
            setPass(nextPass++);
          }}
        />
      ) : (
        <TextField
          key={`${identity}:${key}:${text}`}
          label={label}
          title={title}
          value={text}
          placeholder={field.placeholder}
          multiline={field.multiline}
          monospace={field.monospace}
          readOnly={disabled}
          onCommit={(next) => onChange(next.trim() || undefined)}
        />
      );
    }
    case 'button':
      return (
        <button
          type="button"
          className="button wide-button"
          data-tip={title}
          disabled={disabled}
          onClick={() => onChange(undefined)}
        >
          {label}
        </button>
      );
    case 'choice': {
      const drawn = choiceDisplay(field.options) === 'buttons';
      // Choix nommés en boutons écrits (sujet 515) : libellé au-dessus, il peut être long (une question).
      if (field.buttons)
        return (
          <div className="field">
            <span data-tip={title}>{label}</span>
            <ChoiceGroup
              label={label}
              value={text}
              options={field.options.map(({ value, label, title }) => ({ value, label, title }))}
              disabled={disabled}
              onChange={(next) => onChange(next || undefined)}
            />
          </div>
        );
      if (layout === 'settings')
        return (
          <Choice
            label={label}
            value={text}
            options={field.options.map((option) =>
              drawn ? choiceOf(option) : { value: option.value, label: option.label, title: option.title },
            )}
            disabled={disabled || undefined}
            onChange={onChange}
          />
        );
      // Choix tous dessinés (icône ou couleur) : boutons ; sinon (choix nommés, nombreux) : liste (sujet 319).
      return drawn ? (
        <div className="field-row">
          <span data-tip={title}>{label}</span>
          <ChoiceGroup
            label={label}
            value={text}
            options={field.options.map(choiceOf)}
            disabled={disabled}
            onChange={(next) => onChange(next || undefined)}
          />
        </div>
      ) : (
        <SelectField
          label={label}
          title={title}
          value={text}
          options={[...field.options]}
          disabled={disabled}
          onChange={(next) => onChange(next || undefined)}
        />
      );
    }
    case 'color':
      return <ColorField label={label} value={text} disabled={disabled || undefined} onChange={onChange} />;
    case 'url':
      return <UrlField label={label} value={text} disabled={disabled} onChange={onChange} />;
  }
}

/** Option d'un choix en bouton : son icône, ou une pastille de sa couleur. */
function choiceOf(option: FieldOption): ChoiceOption<string> {
  const { value, label, icon, color, title } = option;
  return {
    value,
    label,
    title: title ?? label,
    icon: icon ? (
      <ModeIcon mode={{ icon }} />
    ) : (
      <span className="choice-swatch" style={{ background: color }} aria-hidden="true" />
    ),
  };
}
