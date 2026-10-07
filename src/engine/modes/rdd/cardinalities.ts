import { SIDE_NORMALS, sideOfConstraint } from '../../edit/edgeEnds';
import { center } from '../../model/geometry';
import { styleNumber } from '../../model/styleValues';
import type { EdgeModel, PageModel, Point } from '../../model/types';
import type { ModeEdit } from '../types';

/**
 * Cardinalités d'une flèche de relation RDD (sujet 265), d'après « Optionnel » de son champ dans la table d'arrivée :
 * au début, zéro ou plusieurs (`ERzeroToMany`, « 0,n ») ; à la fin (table du champ), une seule (`ERmandOne`, « 1,1 »),
 * ou zéro ou une si le champ est optionnel (`ERzeroToOne`, « 0,1 »). Pointes et textes des bouts (dans le style de
 * base des textes de début / fin) sont imposés par le mode : réécrits à chaque remise en ordre.
 */

/**
 * Sens de la flèche en quittant la table de ce bout : normale du côté où elle s'attache. Point d'attache fixe
 * (`exitX/exitY`, `entryX/entryY`) s'il y en a un ; sinon le côté que traverse la droite du centre de la table vers le
 * premier coude (ou le centre de l'autre table), comme une attache auto.
 */
function leavingDirection(page: PageModel, edge: EdgeModel, end: 'source' | 'target'): Point {
  const shapes = new Map(page.shapes.map((shape) => [shape.id, shape]));
  const own = shapes.get((end === 'source' ? edge.sourceId : edge.targetId) ?? '');
  const other = shapes.get((end === 'source' ? edge.targetId : edge.sourceId) ?? '');
  const prefix = end === 'source' ? 'exit' : 'entry';
  const fixed = {
    x: styleNumber(edge.style, `${prefix}X`, NaN),
    y: styleNumber(edge.style, `${prefix}Y`, NaN),
  };
  const fixedSide = Number.isFinite(fixed.x) && Number.isFinite(fixed.y) ? sideOfConstraint(fixed) : undefined;
  if (fixedSide) return SIDE_NORMALS[fixedSide];
  const bend = end === 'source' ? edge.points[0] : edge.points[edge.points.length - 1];
  const toward: Point | undefined = bend ?? (other && center(other.bounds));
  if (!own || !toward) return SIDE_NORMALS.e;
  const from = center(own.bounds);
  const dx = (toward.x - from.x) / Math.max(own.bounds.width, 1);
  const dy = (toward.y - from.y) / Math.max(own.bounds.height, 1);
  if (Math.abs(dx) >= Math.abs(dy)) return SIDE_NORMALS[dx < 0 ? 'w' : 'e'];
  return SIDE_NORMALS[dy < 0 ? 'n' : 's'];
}

/** Textes des cardinalités affichés sur la page (`0` : masqués, les pointes restent, sujet 266) ; absent : affichés. */
export const CARDINALITIES = 'spatial.cardinalities';

export const cardinalitiesShown = (page: PageModel): boolean => page.attributes[CARDINALITIES] !== '0';

/** Marge des textes en plus des écarts des paramètres : hors du cercle et des barres des pointes ER. */
const TEXT_MARGIN = { along: 4, across: 4 };

/**
 * Pointes et textes des bouts d'une flèche de relation ; `shown` : réglage de la page (passé quand l'opération vient
 * de le changer, `edit.page` ne le montrant pas encore). Masquées : les pointes seules, sans texte (sujet 266).
 */
export function writeCardinalities(
  edit: ModeEdit,
  edgeId: string,
  nullable: boolean,
  shown = cardinalitiesShown(edit.page),
): void {
  const edge = edit.page.edges.find((e) => e.id === edgeId);
  if (!edge) return;
  edit.setElementStyle(edgeId, 'startArrow', 'ERzeroToMany');
  edit.setElementStyle(edgeId, 'endArrow', nullable ? 'ERzeroToOne' : 'ERmandOne');
  edit.setElementStyle(edgeId, 'startFill', undefined);
  edit.setElementStyle(edgeId, 'endFill', undefined);
  edit.setEdgeEndText(
    edgeId,
    'start',
    shown ? '0,n' : undefined,
    leavingDirection(edit.page, edge, 'source'),
    TEXT_MARGIN,
  );
  edit.setEdgeEndText(
    edgeId,
    'end',
    !shown ? undefined : nullable ? '0,1' : '1,1',
    leavingDirection(edit.page, edge, 'target'),
    TEXT_MARGIN,
  );
}
