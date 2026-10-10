import { Group } from 'three';
import type { Mesh, Object3D } from 'three';
import type { EdgeModel, OverlayLayer, OverlayScene, PageOverlay, Point } from '../../../../core/plugins';
import { distance, edgeBadgeDisc, edgeOf, labelPoint, shapeOf } from '../../../../core/plugins';
import {
  PROPOSED_BADGE,
  countBadge,
  crossingDot,
  currentMark,
  dashFrame,
  frameMark,
  proposedBadge,
  proposedRouteFrames,
  pulseHalo,
  ranked,
  takenRoute,
  visitTint,
} from './simulationMarks';
import type { StateSimulation } from './stateSimulation';
import { stepLook } from './simulationView';
import type { StepLook } from './simulationView';

/**
 * Couche d'un pas de la simulation d'une machine à états (sujets 462, 467) : état courant, transitions proposées et
 * empruntées gardés au-dessus du voile, et les marques qui les mettent en avant. Après un franchissement, un point
 * parcourt la transition (lancé vite, il ralentit), puis les marques du pas suivant s'affichent.
 */

/** Parcours de la transition franchie, en ms. */
const CROSSING_DURATION = 250;
/** Rang du point du franchissement : devant tout le reste. */
const DOT_RANK = 1000;

/** Pas précédent et transition franchie pour venir au pas courant. */
export interface Crossing {
  before: StepLook;
  edgeId: string;
}

/** Couche du pas courant, posée par le moteur (`PageTakeover.setOverlay`). */
export function simulationOverlay(sim: StateSimulation, crossing?: Crossing): PageOverlay {
  const look = stepLook(sim);
  return {
    veil: { kept: [look.current, ...look.proposed.map(({ id }) => id), ...look.taken] },
    layer: (scene) => simulationLayer(scene, look, crossing),
  };
}

/** Pointillés d'une transition proposée : un objet par décalage du motif, un seul visible. */
type Dashes = Object3D[];

/** Marques d'un pas, posées dans `group`. */
interface DrawnStep {
  group: Group;
  halo?: Mesh;
  dashes: Dashes[];
  /** Pastilles des transitions proposées, pour les clics. */
  badges: Array<{ edge: EdgeModel; route: Point[] }>;
}

function simulationLayer(scene: OverlayScene, look: StepLook, crossing?: Crossing): OverlayLayer {
  const object = new Group();
  object.name = 'states-simulation';
  const after = drawStep(scene, look);
  object.add(after.group);
  const route = crossing && !scene.reducedMotion ? scene.route(crossing.edgeId) : undefined;
  const before = crossing && route ? drawStep(scene, crossing.before) : undefined;
  if (before) object.add(before.group);
  // Point du franchissement : construit une fois, placé à chaque image.
  const dot = before ? ranked(crossingDot(), DOT_RANK) : undefined;
  if (dot) object.add(dot);
  /** Franchissement en cours : les marques du pas précédent sont montrées, un clic ne franchit rien. */
  let crossingNow = before !== undefined;

  const animate = (elapsed: number): boolean => {
    crossingNow = before !== undefined && route !== undefined && elapsed < CROSSING_DURATION;
    if (before) before.group.visible = crossingNow;
    after.group.visible = !crossingNow;
    if (dot) dot.visible = crossingNow;
    if (dot && route && crossingNow) {
      // Décélération cubique : le point part vite et ralentit en arrivant.
      const t = 1 - Math.pow(1 - elapsed / CROSSING_DURATION, 3);
      const at = labelPoint(route, { position: 2 * t - 1, distance: 0, offset: { x: 0, y: 0 } });
      dot.position.set(at.x, at.y, 0);
    }
    animateStep(crossingNow ? before! : after, elapsed);
    return true;
  };

  if (scene.reducedMotion) pulseHalo(after.halo, undefined);
  else animate(0);
  return {
    object,
    ...(!scene.reducedMotion && { animate }),
    hit: (point) =>
      crossingNow
        ? undefined
        : after.badges.find(({ edge, route: edgeRoute }) => {
            const disc = edgeBadgeDisc(edge, edgeRoute, PROPOSED_BADGE);
            return distance(point, disc.center) <= disc.radius;
          })?.edge.id,
  };
}

/** Halo qui pulse et pointillés qui défilent, `elapsed` ms après l'affichage (undefined : immobiles). */
function animateStep(step: DrawnStep, elapsed: number | undefined): void {
  pulseHalo(step.halo, elapsed);
  const shown = dashFrame(elapsed);
  for (const frames of step.dashes) frames.forEach((frame, i) => (frame.visible = i === shown));
}

/**
 * Marques d'un pas, du dessous au dessus : teintes des états visités, cadres des ensembles, transitions empruntées puis
 * proposées, état courant, et enfin toutes les pastilles (compteurs, numéros), que rien ne recouvre.
 */
function drawStep(scene: OverlayScene, look: StepLook): DrawnStep {
  const { page, ctx } = scene;
  const step: DrawnStep = { group: new Group(), dashes: [], badges: [] };
  let rank = 0;
  const put = (mark: Object3D | undefined) => {
    if (mark) step.group.add(ranked(mark, rank));
    rank++;
  };
  const badges: Array<() => void> = [];
  for (const { id, count } of look.visits) {
    const outline = scene.outline(id);
    const shape = shapeOf(page, id);
    if (!outline || !shape) continue;
    put(visitTint(outline));
    if (count >= 2) badges.push(() => put(countBadge(shape.bounds, count, ctx)));
  }
  for (const id of look.frames) {
    const outline = scene.outline(id);
    if (outline) put(frameMark(outline));
  }
  for (const id of look.taken) {
    const route = scene.route(id);
    if (route) put(takenRoute(route));
  }
  for (const { id, badge } of look.proposed) {
    const route = scene.route(id);
    const edge = edgeOf(page, id);
    if (!route || !edge) continue;
    const frames = proposedRouteFrames(route);
    for (const frame of frames) step.group.add(ranked(frame, rank));
    rank++;
    step.dashes.push(frames.map((frame) => frame.parent!));
    badges.push(() => put(proposedBadge(edge, route, badge, ctx)));
    step.badges.push({ edge, route });
  }
  const outline = scene.outline(look.current);
  if (outline) {
    const mark = currentMark(outline);
    put(mark.object);
    step.halo = mark.halo;
  }
  for (const badge of badges) badge();
  // Pointillés immobiles tant que la couche n'est pas animée (animations réduites).
  animateStep({ ...step, halo: undefined }, undefined);
  return step;
}
