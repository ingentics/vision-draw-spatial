import type { PageModel } from '../../../../../core/model/types';
import type { EdgeLook } from '../kind';

/**
 * Cardinalités d'une relation entre tables (sujet 265), d'après « Optionnel » de son champ dans la table d'arrivée :
 * au début, zéro ou plusieurs (`ERzeroToMany`, « 0,n ») ; à la fin (table du champ), une seule (`ERmandOne`, « 1,1 »),
 * ou zéro ou une si le champ est optionnel (`ERzeroToOne`, « 0,1 »). Imposées par le mode : réécrites à chaque remise
 * en ordre (`writeEdgeLook`).
 */

/** Textes des cardinalités affichés sur la page (`0` : masqués, les pointes restent, sujet 266) ; absent : affichés. */
export const CARDINALITIES = 'spatial.cardinalities';

export const cardinalitiesShown = (page: PageModel): boolean => page.attributes[CARDINALITIES] !== '0';

/**
 * Pointes et textes des bouts d'une flèche de relation ; `shown` : textes affichés (réglage de la page). Masqués : les
 * pointes seules, sans texte (sujet 266).
 */
export const cardinalitiesLook = (nullable: boolean, shown: boolean): EdgeLook => ({
  startArrow: 'ERzeroToMany',
  endArrow: nullable ? 'ERzeroToOne' : 'ERmandOne',
  startText: shown ? '0,n' : undefined,
  endText: !shown ? undefined : nullable ? '0,1' : '1,1',
});
