import { useState } from 'react';
import { defaultModeRegistry, spatialValue } from '../../engine';
import type { ModeProperty, ModeScope, ModeTarget, PageModel } from '../../engine';
import { NumberField, SelectField, TextField } from '../Fields';

/**
 * Réglages déclarés par le mode de la page pour une cible (la page, une flèche, une forme), rendus par des champs
 * génériques : le panneau ne connaît aucun mode, chacun déclare les siens.
 */
export function ModePropertyFields({
  page,
  scope,
  target,
  part,
  section,
  palette,
  onChange,
}: {
  page: PageModel;
  scope: ModeScope;
  target: ModeTarget;
  /** Partie sélectionnée de la forme (sujet 249) : ses réglages seulement. */
  part?: string;
  /** Section affichée (sujet 260) : ses réglages seulement ; absente : ceux de la section du mode. */
  section?: string;
  /** Couleurs proposées par l'appli (`modePalette`), pour les choix d'un réglage. */
  palette: readonly string[];
  /** Écriture d'un réglage (undefined = vide ; `merge` : réglage en direct) ; absent : lecture seule. */
  onChange?: (key: string, value: string | undefined, merge?: string) => void;
}) {
  const properties = defaultModeRegistry
    .properties(page, scope, part)
    .filter((property) => property.section === section && !property.hidden?.(page, target, part));
  return (
    <>
      {properties.map((property) => (
        <ModePropertyField
          key={property.key}
          page={page}
          target={target}
          part={part}
          property={property}
          palette={palette}
          onChange={onChange}
        />
      ))}
    </>
  );
}

function ModePropertyField({
  page,
  target,
  part,
  property,
  palette,
  onChange,
}: {
  page: PageModel;
  target: ModeTarget;
  part?: string;
  property: ModeProperty;
  palette: readonly string[];
  onChange?: (key: string, value: string | undefined, merge?: string) => void;
}) {
  // Saisie en direct (sujet 271) : une étape d'annulation par passage dans le champ, et le champ recréé ensuite, pour
  // montrer la valeur retenue (un libellé vidé est refusé).
  const [session, setSession] = useState(0);
  const { key, label } = property;
  const value = property.value ? property.value(page, target, part) : rawValue(target, key);
  const title = property.title ?? label;
  const readOnly =
    typeof property.readOnly === 'function' ? property.readOnly(page, target, part) : property.readOnly === true;
  const editable = onChange !== undefined && !readOnly;
  const write = (next: string | undefined, merge?: string) => {
    if (editable) onChange(key, next, merge);
  };
  switch (property.type) {
    case 'toggle':
      return (
        <label className="field toggle" title={title}>
          <input
            type="checkbox"
            checked={value === '1'}
            disabled={!editable}
            onChange={(event) => write(event.target.checked ? '1' : undefined)}
          />
          {label}
        </label>
      );
    case 'number': {
      const number = value === undefined || value === '' ? undefined : Number(value);
      return (
        <NumberField
          key={`${target.id}:${part ?? ''}:${key}:${value ?? ''}`}
          label={label}
          title={title}
          value={Number.isFinite(number) ? number : undefined}
          placeholder={property.placeholder ?? ''}
          onCommit={(next) => write(next === undefined ? undefined : String(next))}
        />
      );
    }
    case 'text': {
      const merge = `${target.id}:${part ?? ''}:${key}:${session}`;
      return property.live ? (
        // Pas de valeur dans la clé : le champ garde le curseur pendant la saisie.
        <TextField
          key={merge}
          label={label}
          title={title}
          value={value ?? ''}
          placeholder={property.placeholder}
          multiline={property.multiline}
          readOnly={!editable}
          onLive={(text) => write(text.trim() || undefined, merge)}
          onCommit={(text) => {
            write(text.trim() || undefined, merge);
            setSession((current) => current + 1);
          }}
        />
      ) : (
        <TextField
          key={`${target.id}:${part ?? ''}:${key}:${value ?? ''}`}
          label={label}
          title={title}
          value={value ?? ''}
          placeholder={property.placeholder}
          multiline={property.multiline}
          readOnly={!editable}
          onCommit={(text) => write(text.trim() || undefined)}
        />
      );
    }
    case 'button':
      return (
        <button
          type="button"
          className="button wide-button"
          title={title}
          disabled={!editable}
          onClick={() => write(undefined)}
        >
          {label}
        </button>
      );
    case 'select':
      return (
        <SelectField
          label={label}
          title={title}
          value={value ?? ''}
          options={property.options(page, palette)}
          disabled={!editable}
          onChange={(next) => write(next || undefined)}
        />
      );
  }
}

/** Attribut d'une cible : celui de `<diagram>` pour la page, l'attribut spatial (style, puis objet) d'un élément. */
function rawValue(target: ModeTarget, key: string): string | undefined {
  return 'style' in target ? spatialValue(target, key) : target.attributes[key];
}
