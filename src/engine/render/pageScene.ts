import { Group } from 'three';
import type { EdgeModel, PageModel, ShapeModel } from '../model/types';
import { disposeObject } from './meshes';
import type { RendererRegistry } from './registry';
import { createEdge } from './renderers/edge';
import { applyPageSpace } from './space';
import { PARTS_PER_ELEMENT } from './types';
import type { RenderContext } from './types';

/** Scène Three.js d'une page (SPEC §7.4 : construite seulement pour les pages affichées). */
export interface PageScene {
  pageId: string;
  /** Groupe racine en espace page ; à ajouter à la scène monde. */
  root: Group;
  /**
   * Éléments non supportés (SPEC §8.4) → nombre d'occurrences : nom de forme dessinée en placeholder,
   * ou style d'arête approché (ex. `edgeStyle=isometricEdgeStyle`).
   */
  unsupported: Map<string, number>;
  dispose(): void;
}

export function buildPageScene(page: PageModel, registry: RendererRegistry, ctx: RenderContext): PageScene {
  const root = new Group();
  root.name = `page:${page.id}`;
  applyPageSpace(root);

  const hiddenLayers = new Set(page.layers.filter((l) => !l.visible).map((l) => l.id));
  const unsupported = new Map<string, number>();

  const count = (key: string) => unsupported.set(key, (unsupported.get(key) ?? 0) + 1);
  const shapesById = new Map(page.shapes.map((shape) => [shape.id, shape]));

  // Ordre de dessin : rang dans la page, formes et arêtes confondues (pas la valeur brute de z).
  const ordered: Array<{ shape: ShapeModel } | { edge: EdgeModel }> = [
    ...page.shapes.map((shape) => ({ shape })),
    ...page.edges.map((edge) => ({ edge })),
  ].sort((a, b) => zOf(a) - zOf(b));

  ordered.forEach((item, rank) => {
    const element = 'shape' in item ? item.shape : item.edge;
    if (!element.visible || hiddenLayers.has(element.layerId)) return;

    let object;
    if ('shape' in item) {
      const { renderer, supported } = registry.resolve(item.shape);
      if (!supported) count(item.shape.kind);
      object = renderer.create(item.shape, ctx);
    } else {
      const terminals = {
        source: item.edge.sourceId ? shapesById.get(item.edge.sourceId) : undefined,
        target: item.edge.targetId ? shapesById.get(item.edge.targetId) : undefined,
      };
      const result = createEdge(item.edge, terminals, ctx);
      result.unsupported.forEach(count);
      object = result.object;
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
    root,
    unsupported,
    dispose: () => disposeObject(root),
  };
}

function zOf(item: { shape: ShapeModel } | { edge: EdgeModel }): number {
  return 'shape' in item ? item.shape.z : item.edge.z;
}
