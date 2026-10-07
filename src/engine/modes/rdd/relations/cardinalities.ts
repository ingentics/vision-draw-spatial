import { SIDE_NORMALS, sideOfConstraint } from '../../../edit/edgeEnds';
import { center } from '../../../model/geometry';
import { styleNumber } from '../../../model/styleValues';
import type { EdgeModel, PageModel, Point, ShapeModel } from '../../../model/types';
import type { ModeEdit } from '../../types';
import { setEndArrows } from './ends';

/**
 * Cardinalités d'une relation entre tables (sujet 265), d'après « Optionnel » de son champ dans la table d'arrivée :
 * au début, zéro ou plusieurs (`ERzeroToMany`, « 0,n ») ; à la fin (table du champ), une seule (`ERmandOne`, « 1,1 »),
 * ou zéro ou une si le champ est optionnel (`ERzeroToOne`, « 0,1 »). Pointes et textes des bouts (dans le style de
 * base des textes de début / fin) sont imposés par le mode : réécrits à chaque remise en ordre.
 */

/**
 * Sens de la flèche en quittant la table de ce bout : normale du côté où elle s'attache. Point d'attache fixe
 * (`exitX/exitY`, `entryX/entryY`) s'il y en a un ; sinon le côté que traverse la droite du centre de la table vers le
 * premier coude (ou le centre de l'autre table), comme une attache auto.
 */
function leavingDirection(shapes: ReadonlyMap<string, ShapeModel>, edge: EdgeModel, end: 'source' | 'target'): Point {
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
 * Pointes et textes des bouts d'une flèche de relation ; `shown` : textes affichés (réglage de la page). Masqués : les
 * pointes seules, sans texte (sujet 266). `shapes` : formes de la page par id.
 */
export function writeCardinalities(
  edit: ModeEdit,
  edge: EdgeModel,
  shapes: ReadonlyMap<string, ShapeModel>,
  nullable: boolean,
  shown: boolean,
): void {
  const edgeId = edge.id;
  setEndArrows(edit, edgeId, 'ERzeroToMany', nullable ? 'ERzeroToOne' : 'ERmandOne');
  edit.setEdgeEndText(
    edgeId,
    'start',
    shown ? '0,n' : undefined,
    leavingDirection(shapes, edge, 'source'),
    TEXT_MARGIN,
  );
  edit.setEdgeEndText(
    edgeId,
    'end',
    !shown ? undefined : nullable ? '0,1' : '1,1',
    leavingDirection(shapes, edge, 'target'),
    TEXT_MARGIN,
  );
}
