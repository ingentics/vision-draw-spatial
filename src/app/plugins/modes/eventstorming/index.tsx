import { useMemo, useState } from 'react';
import { eventStormingExporter } from '../../../../engine/plugins/modes/eventstorming/api';
import { ExportDialog } from '../../../export/ExportDialog';
import { Section } from '../../../PanelSection';
import type { ModePanel, ModePanelProps } from '../registry';

/**
 * Mode « Event storming » (sujet 518), partie appli : la section du panneau de la page avec l'export JSON du mur, dans
 * la fenêtre d'export commune (sujet 439). Le texte et les règles viennent du moteur
 * (`engine/plugins/modes/eventstorming/export/`).
 */
export const panel: ModePanel = { PageSection: EventStormingSection };

function EventStormingSection({ page, exporters }: ModePanelProps) {
  const [exporting, setExporting] = useState(false);
  return (
    <Section title="Event storming">
      <div className="mode-exports">
        <button
          type="button"
          className="button"
          data-tip="Éléments, liens et avertissements déduits du mur : texte à copier"
          onClick={() => setExporting(true)}
        >
          Exporter en JSON
        </button>
      </div>
      {exporting && <WallExport page={page} exporters={exporters} onClose={() => setExporting(false)} />}
    </Section>
  );
}

function WallExport({
  page,
  exporters,
  onClose,
}: Pick<ModePanelProps, 'page' | 'exporters'> & { onClose: () => void }) {
  const source = useMemo(() => eventStormingExporter.export(page), [page]);
  return <ExportDialog format={eventStormingExporter} source={source} exporters={exporters} onClose={onClose} />;
}
