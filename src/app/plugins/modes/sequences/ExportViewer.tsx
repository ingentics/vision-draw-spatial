import { useMemo, useState } from 'react';
import type { ExporterSettings, PageModel } from '../../../../engine';
import { flowLabel, sequenceState } from '../../../../engine/plugins/modes/sequences/api';
import type { SequenceExporter } from '../../../../engine/plugins/modes/sequences/api';
import { ExportDialog } from '../../../export/ExportDialog';

/** Choix de toute la page dans la liste des flux (un id de flux n'est jamais vide). */
const ALL = '';

/**
 * Export d'un flux (sujet 90) dans la fenêtre commune (sujet 439) : choix du flux, ou de toute la page (sujet 96, choix
 * à l'ouverture), texte fourni par l'exporteur du moteur.
 */
export function ExportViewer({
  page,
  exporter,
  exporters,
  onClose,
}: {
  page: PageModel;
  exporter: SequenceExporter;
  /** Moteurs de rendu (paramètres de l'appli, Exporteurs). */
  exporters: ExporterSettings;
  onClose: () => void;
}) {
  const { flows } = sequenceState(page);
  /** Flux exporté ; `ALL` : tous les flux de la page. */
  const [flow, setFlow] = useState(ALL);
  const source = useMemo(() => exporter.export(page, flow === ALL ? undefined : flow), [exporter, page, flow]);
  return (
    <ExportDialog format={exporter} source={source} exporters={exporters} onClose={onClose}>
      <select value={flow} aria-label="Flux exporté" onChange={(event) => setFlow(event.target.value)}>
        <option value={ALL} title={`Tous les flux de la page « ${page.name} »`}>
          {page.name}
        </option>
        {flows.map((f) => (
          <option key={f.id} value={f.id}>
            {flowLabel(f)}
          </option>
        ))}
      </select>
    </ExportDialog>
  );
}
