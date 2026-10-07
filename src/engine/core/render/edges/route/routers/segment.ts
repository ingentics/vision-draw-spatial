import type { Point } from '../../../../model/types';
import { contains, r10, scaled, scaledPoint } from './state';
import type { Router, State } from './state';

/** Routeur à segments (`mxEdgeStyle.SegmentConnector`). */

/** Segments orthogonaux passant par les points intermédiaires (mxEdgeStyle.SegmentConnector). */
export const segmentConnector: Router = (view, fixed, sourceIn, targetIn, controlHints, result) => {
  const pts = [scaledPoint(fixed.p0), scaledPoint(fixed.pe)];
  const source = scaled(sourceIn);
  const target = scaled(targetIn);
  const tol = 1;
  const tempPoints: Point[] = [];
  let lastPushed: Point | null = result.length > 0 ? result[0]! : null;
  let horizontal = true;
  let hint: Point | null = null;
  let pe: Point | undefined;

  const pushPoint = (p: Point) => {
    p.x = r10(p.x);
    p.y = r10(p.y);
    if (!lastPushed || Math.abs(lastPushed.x - p.x) >= tol || Math.abs(lastPushed.y - p.y) >= 1) {
      result.push(p);
      lastPushed = p;
    }
  };

  let pt: Point | undefined = pts[0]
    ? { ...pts[0] }
    : source
      ? { x: view.routingCenterX(source), y: view.routingCenterY(source) }
      : undefined;
  const lastInx = pts.length - 1;

  if (controlHints.length > 0) {
    let hints = controlHints.map((p) => ({ ...p }));
    // Premier et dernier point intermédiaires alignés sur les bouts fixes, à 1 px près.
    if (pt && hints[0]) {
      if (Math.abs(hints[0].x - pt.x) < tol) hints[0].x = pt.x;
      if (Math.abs(hints[0].y - pt.y) < tol) hints[0].y = pt.y;
    }
    pe = pts[lastInx];
    const lastHint = hints[hints.length - 1];
    if (pe && lastHint) {
      if (Math.abs(lastHint.x - pe.x) < tol) lastHint.x = pe.x;
      if (Math.abs(lastHint.y - pe.y) < tol) lastHint.y = pe.y;
    }
    hint = hints[0]!;

    let currentTerm: State | undefined = source;
    let currentPt = pts[0];
    let currentHint = hint;
    if (currentPt) currentTerm = undefined;

    // Orientation du premier segment : alignement sur un bout fixe, ou « canal » d'une forme.
    for (let i = 0; i < 2; i++) {
      const fixedVertAlign = !!currentPt && currentPt.x === currentHint.x;
      const fixedHozAlign = !!currentPt && currentPt.y === currentHint.y;
      const inHozChan =
        !!currentTerm && currentHint.y >= currentTerm.y && currentHint.y <= currentTerm.y + currentTerm.height;
      const inVertChan =
        !!currentTerm && currentHint.x >= currentTerm.x && currentHint.x <= currentTerm.x + currentTerm.width;
      const hozChan = fixedHozAlign || (!currentPt && inHozChan);
      const vertChan = fixedVertAlign || (!currentPt && inVertChan);

      if (!(i === 0 && ((hozChan && vertChan) || (fixedVertAlign && fixedHozAlign)))) {
        if (currentPt && !fixedHozAlign && !fixedVertAlign && (inHozChan || inVertChan)) {
          horizontal = !inHozChan;
          break;
        }
        if (vertChan || hozChan) {
          horizontal = hozChan;
          // Depuis la cible : on remonte le nombre de points.
          if (i === 1) horizontal = hints.length % 2 === 0 ? hozChan : vertChan;
          break;
        }
      }
      currentTerm = target;
      currentPt = pts[lastInx];
      if (currentPt) currentTerm = undefined;
      currentHint = hints[hints.length - 1]!;
      if (fixedVertAlign && fixedHozAlign) hints = hints.slice(1);
    }

    if (
      horizontal &&
      ((pts[0] && pts[0].y !== hint.y) ||
        (!pts[0] && source && (hint.y < source.y || hint.y > source.y + source.height)))
    ) {
      tempPoints.push({ x: pt!.x, y: hint.y });
    } else if (
      !horizontal &&
      ((pts[0] && pts[0].x !== hint.x) ||
        (!pts[0] && source && (hint.x < source.x || hint.x > source.x + source.width)))
    ) {
      tempPoints.push({ x: hint.x, y: pt!.y });
    }
    if (horizontal) pt!.y = hint.y;
    else pt!.x = hint.x;

    for (const h of hints) {
      horizontal = !horizontal;
      hint = h;
      if (horizontal) pt!.y = hint.y;
      else pt!.x = hint.x;
      tempPoints.push({ ...pt! });
    }
  } else {
    hint = pt ?? null;
    horizontal = true;
  }

  // Dernier coude vers le bout d'arrivée.
  pt = pts[lastInx] ?? (target ? { x: view.routingCenterX(target), y: view.routingCenterY(target) } : undefined);
  if (pt && hint) {
    const end = pts[lastInx];
    if (
      horizontal &&
      ((end && end.y !== hint.y) || (!end && target && (hint.y < target.y || hint.y > target.y + target.height)))
    ) {
      tempPoints.push({ x: pt.x, y: hint.y });
    } else if (
      !horizontal &&
      ((end && end.x !== hint.x) || (!end && target && (hint.x < target.x || hint.x > target.x + target.width)))
    ) {
      tempPoints.push({ x: hint.x, y: pt.y });
    }
  }

  // Coudes à l'intérieur des formes retirés.
  if (!pts[0] && source)
    while (tempPoints.length > 0 && contains(source, tempPoints[0]!.x, tempPoints[0]!.y)) tempPoints.shift();
  if (!pts[lastInx] && target)
    while (
      tempPoints.length > 0 &&
      contains(target, tempPoints[tempPoints.length - 1]!.x, tempPoints[tempPoints.length - 1]!.y)
    )
      tempPoints.pop();

  for (const p of tempPoints) pushPoint(p);

  // Dernier point confondu avec le bout d'arrivée : retiré, l'avant-dernier aligné sur lui.
  const last = result[result.length - 1];
  if (pe && last && Math.abs(pe.x - last.x) <= tol && Math.abs(pe.y - last.y) <= tol) {
    result.splice(result.length - 1, 1);
    const previous = result[result.length - 1];
    if (previous) {
      if (Math.abs(previous.x - pe.x) < tol) previous.x = pe.x;
      if (Math.abs(previous.y - pe.y) < tol) previous.y = pe.y;
    }
  }
};
