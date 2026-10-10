import { useEffect, useMemo, useState } from 'react';
import { statesExporter } from '../../../../engine/plugins/modes/states/api';
import { ExportDialog } from '../../../export/ExportDialog';
import { Section } from '../../../PanelSection';
import type { ModePanel, ModePanelProps } from '../registry';
import { SimulationBar } from './SimulationBar';
import { SimulationStart } from './SimulationStart';
import { SimulationTrace } from './SimulationTrace';
import { launch, launchFrom, openedSimulation, simulationActions } from './simulationRun';
import type { LaunchIssue } from './simulationRun';

/**
 * Mode « Machine à états » (sujet 436), partie appli : la section du panneau de la page avec la simulation pas à pas
 * (sujets 462, 463) et l'export PlantUML, dans la fenêtre d'export commune (sujet 439) ; la barre de la simulation sur
 * la zone de dessin. Le texte et la logique viennent du moteur (`engine/plugins/modes/states/`).
 */
export const panel: ModePanel = { PageSection: StatesSection, CanvasOverlay: SimulationBar };

function StatesSection({ page, exporters, simulation }: ModePanelProps) {
  const [exporting, setExporting] = useState(false);
  const [issue, setIssue] = useState<LaunchIssue>();
  const sim = openedSimulation(simulation);
  useEffect(() => {
    setIssue(undefined);
  }, [page.id, sim]);
  return (
    <Section title="Machine à états">
      <div className="mode-exports">
        {simulation &&
          (sim ? (
            <button
              type="button"
              className="button"
              data-tip="Arrêter la simulation et revenir à l’édition (Échap)"
              onClick={() => simulation.close()}
            >
              Arrêter la simulation
            </button>
          ) : (
            <button
              type="button"
              className="button"
              data-tip="Simuler la machine à états pas à pas depuis son point d’entrée ; l’édition est bloquée pendant la simulation"
              onClick={() => setIssue(launch(simulation, page))}
            >
              Lancer la simulation
            </button>
          ))}
        {simulation && !sim && issue && (
          <SimulationStart page={page} issue={issue} onChoose={(id) => launchFrom(simulation, page, id)} />
        )}
        {simulation && sim && <SimulationTrace sim={sim} onGoTo={simulationActions(simulation, sim).goTo} />}
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
