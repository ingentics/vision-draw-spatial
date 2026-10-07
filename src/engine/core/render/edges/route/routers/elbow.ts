import { contains, freeState } from './state';
import type { Router } from './state';

/** Routeurs à coude (`mxEdgeStyle.ElbowConnector`, `SideToSide`, `TopToBottom`). */

/** Coude (mxEdgeStyle.ElbowConnector) : de côté à côté, ou de haut en bas (`elbow=vertical`). */
export const elbowConnector: Router = (view, fixed, source, target, points, result) => {
  const pt = points[0];
  let vertical = false;
  let horizontal = false;
  if (source && target) {
    if (pt) {
      const left = Math.min(source.x, target.x);
      const right = Math.max(source.x + source.width, target.x + target.width);
      const top = Math.min(source.y, target.y);
      const bottom = Math.max(source.y + source.height, target.y + target.height);
      vertical = pt.y < top || pt.y > bottom;
      horizontal = pt.x < left || pt.x > right;
    } else {
      const left = Math.max(source.x, target.x);
      const right = Math.min(source.x + source.width, target.x + target.width);
      vertical = left === right;
      if (!vertical) {
        const top = Math.max(source.y, target.y);
        const bottom = Math.min(source.y + source.height, target.y + target.height);
        horizontal = top === bottom;
      }
    }
  }
  if (!horizontal && (vertical || view.style.elbow === 'vertical'))
    topToBottom(view, fixed, source, target, points, result);
  else sideToSide(view, fixed, source, target, points, result);
};

export const sideToSide: Router = (view, fixed, sourceIn, targetIn, points, result) => {
  const pt = points[0];
  const source = fixed.p0 ? freeState(fixed.p0) : sourceIn;
  const target = fixed.pe ? freeState(fixed.pe) : targetIn;
  if (!source || !target) return;
  const l = Math.max(source.x, target.x);
  const r = Math.min(source.x + source.width, target.x + target.width);
  const x = pt ? pt.x : Math.round(r + (l - r) / 2);
  let y1 = view.routingCenterY(source);
  let y2 = view.routingCenterY(target);
  if (pt) {
    if (pt.y >= source.y && pt.y <= source.y + source.height) y1 = pt.y;
    if (pt.y >= target.y && pt.y <= target.y + target.height) y2 = pt.y;
  }
  if (!contains(target, x, y1) && !contains(source, x, y1)) result.push({ x, y: y1 });
  if (!contains(target, x, y2) && !contains(source, x, y2)) result.push({ x, y: y2 });
  if (result.length === 1) {
    if (pt) {
      if (!contains(target, x, pt.y) && !contains(source, x, pt.y)) result.push({ x, y: pt.y });
    } else {
      const t = Math.max(source.y, target.y);
      const b = Math.min(source.y + source.height, target.y + target.height);
      result.push({ x, y: t + (b - t) / 2 });
    }
  }
};

export const topToBottom: Router = (view, fixed, sourceIn, targetIn, points, result) => {
  const pt = points[0];
  const source = fixed.p0 ? freeState(fixed.p0) : sourceIn;
  const target = fixed.pe ? freeState(fixed.pe) : targetIn;
  if (!source || !target) return;
  const t = Math.max(source.y, target.y);
  const b = Math.min(source.y + source.height, target.y + target.height);
  let x = view.routingCenterX(source);
  if (pt && pt.x >= source.x && pt.x <= source.x + source.width) x = pt.x;
  const y = pt ? pt.y : Math.round(b + (t - b) / 2);
  if (!contains(target, x, y) && !contains(source, x, y)) result.push({ x, y });
  x = pt && pt.x >= target.x && pt.x <= target.x + target.width ? pt.x : view.routingCenterX(target);
  if (!contains(target, x, y) && !contains(source, x, y)) result.push({ x, y });
  if (result.length === 1) {
    if (pt) {
      if (!contains(target, pt.x, y) && !contains(source, pt.x, y)) result.push({ x: pt.x, y });
    } else {
      const l = Math.max(source.x, target.x);
      const r = Math.min(source.x + source.width, target.x + target.width);
      result.push({ x: l + (r - l) / 2, y });
    }
  }
};
