import { Group } from 'three';
import { isNavigableLink } from '../format/link';
import type { EdgeModel, PageModel, ShapeModel } from '../model/types';
import { linkBadge } from './decorations';
import { blockHeight } from './iso/block';
import { disposeObject } from './meshes';
import { createEdge } from './edges/edge';
import type { ShapeRegistry } from './shapes/registry';
import type { SceneLevel } from './shapes/types';
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

  ordered.forEach((item, rank) => {
    const element = 'shape' in item ? item.shape : item.edge;
    if (!element.visible || hiddenLayers.has(element.layerId)) return;

    let object;
    if ('shape' in item) {
      // Rendu du niveau demandé, repli à plat si la forme n'en a pas.
      object = registry.sceneRenderer(item.shape, level).create(item.shape, ctx);
      // `spatial.noLinkBadge=1` : lien sans pastille (ex. cartes de la vue graphe, entièrement cliquables).
      if (isNavigableLink(item.shape.link) && item.shape.style['spatial.noLinkBadge'] !== '1') {
        const badge = linkBadge(item.shape, item.shape.link);
        badge.position.z = elevation.height(item.shape) + 0.1; // posée sur le dessus du bloc
        object.add(badge);
      }
      object.position.z = elevation.base(item.shape);
      object.userData.top = elevation.base(item.shape) + elevation.height(item.shape);
    } else {
      const terminals = {
        source: item.edge.sourceId ? shapesById.get(item.edge.sourceId) : undefined,
        target: item.edge.targetId ? shapesById.get(item.edge.targetId) : undefined,
      };
      object = createEdge(item.edge, terminals, ctx);
      object.position.z = elevation.edgeBase(item.edge);
      object.userData.top = object.position.z;
    }

    object.userData.elementId = element.id;
    const base = rank * PARTS_PER_ELEMENT;
    object.traverse((child) => {
      child.renderOrder += base;
    });
    root.add(object);
  });

  return {
    pageId: page.id,
    level,
    root,
    dispose: () => disposeObject(root),
  };
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
    return blockHeight(shape, ctx);
  };
  const bases = new Map<string, number>();
  const base = (shape: ShapeModel, seen = new Set<string>()): number => {
    if (flat) return 0;
    const cached = bases.get(shape.id);
    if (cached !== undefined) return cached;
    const parent = shape.parentId ? shapesById.get(shape.parentId) : undefined;
    const value = parent && !seen.has(parent.id) ? base(parent, seen.add(shape.id)) + height(parent) : 0;
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
