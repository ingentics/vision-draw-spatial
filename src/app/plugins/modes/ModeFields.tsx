import { isToggled, toggleValue } from '../../../engine';
import type { Field, ModePropertyView, ModeScope, ModeTarget, PageModel } from '../../../engine';
import { DeclaredField } from '../../DeclaredField';
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
  const { property, value, readOnly, options, note } = view;
  const editable = onChange !== undefined && !readOnly;
  // Choix évalués par le moteur (sujet 294) : le champ reçoit la liste, jamais la fonction du mode.
  // Encadré évalué de même pour la cible (sujet 517).
  const field: Field =
    property.type === 'choice' ? { ...property, options } : property.type === 'note' ? { ...property, note } : property;
  const number = value === undefined || value === '' ? undefined : Number(value);
  const typed =
    property.type === 'toggle'
      ? isToggled(value)
      : property.type === 'number'
        ? Number.isFinite(number)
          ? number
          : undefined
        : value;
  return (
    <DeclaredField
      field={field}
      layout="panel"
      identity={`${target.id}:${part ?? ''}`}
      value={typed}
      disabled={!editable}
      onChange={(next, merge) => {
        if (!editable) return;
        const written = typeof next === 'boolean' ? toggleValue(next) : next === undefined ? undefined : String(next);
        onChange(property.key, written, merge);
      }}
    />
  );
}
