import { eventStormingExporter } from '../../../../engine/plugins/modes/eventstorming/api';
import { Section } from '../../../PanelSection';
import { ModeExportButton } from '../ModeExport';
import type { ModePanel, ModePanelProps } from '../registry';

/**
 * Mode « Event storming » (sujet 518), partie appli : la section du panneau de la page avec l'export JSON du mur, dans
 * la fenêtre d'export commune (sujet 439). Le texte et les règles viennent du moteur
 * (`engine/plugins/modes/eventstorming/export/`).
 */
export const panel: ModePanel = { PageSection: EventStormingSection };

function EventStormingSection({ page, exporters }: ModePanelProps) {
  return (
    <Section title="Event storming">
      <div className="mode-exports">
        <ModeExportButton
          page={page}
          exporters={exporters}
          exporter={eventStormingExporter}
          tip="Éléments, liens et avertissements déduits du mur : texte à copier"
        />
      </div>
    </Section>
  );
}
