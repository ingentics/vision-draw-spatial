import type { SettingsSectionProps } from './types';
import { Section, Subsection } from '../PanelSection';
import { Choice, UrlField } from '../SettingsFields';

/** Section « Exporteurs » des paramètres : rendu des exports PlantUML, commun aux modes (sujet 439). */
export function ExportSettings({ settings, onChange }: SettingsSectionProps) {
  const { plantuml } = settings.exporters;
  return (
    <Section title="Exporteurs">
      <Subsection title="PlantUML">
        <Choice
          label="Moteur de rendu"
          value={plantuml.renderer}
          options={[
            ['kroki', 'kroki.io'],
            ['plantuml', 'plantuml.com'],
            ['local', 'Serveur local'],
          ]}
          onChange={(renderer) => onChange({ exporters: { plantuml: { renderer } } })}
        />
        <UrlField
          label="URL du serveur local"
          value={plantuml.localUrl}
          disabled={plantuml.renderer !== 'local'}
          onChange={(localUrl) => onChange({ exporters: { plantuml: { localUrl } } })}
        />
        <p className="hint muted">
          Rendu de la fenêtre d’export des modes (flux des séquences…). Le texte du diagramme part dans l’adresse de
          l’image : avec un serveur local, rien ne sort de la machine. Un serveur PlantUML se lance avec «&nbsp;make
          plantuml&nbsp;» (http://localhost:8080).
        </p>
      </Subsection>
    </Section>
  );
}
