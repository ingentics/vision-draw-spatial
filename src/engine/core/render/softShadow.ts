import { Color, Group } from 'three';
import type { Point } from '../model/types';
import { fillMesh } from './meshes';
import { PART_ORDER } from './types';

/**
 * Ombre douce sous un papier posé à plat (sujets 411, 482) : couches de plus en plus étendues, chacune assez
 * transparente pour qu'au centre, où elles se superposent toutes, elles donnent `opacity`.
 */
export interface SoftShadow {
  /** Étendue du flou : la dernière couche est étendue d'environ `blur`. */
  blur: number;
  /** Opacité au plus foncé (noir). */
  opacity: number;
  layers: number;
}

/** Ombre douce dont `layerPath(spread)` donne le contour de chaque couche, étendue de `spread` (0 à `blur`). */
export function softShadow(layerPath: (spread: number) => Point[], { blur, opacity, layers }: SoftShadow): Group {
  const group = new Group();
  group.name = 'shadow';
  const layer = 1 - Math.pow(1 - opacity, 1 / layers);
  for (let i = 0; i < layers; i++) {
    const mesh = fillMesh(layerPath((blur * (i + 0.5)) / layers), new Color('#000000'), layer);
    mesh.name = 'shadow';
    // Sous le papier, sous tous les angles : dessinée juste avant son fond, dans la place libre (la 4e) de l'élément
    // précédent, au lieu d'être départagée par la profondeur (en iso, l'ombre passerait devant le papier).
    mesh.renderOrder = PART_ORDER.fill - 1;
    group.add(mesh);
  }
  return group;
}
