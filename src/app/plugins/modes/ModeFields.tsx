import { useState } from 'react';
import type { ModePropertyView, ModeScope, ModeTarget, PageModel } from '../../../engine';
import { NumberField, SelectField, TextField } from '../../Fields';
import { useEnginePlugins } from '../../pluginsContext';

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
  const plugins = useEnginePlugins();
  // Évalués par le moteur (sujet 294) : le panneau n'appelle jamais le mode.
  const views = plugins
    .modePropertyViews(page, scope, target, part, palette)
    .filter((view) => view.property.section === section);
  return (
    <>
      {views.map((view) => (
        <ModePropertyField key={view.property.key} target={target} part={part} view={view} onChange={onChange} />
      ))}
    </>
  );
}

function ModePropertyField({
  target,
  part,
  view,
  onChange,
}: {
  target: ModeTarget;
  part?: string;
  view: ModePropertyView;
  onChange?: (key: string, value: string | undefined, merge?: string) => void;
}) {
  const { property, value, readOnly, options } = view;
  // Saisie en direct (sujet 271) : une étape d'annulation par passage dans le champ, et le champ recréé ensuite, pour
  // montrer la valeur retenue (un libellé vidé est refusé).
  const [session, setSession] = useState(0);
  const { key, label } = property;
  const title = property.title ?? label;
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
          options={options}
          disabled={!editable}
          onChange={(next) => write(next || undefined)}
        />
      );
  }
}
