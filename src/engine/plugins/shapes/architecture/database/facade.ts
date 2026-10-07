import { SPATIAL, cubicTo } from '../../../../core/plugins';
import type { SceneRenderer } from '../../../../core/plugins';
import {
  building,
  engrave,
  facadeTag,
  facesOf,
  plinthOf,
  rectBlock,
  strokeOf,
  tagOf,
  tagSize,
} from '../../generic/building';

/** Étiquette de façade par défaut d'une BDD (`spatial.tag` la remplace ; vide = aucune). */
export const DATABASE_TAG = 'DB';

/**
 * BDD : un bloc plein et droit, dont les quatre faces portent 2 ou 3 arcs « sourire » gravés, les
 * lèvres du pictogramme de base de données répétées (même gravure que les chevrons de la queue).
 * Le dessus est le toit, avec le label.
 */
export function isoDatabase(flat: SceneRenderer): SceneRenderer {
  return building(flat, (shape, ctx, height, group) => {
    const block = rectBlock.create({ ...shape, style: { ...shape.style, [SPATIAL.height]: String(height) } }, ctx);
    block.name = 'roof';
    group.add(block);
    const tag = tagOf(shape, ctx, DATABASE_TAG);
    if (tag) facadeTag(group, shape, ctx, tag, tagSize(height));
    const stroke = strokeOf(shape);
    if (!stroke) return;
    // Arcs au-dessus de la plinthe de l'étiquette.
    const plinth = plinthOf(tag, height);
    const band = height - plinth;
    const count = band >= 24 ? 3 : 2;
    const grooveWidth = Math.max(2, Math.min(4, height * 0.08));
    for (const face of facesOf(shape.bounds)) {
      const pad = Math.min(4, face.length * 0.08);
      const sag = Math.min(band / (count + 1) / 2, face.length * 0.1);
      for (let i = 0; i < count; i++) {
        // Du haut vers le bas, sous le toit ; l'arc descend au milieu de la face, comme une lèvre.
        const v = plinth + (band * (count - i)) / (count + 1) + sag / 2;
        const start = { x: pad, y: v };
        const arc = [
          start,
          ...cubicTo(
            start,
            { x: pad, y: v - (4 / 3) * sag },
            { x: face.length - pad, y: v - (4 / 3) * sag },
            { x: face.length - pad, y: v },
          ),
        ];
        engrave(group, face, arc, shape, stroke, grooveWidth);
      }
    }
  });
}
