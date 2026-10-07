import { Color } from 'three';
import { PART_ORDER, fillMesh, rectPath, spatialNumber } from '../../../../core/plugins';
import type { SceneRenderer } from '../../../../core/plugins';
import { building, CAP_HEIGHT, darker, facadeTag, facesOf, slab, tagOf } from '../../generic/building';

/** Nombre de nœuds d'un cache distribué : disques empilés en iso / 3D. */
export const NODES = 'spatial.nodes';

/** Étiquette de façade par défaut d'un cache (`spatial.tag` la remplace ; vide = aucune). */
export const CACHE_TAG = 'CACHE';

/** Nombre de nœuds par défaut d'un cache distribué. */
export const DEFAULT_CACHE_NODES = 3;

/**
 * Cache distribué : l'épaisseur découpée en tranches (une par nœud, `spatial.nodes`), séparées par
 * une rainure en retrait plus sombre ; chaque tranche porte une rangée de voyants (couleur d'accent)
 * sur ses quatre faces. Le toit est la tranche du haut, avec le label.
 */
export function isoCache(flat: SceneRenderer): SceneRenderer {
  return building(flat, (shape, ctx, height, group) => {
    const { bounds } = shape;
    const nodes = Math.min(12, Math.max(1, Math.round(spatialNumber(shape, NODES) ?? DEFAULT_CACHE_NODES)));
    const groove = nodes > 1 ? Math.min(3, height / (nodes * 4)) : 0;
    const slabHeight = (height - groove * (nodes - 1)) / nodes;
    const inset = Math.min(3, bounds.width / 6, bounds.height / 6);
    const core = rectPath({
      x: bounds.x + inset,
      y: bounds.y + inset,
      width: bounds.width - 2 * inset,
      height: bounds.height - 2 * inset,
    });
    const accent = new Color(ctx.accent ?? '#1a73e8');
    // Étiquette sur la tranche du bas, à sa hauteur.
    const tag = tagOf(shape, ctx, CACHE_TAG);
    // Voyants : petits carrés à gauche de chaque face, centrés dans leur tranche.
    const ledSize = Math.max(1.5, Math.min(3, slabHeight * 0.25));
    const ledMargin = ledSize * 1.5;
    if (tag) {
      // Dans la tranche du bas, centrée sur la rangée de voyants, à la même marge du bord.
      const size = slabHeight * 0.6;
      facadeTag(group, shape, ctx, tag, size, {
        baseline: slabHeight / 2 - (CAP_HEIGHT * size) / 2,
        margin: ledMargin,
      });
    }
    for (let i = 0; i < nodes; i++) {
      const z = i * (slabHeight + groove);
      const top = i === nodes - 1;
      const part = slab(shape, ctx, rectPath(bounds), z, slabHeight, { label: top });
      part.name = top ? 'roof' : `node:${i}`;
      group.add(part);
      if (!top) group.add(slab(shape, ctx, core, z + slabHeight, groove, { fill: darker(shape, 0.7) }));
      // Voyants : trois petits carrés près d'un bout de chaque face, à mi-hauteur de la tranche.
      const size = ledSize;
      for (const face of facesOf(bounds)) {
        for (let k = 0; k < 3; k++) {
          // À gauche de la face vu de l'extérieur (l'étiquette est en bas à droite).
          const u = face.length - ledMargin - size * (1 + 2 * k);
          if (u < 0) break;
          const led = fillMesh(
            rectPath({ x: u, y: z + slabHeight / 2 - size / 2, width: size, height: size }),
            accent,
            1,
          );
          led.name = 'led';
          led.renderOrder = PART_ORDER.label;
          group.add(face.place(led));
        }
      }
    }
  });
}
