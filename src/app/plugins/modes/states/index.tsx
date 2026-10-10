import { useMemo, useState } from 'react';
import { statesExporter } from '../../../../engine/plugins/modes/states/api';
import { ExportDialog } from '../../../export/ExportDialog';
import { Section } from '../../../PanelSection';
import type { ModePanel, ModePanelProps } from '../registry';

/**
 * Mode « Machine à états » (sujet 436), partie appli : la section du panneau de la page avec l'export PlantUML, dans la
 * fenêtre d'export commune (sujet 439) ; le texte vient du moteur (`engine/plugins/modes/states/export/`).
 */
export const panel: ModePanel = { PageSection: StatesSection };

function StatesSection({ page, exporters }: ModePanelProps) {
  const [exporting, setExporting] = useState(false);
  return (
    <Section title="Machine à états">
      <div className="mode-exports">
        <button
          type="button"
          className="button"
          data-tip="Diagramme d’états PlantUML de toute la page : texte à copier et rendu"
          onClick={() => setExporting(true)}
        >
          Exporter en PlantUML
        </button>
      </div>
      {exporting && <StatesExport page={page} exporters={exporters} onClose={() => setExporting(false)} />}
    </Section>
  );
}

function StatesExport({
  page,
  exporters,
  onClose,
}: Pick<ModePanelProps, 'page' | 'exporters'> & { onClose: () => void }) {
  const source = useMemo(() => statesExporter.export(page), [page]);
  return <ExportDialog format={statesExporter} source={source} exporters={exporters} onClose={onClose} />;
}
