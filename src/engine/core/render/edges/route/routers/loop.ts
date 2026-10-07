import type { Point } from '../../../../model/types';
import { number } from '../util';
import { contains } from './state';
import type { Router } from './state';

/** Routeur de boucle (`mxEdgeStyle.Loop`). */

const LOOP_SEGMENT = 10;

/** Boucle sur une même forme (mxEdgeStyle.Loop). */
export const loopConnector: Router = (view, fixed, source, _target, points, result) => {
  if (fixed.p0 && fixed.pe) {
    for (const p of points) result.push({ ...p });
    return;
  }
  if (!source) return;
  let pt: Point | undefined = points[0];
  if (pt && contains(source, pt.x, pt.y)) pt = undefined;
  let x = 0;
  let dx = 0;
  let y = 0;
  let dy = 0;
  const seg = number(view.style.segment, LOOP_SEGMENT);
  const dir = view.style.direction ?? 'west';
  if (dir === 'north' || dir === 'south') {
    x = view.routingCenterX(source);
    dx = seg;
  } else {
    y = view.routingCenterY(source);
    dy = seg;
  }
  if (!pt || pt.x < source.x || pt.x > source.x + source.width) {
    if (pt) {
      x = pt.x;
      dy = Math.max(Math.abs(y - pt.y), dy);
    } else if (dir === 'north') y = source.y - 2 * dx;
    else if (dir === 'south') y = source.y + source.height + 2 * dx;
    else if (dir === 'east') x = source.x - 2 * dy;
    else x = source.x + source.width + 2 * dy;
  } else {
    x = view.routingCenterX(source);
    dx = Math.max(Math.abs(x - pt.x), dy);
    y = pt.y;
    dy = 0;
  }
  result.push({ x: x - dx, y: y - dy }, { x: x + dx, y: y + dy });
};
