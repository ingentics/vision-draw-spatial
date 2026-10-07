import type { Object3D } from 'three';
import type { PageModel, Point, Rect } from '../model/types';
import { outsideLabelBox } from '../render/labelPosition';
import { edgeRoute } from '../render/pageScene';
import type { EffectRoom } from './types';
import { boundsOfPoints, distance, segmentDistance, unionOf, rectDistance } from '../model/geometry';

/** Texte de flèche (texte troika) : de quoi estimer son encombrement. */
interface LabelText {
  text?: string;
  fontSize?: number;
}

/**
 * Place prise par le schéma d'une scène de page : emprises des formes affichées (et de leur texte hors de la forme),
 * tracés des flèches et textes des flèches (cercle autour de leur ancrage, à la taille du texte).
 */
export function pageRoom(page: PageModel, root: Object3D): EffectRoom {
  const shown = new Set(root.children.map((child) => child.userData.elementId as string | undefined));
  const rects: Rect[] = [];
  for (const shape of page.shapes) {
    if (!shown.has(shape.id)) continue;
    rects.push(shape.bounds);
    const outside = outsideLabelBox(shape.bounds, shape.style);
    if (outside) rects.push(outside);
  }
  const segments: Array<[Point, Point]> = [];
  const circles: Array<{ center: Point; radius: number }> = [];
  for (const child of root.children) {
    if (child.userData.elementId === undefined || !child.userData.route) continue;
    const route = edgeRoute(child);
    for (let i = 1; i < route.length; i++) segments.push([route[i - 1]!, route[i]!]);
    child.traverse((part) => {
      const anchor = part.userData.labelAnchor as Point | undefined;
      if (!anchor) return;
      const { text = '', fontSize = 11 } = part as LabelText;
      const lines = text.split('\n');
      const longest = Math.max(...lines.map((line) => line.length));
      const radius = Math.max(longest * fontSize * 0.3, lines.length * fontSize * 0.6) + 4;
      circles.push({ center: { x: anchor.x + child.position.x, y: anchor.y + child.position.y }, radius });
    });
  }

  return {
    bounds: unionOf([
      ...rects,
      ...segments.map(([a, b]) => boundsOfPoints([a, b])!),
      ...circles.map(({ center, radius }) => ({
        x: center.x - radius,
        y: center.y - radius,
        width: 2 * radius,
        height: 2 * radius,
      })),
    ]),
    distance(p) {
      let best = Infinity;
      for (const r of rects) best = Math.min(best, rectDistance(r, p));
      for (const [a, b] of segments) best = Math.min(best, segmentDistance(p, a, b));
      for (const { center, radius } of circles) best = Math.min(best, Math.max(0, distance(center, p) - radius));
      return best;
    },
  };
}
