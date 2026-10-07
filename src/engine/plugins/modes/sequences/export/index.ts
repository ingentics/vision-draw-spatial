import type { PageModel } from '../../../../core/plugins';
import { plantUml } from './plantuml';

/**
 * Exporteurs du mode Séquences (sujet 90) : chacun écrit un flux de la page dans un format texte (PlantUML…).
 * Le moteur ne fournit que le texte ; l'appli l'affiche ou le rend.
 */
export interface SequenceExporter {
  id: string;
  /** Nom du format, affiché (ex. « PlantUML »). */
  name: string;
  /** Texte du flux `flowId` de la page (flèches dans l'ordre des rangs) ; sans `flowId`, tous les flux de la page. */
  export(page: PageModel, flowId?: string): string;
}

export const SEQUENCE_EXPORTERS: readonly SequenceExporter[] = [plantUml];
