import { cubicTo, clamp } from '../../../../core/plugins';
import type { SceneRenderer } from '../../../../core/plugins';
import { engrave, engravedBuilding, facesOf } from '../../generic/building';

/** Étiquette de façade par défaut d'une BDD (`spatial.tag` la remplace ; vide = aucune). */
export const DATABASE_TAG = 'DB';

/**
 * BDD : un bloc plein et droit, dont les quatre faces portent 2 ou 3 arcs « sourire » gravés, les
 * lèvres du pictogramme de base de données répétées (même gravure que les chevrons de la queue).
 * Le dessus est le toit, avec le label.
 */
export function isoDatabase(flat: SceneRenderer): SceneRenderer {
  return engravedBuilding(flat, DATABASE_TAG, ({ shape, group, height, stroke, plinth, band }) => {
    // Arcs au-dessus de la plinthe de l'étiquette.
    const count = band >= 24 ? 3 : 2;
    const grooveWidth = clamp(height * 0.08, 2, 4);
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
