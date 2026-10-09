import { SETTINGS_LIMITS } from '../../engine';
import type { SettingsSectionProps } from './types';
import { Section } from '../PanelSection';
import { Choice, ColorField, Slider, Toggle } from '../SettingsFields';
import { MinimapPreview, SidebarPreview } from '../settingsPreviews';
import { percent } from './formats';

/** Section « Mini-carte » des paramètres. */
export function MinimapSettings({ settings, onChange }: SettingsSectionProps) {
  const { minimap, selection, background } = settings;
  return (
    <Section title="Mini-carte">
      <Toggle
        label="Afficher la mini-carte"
        checked={minimap.visible}
        onChange={(visible) => onChange({ minimap: { visible } })}
      />
      <Slider
        label="Largeur de la mini-carte"
        value={minimap.size}
        limits={SETTINGS_LIMITS['minimap.size']}
        format={(v) => `${v} px`}
        disabled={!minimap.visible}
        onChange={(size) => onChange({ minimap: { size } })}
      />
      <ColorField
        label="Flèches"
        value={minimap.edgeColor}
        disabled={!minimap.visible}
        onChange={(edgeColor) => onChange({ minimap: { edgeColor } })}
      />
      <ColorField
        label="Contour des formes"
        value={minimap.outlineColor}
        disabled={!minimap.visible}
        onChange={(outlineColor) => onChange({ minimap: { outlineColor } })}
      />
      <MinimapPreview minimap={minimap} background={background} accent={selection.accentColor} />
    </Section>
  );
}

/** Section « Barres latérales » des paramètres. */
export function SidebarSettings({ settings, onChange }: SettingsSectionProps) {
  const { background } = settings;
  return (
    <Section title="Barres latérales">
      <Choice
        label="Nom sur la bande d'une barre repliée"
        value={settings.panels.stripText}
        options={[
          ['up', 'De bas en haut'],
          ['down', 'De haut en bas'],
        ]}
        onChange={(stripText) => onChange({ panels: { stripText } })}
      />
      <Slider
        label="Ombre sur la zone de dessin"
        value={settings.panels.shadow}
        limits={SETTINGS_LIMITS['panels.shadow']}
        format={(v) => (v === 0 ? 'Aucune' : percent(v))}
        onChange={(shadow) => onChange({ panels: { shadow } })}
      />
      <Slider
        label="Largeur gardée à la zone de dessin"
        value={settings.panels.minCanvas}
        limits={SETTINGS_LIMITS['panels.minCanvas']}
        format={(v) => `${v} px`}
        onChange={(minCanvas) => onChange({ panels: { minCanvas } })}
      />
      <p className="hint muted">
        Replier : double flèche en haut de la barre ; largeur : glisser son bord (double-clic = par défaut).
      </p>
      <SidebarPreview panels={settings.panels} background={background} />
    </Section>
  );
}
