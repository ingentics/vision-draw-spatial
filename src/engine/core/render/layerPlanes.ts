import { Color, Group } from 'three';
import type { Object3D } from 'three';
import { rectPath } from '../model/geometry';
import { byId } from '../model/pageIndex';
import type { PageModel } from '../model/types';
import { fillMesh, strokeMesh } from './meshes';

/**
 * Plans des calques en volume (sujet 525) et leur aplatissement animé (sujet 526) : un plan translucide par niveau d'élévation des calques visibles (deux
 * calques au même niveau n'en font qu'un), tous à l'emprise de la page ; celui du calque courant à l'accent. Le niveau
 * 0 (le sol, que la grille montre déjà) seulement si `ground`.
 */

/** Nom du groupe des plans dans la scène d'une page, pour le retrouver et le remplacer. */
export const LAYER_PLANES = 'layer-planes';

/** Marge autour de l'emprise de la page, en pixels de page. */
const MARGIN = 20;
const NEUTRAL = '#808080';
const LOOK = { neutral: { fill: 0.06, stroke: 0.3 }, current: { fill: 0.12, stroke: 0.6 } };

export function layerPlanes(
  page: PageModel,
  currentLayerId: string | undefined,
  accent: string,
  ground: boolean,
  spread = 1,
): Group | undefined {
  const levels = [
    ...new Set(page.layers.filter((l) => l.visible && (ground || l.elevation > 0)).map((l) => l.elevation)),
  ];
  const { x, y, width, height } = page.bounds;
  if (levels.length === 0 || (width === 0 && height === 0)) return undefined;
  const outline = rectPath({ x: x - MARGIN, y: y - MARGIN, width: width + 2 * MARGIN, height: height + 2 * MARGIN });
  const currentLevel = byId(page.layers, currentLayerId)?.elevation;
  const group = new Group();
  group.name = LAYER_PLANES;
  for (const level of levels) {
    const current = level === currentLevel;
    const color = new Color(current ? accent : NEUTRAL);
    const look = current ? LOOK.current : LOOK.neutral;
    const plane = new Group();
    const fill = fillMesh(outline, color, look.fill);
    const stroke = strokeMesh(outline, color, look.stroke, { width: 1, closed: true });
    // Sous tout le contenu dans l'ordre de dessin (les éléments partent de 0) : le plan ne cache rien.
    fill.renderOrder = -2;
    plane.add(fill);
    if (stroke) {
      stroke.renderOrder = -1;
      plane.add(stroke);
    }
    plane.userData.level = level;
    plane.position.z = level * spread;
    group.add(plane);
  }
  group.visible = spread > 0;
  return group;
}

/**
 * Calques aplatis ou étendus en partie (sujet 526), sans reconstruire la scène : chaque élément descend de la part de
 * l'élévation de son calque (`userData.layerLift`) qui sépare `spread` de celle de la construction
 * (`root.userData.layerSpread`) ; les plans suivent leur niveau et disparaissent à plat.
 */
export function spreadLayers(root: Object3D, spread: number): void {
  const built = (root.userData.layerSpread as number | undefined) ?? 1;
  for (const child of root.children) {
    const lift = child.userData.layerLift as number | undefined;
    if (lift) {
      child.userData.builtZ ??= child.position.z;
      child.position.z = (child.userData.builtZ as number) + lift * (spread - built);
    }
    if (child.name !== LAYER_PLANES) continue;
    child.visible = spread > 0;
    for (const plane of child.children) plane.position.z = (plane.userData.level as number) * spread;
  }
}
