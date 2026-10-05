import { Group } from 'three';
import type { Material, Object3D } from 'three';
import type { EdgeModel, PageModel, Point, ShapeModel } from '../model/types';
import { DEFAULT_EDGE_BADGE, darken, edgeBadge } from './decorations';
import { SPATIAL, spatialNumber } from '../spatial';
import { TOP_OFFSET } from './iso/block';
import { disposeObject } from './meshes';
import { createEdge } from './edges/edge';
import type { EdgeTerminals } from './edges/edge';
import type { PageDressing } from '../modes/types';
import type { ShapeRegistry } from '../shapes/registry';
import type { SceneLevel } from '../shapes/types';
import { applyPageSpace } from './space';
import { PARTS_PER_ELEMENT } from './types';
import type { RenderContext } from './types';

/** Scène Three.js d'une page (SPEC §7.4 : construite seulement pour les pages affichées). */
export interface PageScene {
  pageId: string;
  /** Niveau de rendu des formes de cette scène (`flat` = repli à plat pour toutes). */
  level: SceneLevel;
  /** Groupe racine en espace page ; à ajouter à la scène monde. */
  root: Group;
  dispose(): void;
}

/**
 * Niveau de scène effectif d'une page : le niveau demandé si au moins une forme visible de la
 * page a un rendu propre à ce niveau, sinon `flat` (la scène à plat sert telle quelle).
 */
export function effectiveLevel(page: PageModel, registry: ShapeRegistry, level: SceneLevel): SceneLevel {
  if (level === 'flat') return 'flat';
  return page.shapes.some((shape) => shape.visible && registry.hasLevel(shape, level)) ? level : 'flat';
}

export function buildPageScene(
  page: PageModel,
  registry: ShapeRegistry,
  ctx: RenderContext,
  level: SceneLevel = 'flat',
  dressing?: PageDressing,
): PageScene {
  const root = new Group();
  root.name = `page:${page.id}`;
  applyPageSpace(root);

  const hiddenLayers = new Set(page.layers.filter((l) => !l.visible).map((l) => l.id));
  const shapesById = new Map(page.shapes.map((shape) => [shape.id, shape]));

  // Ordre de dessin : rang dans la page, formes et arêtes confondues (pas la valeur brute de z).
  const ordered: Array<{ shape: ShapeModel } | { edge: EdgeModel }> = [
    ...page.shapes.map((shape) => ({ shape })),
    ...page.edges.map((edge) => ({ edge })),
  ].sort((a, b) => zOf(a) - zOf(b));

  // Volumes (niveau iso) : une forme est posée sur le dessus de son conteneur s'il est en volume.
  const elevation = volumeLayout(registry, ctx, level, shapesById);
  // Tracés des flèches déjà dessinées : celles du dessus sautent par-dessus (ticket 129).
  const below: Point[][] = [];

  ordered.forEach((item, rank) => {
    const element = 'shape' in item ? item.shape : item.edge;
    if (!element.visible || hiddenLayers.has(element.layerId)) return;

    let object;
    if ('shape' in item) {
      object = createShapeObject(item.shape, registry, ctx, level, {
        base: elevation.base(item.shape),
        height: elevation.height(item.shape),
      });
    } else {
      const terminals = {
        source: item.edge.sourceId ? shapesById.get(item.edge.sourceId) : undefined,
        target: item.edge.targetId ? shapesById.get(item.edge.targetId) : undefined,
      };
      object = createEdgeObject(item.edge, terminals, ctx, dressing, below);
      if (item.edge.style.noJump !== '1') below.push(edgeRoute(object));
      object.position.z = elevation.edgeBase(item.edge);
      object.userData.top = object.position.z;
    }

    object.userData.elementId = element.id;
    placeInDrawOrder(object, rank * PARTS_PER_ELEMENT);
    root.add(object);
  });

  return {
    pageId: page.id,
    level,
    root,
    dispose: () => disposeObject(root),
  };
}

/**
 * Objet d'une flèche, habillé par le mode de la page : couleur imposée au trait et aux pointes (le style draw.io
 * reste intact), pastille. Sert aussi à retracer une seule flèche (ex. pendant un déplacement).
 */
export function createEdgeObject(
  edge: EdgeModel,
  terminals: EdgeTerminals,
  ctx: RenderContext,
  dressing?: PageDressing,
  below: readonly Point[][] = [],
): Object3D {
  // Couleur du mode, assombrie pour le trait (paramètre « Assombrissement du trait »).
  const base = dressing?.edgeColor?.(edge);
  const color = base && darken(base, ctx.dressingDarken ?? DEFAULT_DRESSING_DARKEN);
  const object = createEdge(
    color ? { ...edge, style: { ...edge.style, strokeColor: color } } : edge,
    terminals,
    ctx,
    below,
  );
  const badge = dressing?.edgeBadge?.(edge);
  const route = object.userData.route as Point[] | undefined;
  if (badge && route && route.length >= 2) {
    object.add(edgeBadge(edge, route, badge, ctx));
    if ((ctx.edgeBadge ?? DEFAULT_EDGE_BADGE).labelFaceCamera) standLabels(object);
  }
  return object;
}

/** Tracé brut d'un objet de flèche, en coordonnées page (l'objet a pu être décalé pendant un déplacement). */
export function edgeRoute(object: Object3D): Point[] {
  const route = (object.userData.route as Point[] | undefined) ?? [];
  return route.map((p) => ({ x: p.x + object.position.x, y: p.y + object.position.y }));
}

/**
 * Redresse les textes d'une flèche face à la caméra (comme sa pastille) : chacun passe dans un groupe
 * `billboard = 'screen'` posé sur son point d'ancrage, qui sert de pivot.
 */
function standLabels(object: Object3D): void {
  const labels: Object3D[] = [];
  object.traverse((child) => {
    if (child.userData.labelCellId !== undefined && child.userData.labelAnchor) labels.push(child);
  });
  for (const label of labels) {
    const anchor = label.userData.labelAnchor as Point;
    const pivot = new Group();
    pivot.name = 'label-pivot';
    pivot.userData.billboard = 'screen';
    pivot.position.set(anchor.x, anchor.y, 0);
    label.parent!.add(pivot);
    label.position.x -= anchor.x;
    label.position.y -= anchor.y;
    pivot.add(label);
  }
}

/** Assombrissement par défaut du trait d'une flèche colorée par un mode (−25 % de luminosité). */
const DEFAULT_DRESSING_DARKEN = 0.25;

/** Biais de profondeur par rang, en unités de profondeur : assez pour départager au loin en perspective. */
const EDGE_DEPTH_BIAS = 16;
/** Au-delà de ce rang, le biais n'augmente plus (il reste négligeable devant l'épaisseur des volumes). */
const EDGE_BIAS_MAX_RANK = 256;

/**
 * Place l'objet d'un élément à son rang dans l'ordre de dessin (`base` = rang × PARTS_PER_ELEMENT).
 * Arêtes des volumes : deux formes accolées tracent la même ligne à la même profondeur ; un léger
 * biais de profondeur selon le rang fait gagner la dernière dessinée (comme dans draw.io) au lieu
 * d'un mélange des deux couleurs pixel par pixel.
 */
export function placeInDrawOrder(object: Object3D, base: number): void {
  const rank = Math.floor(base / PARTS_PER_ELEMENT);
  object.traverse((child) => {
    child.renderOrder += base;
    const material = (child as { material?: Material & { isLineMaterial?: boolean } }).material;
    if (material?.isLineMaterial) {
      material.polygonOffset = true;
      material.polygonOffsetUnits = -EDGE_DEPTH_BIAS * (Math.min(rank, EDGE_BIAS_MAX_RANK) + 1);
    }
  });
}

/**
 * Objet d'une forme, posé à sa hauteur (`base` : dessous du volume, `height` : épaisseur) :
 * rendu du niveau demandé (repli à plat). Sert aussi à
 * reconstruire une seule forme (ex. pendant un redimensionnement).
 */
export function createShapeObject(
  shape: ShapeModel,
  registry: ShapeRegistry,
  ctx: RenderContext,
  level: SceneLevel,
  elevation: { base: number; height: number },
): Object3D {
  const object = registry.sceneRenderer(shape, level).create(shape, ctx);
  if (level === 'iso') groundOutsideLabels(object);
  object.position.z = elevation.base;
  object.userData.base = elevation.base;
  object.userData.top = elevation.base + elevation.height;
  return object;
}

/**
 * Label hors de la forme (`labelPosition`, `verticalLabelPosition`) en iso / 3D : posé au sol à côté du
 * volume (sur la base de la forme), et non sur son toit, quel que soit le rendu qui l'a créé.
 */
function groundOutsideLabels(object: Object3D): void {
  object.traverse((child) => {
    if (!child.userData.outsideLabel) return;
    let above = 0;
    for (let parent = child.parent; parent && parent !== object; parent = parent.parent) above += parent.position.z;
    child.position.z = TOP_OFFSET - above;
  });
}

function zOf(item: { shape: ShapeModel } | { edge: EdgeModel }): number {
  return 'shape' in item ? item.shape.z : item.edge.z;
}

/**
 * Hauteurs des volumes d'une page (niveau iso) : base (altitude du dessous) et épaisseur de chaque
 * forme. Une forme contenue est posée sur le dessus de son conteneur ; une arête est à la hauteur
 * de la plus haute de ses extrémités (ou du dessus de son conteneur). Tout vaut 0 à plat.
 */
function volumeLayout(
  registry: ShapeRegistry,
  ctx: RenderContext,
  level: SceneLevel,
  shapesById: Map<string, ShapeModel>,
) {
  const flat = level !== 'iso';
  const height = (shape: ShapeModel): number => {
    if (flat || !registry.hasLevel(shape, 'iso') || shape.style.fillColor === 'none') return 0;
    return registry.volumeHeight(shape, ctx);
  };
  const bases = new Map<string, number>();
  const base = (shape: ShapeModel, seen = new Set<string>()): number => {
    if (flat) return 0;
    const cached = bases.get(shape.id);
    if (cached !== undefined) return cached;
    const parent = shape.parentId ? shapesById.get(shape.parentId) : undefined;
    const below = parent && !seen.has(parent.id) ? base(parent, seen.add(shape.id)) + height(parent) : 0;
    // `spatial.elevation` : la forme flotte au-dessus de sa base (sol ou dessus de son conteneur).
    const value = below + (spatialNumber(shape, SPATIAL.elevation) ?? 0);
    bases.set(shape.id, value);
    return value;
  };
  const edgeBase = (edge: EdgeModel): number => {
    if (flat) return 0;
    const ends = [edge.sourceId, edge.targetId].map((id) => (id ? shapesById.get(id) : undefined));
    const parent = edge.parentId ? shapesById.get(edge.parentId) : undefined;
    return Math.max(
      0,
      ...ends.filter((s): s is ShapeModel => s !== undefined).map((s) => base(s)),
      parent ? base(parent) + height(parent) : 0,
    );
  };
  return { height, base, edgeBase };
}
