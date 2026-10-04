import type { Group } from 'three';
import type { Point, ShapeModel } from '../../model/types';
import { SPATIAL } from '../../spatial';
import type { SceneRenderer } from '../types';
import { building, engrave, facadeTag, facesOf, plinthOf, rectBlock, strokeOf, tagOf, tagSize } from './building';

/** Étiquette de façade par défaut d'une queue (`spatial.tag` la remplace ; vide = aucune). */
export const QUEUE_TAG = 'QUEUE';

/**
 * Queue : un bloc dont les faces longues portent une rangée de chevrons ▶ dans le sens du flux (vers
 * le bout visible en 2D : à droite, à gauche si `toLeft`), comme un convoyeur ; chaque bout porte un
 * cercle gravé au même niveau, centré sur la face (l'embouchure de la file). Le toit est le dessus du
 * bloc, avec le label.
 */
export function isoQueue(flat: SceneRenderer, toLeft: (shape: ShapeModel) => boolean): SceneRenderer {
  return building(flat, (shape, ctx, height, group) => {
    const { bounds } = shape;
    const block = rectBlock.create(
      { ...shape, style: { ...shape.style, [SPATIAL.height]: String(height) } },
      ctx,
    ) as Group;
    block.name = 'roof';
    group.add(block);
    const tag = tagOf(shape, ctx, QUEUE_TAG);
    if (tag) facadeTag(group, shape, ctx, tag, tagSize(height));
    const stroke = strokeOf(shape);
    if (!stroke) return;
    const [north, south, west, east] = facesOf(bounds);
    // Chevrons au-dessus de la plinthe de l'étiquette.
    const plinth = plinthOf(tag, height);
    const band = height - plinth;
    const step = Math.max(12, band * 0.9);
    const count = Math.max(1, Math.floor(bounds.width / step));
    const half = Math.min(step * 0.18, band * 0.22);
    const rise = band * 0.28;
    const grooveWidth = Math.max(2.5, Math.min(6, band * 0.12));
    const z = plinth + band / 2;
    for (const [face, mirrored] of [
      [north!, false],
      [south!, true],
    ] as const) {
      for (let i = 0; i < count; i++) {
        // Centre du chevron le long de la face, en coordonnées page (x croissant), puis repère de la face.
        const cx = (bounds.width / count) * (i + 0.5);
        const right = !toLeft(shape);
        const tip = right ? cx + half : cx - half;
        const back = right ? cx - half : cx + half;
        const chevron: Point[] = [
          { x: back, y: z + rise },
          { x: tip, y: z },
          { x: back, y: z - rise },
        ].map((p) => (mirrored ? { x: bounds.width - p.x, y: p.y } : p));
        engrave(group, face, chevron, shape, stroke, grooveWidth);
      }
    }
    // Bouts : un cercle au niveau des chevrons, centré sur la face (rayon de la hauteur d'un chevron).
    for (const face of [west!, east!]) {
      const radius = Math.min(rise, face.length * 0.35);
      if (radius <= grooveWidth) continue;
      const circle: Point[] = Array.from({ length: CIRCLE_STEPS + 1 }, (_, i) => {
        const angle = (i / CIRCLE_STEPS) * 2 * Math.PI;
        return { x: face.length / 2 + Math.cos(angle) * radius, y: z + Math.sin(angle) * radius };
      });
      engrave(group, face, circle, shape, stroke, grooveWidth);
    }
  });
}

/** Segments d'un cercle gravé sur une façade. */
const CIRCLE_STEPS = 32;
