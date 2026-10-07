import type { Point } from '../model/types';
import type { MinimapBrush } from '../shapes/types';

/** Trait des dessins de la mini-carte, en pixels. */
const DEFAULT_LINE_WIDTH = 0.75;
const DEFAULT_FILL = '#ffffff';

function tracePath(context: CanvasRenderingContext2D, points: readonly Point[]): void {
  context.beginPath();
  points.forEach((p, i) => {
    if (i === 0) context.moveTo(p.x, p.y);
    else context.lineTo(p.x, p.y);
  });
}

/** Le pinceau d'une forme sur le vrai contexte 2D de la mini-carte : seul endroit qui y trace un polygone. */
export function canvasBrush(context: CanvasRenderingContext2D): MinimapBrush {
  return {
    polygon(points, { fill, stroke, lineWidth = DEFAULT_LINE_WIDTH }) {
      if (points.length < 2) return;
      tracePath(context, points);
      context.closePath();
      if (fill !== undefined) {
        // Une couleur invalide est ignorée par le canvas : on part du blanc par défaut.
        context.fillStyle = DEFAULT_FILL;
        context.fillStyle = fill;
        context.fill();
      }
      if (stroke !== undefined) {
        context.lineWidth = lineWidth;
        context.strokeStyle = stroke;
        context.stroke();
      }
    },
    polyline(points, { stroke, lineWidth = DEFAULT_LINE_WIDTH }) {
      if (points.length < 2) return;
      tracePath(context, points);
      context.lineWidth = lineWidth;
      context.strokeStyle = stroke;
      context.stroke();
    },
  };
}
