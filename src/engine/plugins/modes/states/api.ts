/**
 * API du mode Machine à états pour sa partie appli (`src/app/plugins/modes/states/`, seule à l'importer) : le point
 * d'entrée du moteur n'expose rien de propre à un mode.
 */
export { statesExporter } from './export/plantuml';
export { NO_ENTRY, StateSimulation, startSimulation, topEntries } from './simulation/stateSimulation';
export type { SimulationEnd } from './simulation/stateSimulation';
export { StatesSimulator } from './simulation/statesSimulator';
export { END_LABELS, entryName, simulationTrace, stepName } from './simulation/simulationView';
export type { TraceLine } from './simulation/simulationView';
export { SIMULATION_COLOR } from './simulation/simulationMarks';
