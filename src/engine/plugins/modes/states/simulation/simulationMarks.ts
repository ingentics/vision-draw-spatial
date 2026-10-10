import { Color, Group, Mesh } from 'three';
import type { MeshBasicMaterial, Object3D } from 'three';
import type { EdgeBadgeStyle, EdgeModel, Point, Rect, RenderContext } from '../../../../core/plugins';
import {
  DEFAULT_EDGE_BADGE,
  darken,
  edgeBadge,
  ellipsePath,
  fillMesh,
  offsetOutline,
  strokeMesh,
} from '../../../../core/plugins';

/**
 * Marques de la simulation d'une machine à états (sujet 462), dans la couche que le moteur dessine par-dessus la page
 * (sujet 461) : état courant (bordure et halo), ensembles parents (cadre), états visités (teinte, compteur), transitions
 * proposées (pointillés, pastille) et empruntées, point qui parcourt la transition franchie. Tailles en pixels de page.
 */

/** Couleur des mises en avant. */
export const SIMULATION_COLOR = '#1e88e5';
/** Bordure de l'état courant ; halo : largeur, écart à la forme, opacités extrêmes, période de la pulsation (ms). */
const BORDER_WIDTH = 3;
const HALO = { width: 10, gap: 6, min: 0.12, max: 0.45, period: 1200 };
const FRAME_WIDTH = 1.5;
const TINT_OPACITY = 0.14;
const ROUTE_WIDTH = 2.5;
/** Tirets des transitions proposées, et leur défilement (pixels de page par seconde). */
const DASH = { pattern: [8, 6], speed: 24 };
/** Pastille du compteur de passages, au coin haut-droit d'un état visité. */
const COUNT_BADGE = { radius: 9, textSize: 10 };
/** Point du franchissement : diamètre (pixels de page). */
export const DOT_SIZE = 8;

/** Pastille d'une transition proposée : texte blanc gras sur la couleur de la simulation. */
export const PROPOSED_BADGE: EdgeBadgeStyle = {
  ...DEFAULT_EDGE_BADGE,
  borderColor: darken(SIMULATION_COLOR, 0.25),
  textColor: '#ffffff',
  bold: true,
};

/**
 * Marque posée au rang `rank` de la couche : dans son propre groupe, d'ordre `rank` (Three.js trie d'abord par le
 * groupe le plus proche, puis par objet) ; les rangs suivants passent devant.
 */
export function ranked(object: Object3D, rank: number): Group {
  const group = new Group();
  group.add(object);
  group.traverse((o) => {
    o.renderOrder += rank * 100;
    if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
  });
  return group;
}

/** Bordure épaisse de l'état courant et son halo (opacité réglée par `pulseHalo`). */
export function currentMark(outline: Point[]): { object: Group; halo: Mesh } {
  const group = new Group();
  const tint = new Color(SIMULATION_COLOR);
  const halo = strokeMesh(offsetOutline(outline, HALO.gap + HALO.width / 2), tint, HALO.max, {
    width: HALO.width,
    closed: true,
  })!;
  const border = strokeMesh(offsetOutline(outline, BORDER_WIDTH / 2), tint, 1, { width: BORDER_WIDTH, closed: true });
  group.add(halo);
  if (border) group.add(border);
  return { object: group, halo };
}

/** Halo `elapsed` ms après l'affichage : son opacité monte puis redescend ; immobile à mi-hauteur sans animation. */
export function pulseHalo(halo: Mesh | undefined, elapsed: number | undefined): void {
  if (!halo) return;
  const t = elapsed === undefined ? 0.5 : (elapsed % HALO.period) / HALO.period;
  const wave = 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
  (halo.material as MeshBasicMaterial).opacity = HALO.min + (HALO.max - HALO.min) * wave;
}

/** Cadre léger d'un ensemble parent. */
export function frameMark(outline: Point[]): Object3D | undefined {
  return (
    strokeMesh(offsetOutline(outline, FRAME_WIDTH), new Color(SIMULATION_COLOR), 0.8, {
      width: FRAME_WIDTH,
      closed: true,
    }) ?? undefined
  );
}

/** Teinte d'un état visité. */
export function visitTint(outline: Point[]): Object3D {
  return fillMesh(outline, new Color(SIMULATION_COLOR), TINT_OPACITY);
}

/** Pastille « ×N » des passages, au coin haut-droit de `bounds`. */
export function countBadge(bounds: Rect, count: number, ctx: RenderContext): Group {
  const group = new Group();
  const { radius, textSize } = COUNT_BADGE;
  const corner = { x: bounds.x + bounds.width, y: bounds.y };
  const disc = fillMesh(
    ellipsePath({ x: corner.x - radius, y: corner.y - radius, width: 2 * radius, height: 2 * radius }, 32),
    new Color(SIMULATION_COLOR),
    1,
  );
  disc.renderOrder = 1;
  const text = ctx.text.create({
    text: `×${count}`,
    x: corner.x,
    y: corner.y,
    anchorX: 'center',
    anchorY: 'middle',
    align: 'center',
    fontSize: textSize,
    color: new Color('#ffffff'),
    opacity: 1,
    bold: true,
  });
  text.renderOrder = 2;
  group.add(disc, text);
  return group;
}

/** Pointillés d'une transition proposée, `elapsed` ms après l'affichage : ils défilent vers la cible. */
export function proposedRoute(route: Point[], elapsed: number | undefined): Object3D | undefined {
  return (
    strokeMesh(route, new Color(SIMULATION_COLOR), 1, {
      width: ROUTE_WIDTH,
      closed: false,
      dash: DASH.pattern,
      // Décalage décroissant : les tirets avancent dans le sens de la flèche.
      dashOffset: elapsed === undefined ? 0 : (-elapsed / 1000) * DASH.speed,
    }) ?? undefined
  );
}

/** Pastille d'une transition proposée (numéro du choix), devant son nom. */
export function proposedBadge(edge: EdgeModel, route: Point[], text: string, ctx: RenderContext): Group {
  return edgeBadge(edge, route, { text, color: SIMULATION_COLOR }, PROPOSED_BADGE, ctx);
}

/** Trait plein assombri d'une transition empruntée. */
export function takenRoute(route: Point[]): Object3D | undefined {
  return (
    strokeMesh(route, new Color(darken(SIMULATION_COLOR, 0.25)), 1, { width: ROUTE_WIDTH, closed: false }) ?? undefined
  );
}

/** Point qui parcourt la transition franchie, centré en `at`. */
export function crossingDot(at: Point): Object3D {
  return fillMesh(
    ellipsePath({ x: at.x - DOT_SIZE / 2, y: at.y - DOT_SIZE / 2, width: DOT_SIZE, height: DOT_SIZE }, 24),
    new Color(darken(SIMULATION_COLOR, 0.25)),
    1,
  );
}
