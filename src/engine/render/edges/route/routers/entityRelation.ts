import { number } from '../util';
import { EAST, freeState, portConstraints, WEST } from './state';
import type { Router } from './state';

/** Routeur de relation d'entités (`mxEdgeStyle.EntityRelation`). */

const ENTITY_SEGMENT = 30;

/** Relation d'entités (mxEdgeStyle.EntityRelation) : sorties horizontales de `segment` px. */
export const entityRelation: Router = (view, fixed, sourceIn, targetIn, _points, result) => {
  const segment = number(view.style.segment, ENTITY_SEGMENT);
  const { p0, pe } = fixed;
  let source = sourceIn;
  let target = targetIn;
  let isSourceLeft = false;
  if (source && target) isSourceLeft = (pe ? pe.x : target.x + target.width) < (p0 ? p0.x : source.x);
  if (p0) source = freeState(p0);
  else if (source) {
    const c = portConstraints(source, view.style, true, 0);
    if (c !== 0 && c !== WEST + EAST) isSourceLeft = c === WEST;
  } else return;

  let isTargetLeft = true;
  if (target && source) isTargetLeft = (p0 ? p0.x : source.x + source.width) < (pe ? pe.x : target.x);
  if (pe) target = freeState(pe);
  else if (target) {
    const c = portConstraints(target, view.style, false, 0);
    if (c !== 0 && c !== WEST + EAST) isTargetLeft = c === WEST;
  }
  if (!source || !target) return;

  const x0 = isSourceLeft ? source.x : source.x + source.width;
  const y0 = view.routingCenterY(source);
  const xe = isTargetLeft ? target.x : target.x + target.width;
  const ye = view.routingCenterY(target);
  const dep = { x: x0 + (isSourceLeft ? -segment : segment), y: y0 };
  const arr = { x: xe + (isTargetLeft ? -segment : segment), y: ye };
  if (isSourceLeft === isTargetLeft) {
    const x = isSourceLeft ? Math.min(x0, xe) - segment : Math.max(x0, xe) + segment;
    result.push({ x, y: y0 }, { x, y: ye });
  } else if (dep.x < arr.x === isSourceLeft) {
    const midY = y0 + (ye - y0) / 2;
    result.push(dep, { x: dep.x, y: midY }, { x: arr.x, y: midY }, arr);
  } else {
    result.push(dep, arr);
  }
};
