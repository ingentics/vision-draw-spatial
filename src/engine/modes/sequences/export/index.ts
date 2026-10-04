import type { PageModel } from '../../../model/types';
import { plantUml } from './plantuml';

/**
 * Exporteurs du mode Séquences (sujet 90) : chacun écrit un flux de la page dans un format texte (PlantUML…).
 * Le moteur ne fournit que le texte ; l'appli l'affiche ou le rend.
 */
export interface SequenceExporter {
  id: string;
  /** Nom du format, affiché (ex. « PlantUML »). */
  name: string;
  /** Texte du flux `flowId` de la page (flèches dans l'ordre des rangs). */
  export(page: PageModel, flowId: string): string;
}

export const SEQUENCE_EXPORTERS: readonly SequenceExporter[] = [plantUml];

export function sequenceExporter(id: string): SequenceExporter | undefined {
  return SEQUENCE_EXPORTERS.find((exporter) => exporter.id === id);
}
