import { arcPath, clamp } from '../../../../core/plugins';
import type { Point, SceneRenderer, ShapeModel } from '../../../../core/plugins';
import { engrave, engravedBuilding, facesOf } from '../../generic/building';

/** Étiquette de façade par défaut d'une queue (`spatial.tag` la remplace ; vide = aucune). */
export const QUEUE_TAG = 'QUEUE';

/**
 * Queue : un bloc dont les faces longues portent une rangée de chevrons ▶ dans le sens du flux (vers
 * le bout visible en 2D : à droite, à gauche si `toLeft`), comme un convoyeur ; chaque bout porte un
 * cercle gravé au même niveau, centré sur la face (l'embouchure de la file). Le toit est le dessus du
 * bloc, avec le label.
 */
export function isoQueue(flat: SceneRenderer, toLeft: (shape: ShapeModel) => boolean): SceneRenderer {
  return engravedBuilding(flat, QUEUE_TAG, ({ shape, group, stroke, plinth, band }) => {
    const { bounds } = shape;
    const [north, south, west, east] = facesOf(bounds);
    // Chevrons au-dessus de la plinthe de l'étiquette.
    const step = Math.max(12, band * 0.9);
    const count = Math.max(1, Math.floor(bounds.width / step));
    const half = Math.min(step * 0.18, band * 0.22);
    const rise = band * 0.28;
    const grooveWidth = clamp(band * 0.12, 2.5, 6);
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
      const circle = arcPath({ x: face.length / 2, y: z }, radius, 0, 2 * Math.PI, CIRCLE_STEPS);
      engrave(group, face, circle, shape, stroke, grooveWidth);
    }
  });
}

/** Segments d'un cercle gravé sur une façade. */
const CIRCLE_STEPS = 32;
