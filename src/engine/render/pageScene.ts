import { Group } from 'three';
import type { PageModel } from '../model/types';
import { disposeObject } from './meshes';
import type { RendererRegistry } from './registry';
import { applyPageSpace } from './space';
import { PARTS_PER_ELEMENT } from './types';
import type { RenderContext } from './types';

/** Scène Three.js d'une page (SPEC §7.4 : construite seulement pour les pages affichées). */
export interface PageScene {
  pageId: string;
  /** Groupe racine en espace page ; à ajouter à la scène monde. */
  root: Group;
  /** Formes dessinées par le placeholder : nom de forme → nombre d'occurrences. */
  unsupported: Map<string, number>;
  dispose(): void;
}

export function buildPageScene(page: PageModel, registry: RendererRegistry, ctx: RenderContext): PageScene {
  const root = new Group();
  root.name = `page:${page.id}`;
  applyPageSpace(root);

  const hiddenLayers = new Set(page.layers.filter((l) => !l.visible).map((l) => l.id));
  const unsupported = new Map<string, number>();

  // Ordre de dessin : rang dans la page (formes et arêtes confondues), pas la valeur brute de z.
  const ordered = [...page.shapes].sort((a, b) => a.z - b.z);
  ordered.forEach((shape, rank) => {
    if (!shape.visible || hiddenLayers.has(shape.layerId)) return;

    const { renderer, supported } = registry.resolve(shape);
    if (!supported) unsupported.set(shape.kind, (unsupported.get(shape.kind) ?? 0) + 1);

    const object = renderer.create(shape, ctx);
    object.userData.elementId = shape.id;
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
