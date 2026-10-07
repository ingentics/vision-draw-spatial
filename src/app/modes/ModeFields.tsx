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
  palette,
  onChange,
}: {
  page: PageModel;
  scope: ModeScope;
  target: ModeTarget;
  /** Partie sélectionnée de la forme (sujet 249) : ses réglages seulement. */
  part?: string;
  /** Couleurs proposées par l'appli (`modePalette`), pour les choix d'un réglage. */
  palette: readonly string[];
  /** Écriture d'un réglage (undefined = vide) ; absent : lecture seule. */
  onChange?: (key: string, value: string | undefined) => void;
}) {
  const properties = defaultModeRegistry
    .properties(page, scope, part)
    .filter((property) => !property.hidden?.(page, target, part));
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
  onChange?: (key: string, value: string | undefined) => void;
}) {
  const { key, label } = property;
  const value = property.value ? property.value(page, target, part) : rawValue(target, key);
  const title = property.title ?? label;
  const editable = onChange !== undefined && !property.readOnly;
  const write = (next: string | undefined) => {
    if (editable) onChange(key, next);
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
    case 'text':
      return (
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
