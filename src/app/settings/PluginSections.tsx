import type { PluginSetting, PluginValues } from '../../engine';
import { Fragment } from 'react';
import { DeclaredField } from '../DeclaredField';
import { Section, Subsection } from '../PanelSection';
import { usePlugins } from '../pluginsContext';
import type { SettingsSectionProps } from './types';

/** Sections « Formes », « Modes » et « Effets » des paramètres : réglages déclarés par les plugins. */
export function PluginSections({ settings, onChange }: SettingsSectionProps) {
  // Modes et effets du moteur affiché (sujet 290) ; aucun tant qu'il n'est pas créé.
  const plugins = usePlugins();
  return (
    <>
      <Section title="Formes">
        {(plugins?.shapes.categories() ?? [])
          .filter((category) => (category.settings ?? []).length > 0)
          .map((category) => (
            <Subsection key={category.id} title={category.name}>
              <PluginSettingFields
                settings={category.settings!}
                values={plugins!.shapes.values(category.id, settings.shapeCategories[category.id])}
                onChange={(key, value) => onChange({ shapeCategories: { [category.id]: { [key]: value } } })}
              />
            </Subsection>
          ))}
      </Section>

      <Section title="Modes">
        {(plugins?.modes.list() ?? [])
          .filter((mode) => (mode.settings ?? []).length > 0)
          .map((mode) => (
            <Subsection key={mode.id} title={mode.shortName ?? mode.name}>
              <PluginSettingFields
                settings={mode.settings!}
                values={plugins!.modes.values(mode.id, settings.modes[mode.id])}
                onChange={(key, value) => onChange({ modes: { [mode.id]: { [key]: value } } })}
              />
            </Subsection>
          ))}
      </Section>

      <Section title="Effets">
        {(plugins?.effects.list() ?? [])
          .filter((effect) => (effect.settings ?? []).length > 0)
          .map((effect) => (
            <Subsection key={effect.id} title={effect.name}>
              <PluginSettingFields
                settings={effect.settings!}
                values={plugins!.effects.values(effect.id, settings.effects[effect.id])}
                onChange={(key, value) => onChange({ effects: { [effect.id]: { [key]: value } } })}
              />
              <p className="hint muted">{effect.description}</p>
            </Subsection>
          ))}
      </Section>
    </>
  );
}

/**
 * Réglages déclarés par un plugin, mode (ticket 283) ou effet (sujet 287), dans l'ordre : titre de groupe avant le
 * premier réglage d'un groupe, aide sous un réglage, aide au survol (`title`) en infobulle (sujet 404).
 */
function PluginSettingFields({
  settings,
  values,
  onChange,
}: {
  settings: PluginSetting[];
  values: PluginValues;
  onChange: (key: string, value: PluginValues[string]) => void;
}) {
  return settings.map((setting) => {
    const field = (
      <DeclaredField
        field={setting}
        layout="settings"
        value={values[setting.key]}
        disabled={
          setting.type === 'url' && setting.when !== undefined && values[setting.when.key] !== setting.when.value
        }
        onChange={(value) => value !== undefined && onChange(setting.key, value)}
      />
    );
    return (
      <Fragment key={setting.key}>
        {setting.group && <h5 className="settings-group">{setting.group}</h5>}
        {setting.groupHint && <p className="hint muted">{setting.groupHint}</p>}
        {setting.title ? <div data-tip={setting.title}>{field}</div> : field}
        {setting.hint && <p className="hint muted">{setting.hint}</p>}
      </Fragment>
    );
  });
}
