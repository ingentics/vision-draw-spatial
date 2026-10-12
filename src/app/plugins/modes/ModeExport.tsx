import { useMemo, useState } from 'react';
import type { PageModel } from '../../../engine';
import { ExportDialog } from '../../export/ExportDialog';
import type { ModePanelProps } from './registry';

/** Export de page d'un mode : son format et le texte de la page (ex. `statesExporter`, `jsonExporter(…)`). */
export interface ModePageExporter {
  id: string;
  name: string;
  export: (page: PageModel) => string;
}

/**
 * Bouton « Exporter en … » d'un mode (sujet 549) et sa fenêtre d'export commune (sujet 439) : le texte de la page est
 * calculé à l'ouverture, puis suit la page tant que la fenêtre est ouverte.
 */
export function ModeExportButton({
  page,
  exporters,
  exporter,
  tip,
}: Pick<ModePanelProps, 'page' | 'exporters'> & { exporter: ModePageExporter; tip: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="button" data-tip={tip} onClick={() => setOpen(true)}>
        Exporter en {exporter.name}
      </button>
      {open && <ExportWindow page={page} exporters={exporters} exporter={exporter} onClose={() => setOpen(false)} />}
    </>
  );
}

function ExportWindow({
  page,
  exporters,
  exporter,
  onClose,
}: Pick<ModePanelProps, 'page' | 'exporters'> & { exporter: ModePageExporter; onClose: () => void }) {
  const source = useMemo(() => exporter.export(page), [exporter, page]);
  return <ExportDialog format={exporter} source={source} exporters={exporters} onClose={onClose} />;
}
