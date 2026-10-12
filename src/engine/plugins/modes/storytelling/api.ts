/**
 * API du mode Story telling pour sa partie appli (`src/app/plugins/modes/storytelling/`, seule à l'importer) : le
 * point d'entrée du moteur n'expose rien de propre à un mode.
 */
export { storiesExporter } from './export/json';
export { setStoryNumber, stopStory, storyState } from './stories';
export type { Story } from './stories';
