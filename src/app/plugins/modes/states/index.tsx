import { useMemo, useState } from 'react';
import { statesPlantUml } from '../../../../engine/plugins/modes/states/api';
import { ExportDialog } from '../../../export/ExportDialog';
import { Section } from '../../../PanelSection';
import type { ModePanel, ModePanelProps } from '../registry';

/** Format de l'export, pour la fenêtre commune (rendu PlantUML des paramètres). */
const PLANTUML = { id: 'plantuml', name: 'PlantUML' };

/**
 * Mode « Machine à états » (sujet 436), partie appli : la section du panneau de la page avec l'export PlantUML, dans la
 * fenêtre d'export commune (sujet 439) ; le texte vient du moteur (`engine/plugins/modes/states/export/`).
 */
export const panel: ModePanel = { PageSection: StatesSection };

function StatesSection({ page, exporters }: ModePanelProps) {
  const [exporting, setExporting] = useState(false);
  return (
    <Section title="Machine à états">
      <div className="flow-exports">
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
  const source = useMemo(() => statesPlantUml(page), [page]);
  return <ExportDialog format={PLANTUML} source={source} exporters={exporters} onClose={onClose} />;
}
