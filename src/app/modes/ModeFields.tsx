import type { PageModel } from '../../engine/model/types';
import { defaultModeRegistry } from '../../engine/modes/registry';
import type { ModeScope } from '../../engine/modes/registry';
import type { ModeProperty, ModeTarget } from '../../engine/modes/types';
import { spatialValue } from '../../engine/spatial';
import { NumberField, SelectField, TextField } from '../Fields';

/**
 * Réglages déclarés par le mode de la page pour une cible (la page, une flèche, une forme), rendus par des champs
 * génériques : le panneau ne connaît aucun mode, chacun déclare les siens.
 */
export function ModePropertyFields({
  page,
  scope,
  target,
  onChange,
}: {
  page: PageModel;
  scope: ModeScope;
  target: ModeTarget;
  /** Écriture d'un réglage (undefined = vide) ; absent : lecture seule. */
  onChange?: (key: string, value: string | undefined) => void;
}) {
  const properties = defaultModeRegistry.properties(page, scope).filter((property) => !property.hidden?.(page, target));
  return (
    <>
      {properties.map((property) => (
        <ModePropertyField key={property.key} page={page} target={target} property={property} onChange={onChange} />
      ))}
    </>
  );
}

function ModePropertyField({
  page,
  target,
  property,
  onChange,
}: {
  page: PageModel;
  target: ModeTarget;
  property: ModeProperty;
  onChange?: (key: string, value: string | undefined) => void;
}) {
  const { key, label } = property;
  const value = property.value ? property.value(page, target) : rawValue(target, key);
  const title = property.title ?? label;
  const write = (next: string | undefined) => onChange?.(key, next);
  switch (property.type) {
    case 'toggle':
      return (
        <label className="field toggle" title={title}>
          <input
            type="checkbox"
            checked={value === '1'}
            disabled={!onChange}
            onChange={(event) => write(event.target.checked ? '1' : undefined)}
          />
          {label}
        </label>
      );
    case 'number': {
      const number = value === undefined || value === '' ? undefined : Number(value);
      return (
        <NumberField
          key={`${target.id}:${key}:${value ?? ''}`}
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
          key={`${target.id}:${key}:${value ?? ''}`}
          label={label}
          title={title}
          value={value ?? ''}
          placeholder={property.placeholder}
          readOnly={!onChange}
          onCommit={(text) => write(text.trim() || undefined)}
        />
      );
    case 'select':
      return (
        <SelectField
          label={label}
          title={title}
          value={value ?? ''}
          options={property.options(page)}
          disabled={!onChange}
          onChange={(next) => write(next || undefined)}
        />
      );
  }
}

/** Attribut d'une cible : celui de `<diagram>` pour la page, l'attribut spatial (style, puis objet) d'un élément. */
function rawValue(target: ModeTarget, key: string): string | undefined {
  return 'style' in target ? spatialValue(target, key) : target.attributes[key];
}
