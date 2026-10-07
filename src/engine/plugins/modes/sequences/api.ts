/**
 * API du mode Séquences pour sa partie appli (`src/app/plugins/modes/sequences/`, seule à l'importer, sujet 282) : le
 * point d'entrée du moteur n'expose rien de propre à un mode.
 */
export { SEQUENCE_EXPORTERS } from './export';
export type { SequenceExporter } from './export';
export type { Flow } from './flows';
export { addFlow, removeFlow, renameFlow, sequenceState } from './steps';
