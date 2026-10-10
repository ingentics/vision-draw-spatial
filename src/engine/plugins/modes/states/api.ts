/**
 * API du mode Machine à états pour sa partie appli (`src/app/plugins/modes/states/`, seule à l'importer) : le point
 * d'entrée du moteur n'expose rien de propre à un mode.
 */
export { statesExporter } from './export/plantuml';
export { StateSimulation, startSimulation } from './simulation/stateSimulation';
export type { SimulationEnd } from './simulation/stateSimulation';
export { END_LABELS, entryName, simulationTrace, stepLook, stepName } from './simulation/simulationView';
export type { TraceLine } from './simulation/simulationView';
export { simulationFrame } from './simulation/simulationLayer';
export { simulationKey } from './simulation/simulationKeys';
export type { SimulationMove } from './simulation/simulationKeys';
