import { SETTINGS_LIMITS } from '../../engine';
import type { SettingsSectionProps } from './types';
import { Section, Subsection } from '../PanelSection';
import { Choice, ColorField, Slider, Toggle } from '../SettingsFields';
import { usePlugins } from '../pluginsContext';
import { SelectionPreview } from '../settingsPreviews';
import { percent } from './formats';
import { SectionPreview } from './settingsTree';

/** Section « Sélection » des paramètres. */
export function SelectionSettings({ settings, onChange }: SettingsSectionProps) {
  // Modes et effets du moteur affiché (sujet 290) ; aucun tant qu'il n'est pas créé.
  const plugins = usePlugins();
  const { selection, background } = settings;
  return (
    <Section title="Sélection">
      <Subsection title="Mise en valeur">
        <Choice
          label="Style"
          value={selection.style}
          options={[
            ['veil', 'Voile sur le reste'],
            ['outline', 'Contour'],
          ]}
          onChange={(style) => onChange({ selection: { style } })}
        />
        {(plugins?.modes.list() ?? [])
          .filter((mode) => mode.selectionStyle)
          .map((mode) => (
            <p key={mode.id} className="panel-hint">
              Pages « {mode.name} » : {mode.selectionStyle === 'outline' ? 'contour' : 'voile'} imposé.
            </p>
          ))}
        <ColorField
          label="Couleur d’accent (contour, poignées, liens, mini-carte)"
          value={selection.accentColor}
          onChange={(accentColor) => onChange({ selection: { accentColor } })}
        />
      </Subsection>
      <Subsection title="Voile">
        <Slider
          label="Intensité du voile"
          value={selection.veilOpacity}
          limits={SETTINGS_LIMITS['selection.veilOpacity']}
          format={percent}
          disabled={selection.style !== 'veil'}
          onChange={(veilOpacity) => onChange({ selection: { veilOpacity } })}
        />
        <ColorField
          label="Couleur du voile"
          value={selection.veilColor}
          disabled={selection.style !== 'veil'}
          onChange={(veilColor) => onChange({ selection: { veilColor } })}
        />
        <Slider
          label="Marge autour d’une flèche sélectionnée"
          value={selection.veilPadding}
          limits={SETTINGS_LIMITS['selection.veilPadding']}
          format={(v) => `${v} px`}
          disabled={selection.style !== 'veil'}
          onChange={(veilPadding) => onChange({ selection: { veilPadding } })}
        />
      </Subsection>
      <Subsection title="Contour">
        <Toggle
          label="Contour animé (les tirets défilent)"
          checked={selection.animated}
          disabled={selection.style !== 'outline'}
          onChange={(animated) => onChange({ selection: { animated } })}
        />
        <Slider
          label="Vitesse des tirets"
          value={selection.speed}
          limits={SETTINGS_LIMITS['selection.speed']}
          format={(v) => `${v} px/s`}
          disabled={selection.style !== 'outline' || !selection.animated}
          onChange={(speed) => onChange({ selection: { speed } })}
        />
      </Subsection>
      <SectionPreview>
        <SelectionPreview selection={selection} background={background} />
      </SectionPreview>
    </Section>
  );
}
