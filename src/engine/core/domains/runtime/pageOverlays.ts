import { Group } from 'three';
import type { Object3D } from 'three';
import type { PickedElement } from '../../interaction/pick';
import { rectPath } from '../../model/geometry';
import { edgeOf, shapeOf } from '../../model/pageIndex';
import type { PageModel, Point } from '../../model/types';
import { OVERLAY_DEFAULTS } from '../../modes/pageTakeover';
import type { OverlayLayer, OverlayScene, PageOverlay } from '../../modes/pageTakeover';
import { disposeObject } from '../../render/meshes';
import { veilPage } from '../../render/veil';
import type { PageVeil } from '../../render/veil';
import type { EngineCore } from '../EngineCore';

/** Ce qui est posé pour la couche : voile sur la scène de la page, objets du mode dans la passe par-dessus. */
interface Drawn {
  root: Object3D;
  veil?: PageVeil;
  layer?: OverlayLayer;
  /** Porteur des objets du mode : il reprend le passage page → monde de la scène de la page. */
  holder?: Group;
}

/**
 * Couche d'un mode sur la page affichée (sujet 467, brique de la prise en main de la page) : voile et éléments gardés
 * au-dessus, objets dessinés par le mode dans une passe par-dessus tout, refaits quand la scène de la page est
 * reconstruite, animés avant chaque image tant que le mode le demande. Retirée par son détenteur, au changement de page
 * ou de document. Chaque appel au mode est protégé : une couche en erreur ne pose rien.
 */
export class PageOverlays {
  private current: { owner: object; pageId: string; overlay: PageOverlay } | undefined;
  private drawn: Drawn | undefined;
  /** Pose de la couche (origine de `OverlayLayer.animate`). */
  private shownAt = 0;
  /** La couche demande encore des images. */
  private animating = false;

  constructor(private readonly core: EngineCore) {}

  set(owner: object, overlay: PageOverlay): void {
    const page = this.core.pages.getCurrentPage();
    if (!page) return;
    this.current = { owner, pageId: page.id, overlay };
    this.shownAt = performance.now();
    this.draw();
    this.core.rendering.requestRender();
  }

  clear(owner: object): void {
    if (this.current?.owner !== owner) return;
    this.remove();
  }

  /** Nouveau document : la couche est retirée. */
  resetDocument(): void {
    this.remove();
  }

  /** Page affichée : la couche d'une autre page est retirée. */
  pageShown(pageId: string): void {
    if (this.current && this.current.pageId !== pageId) this.remove();
  }

  dispose(): void {
    this.current = undefined;
    this.erase();
  }

  /** Élément que vise la couche sous le point écran (pixels de page de la scène, au sol). */
  hit(screen: Point): string | undefined {
    const hit = this.drawn?.layer?.hit;
    if (!hit) return undefined;
    const point = this.core.projection.groundPointAtHeight(screen, 0);
    return this.guard('couche, cible du clic', undefined, () => hit(point));
  }

  /**
   * Avant chaque image (`Rendering`) : couche reposée sur une scène reconstruite, recalée sur elle, puis animée ; une
   * couche animée demande l'image suivante.
   */
  sync(now: number): void {
    if (!this.current) return;
    if (this.drawn?.root !== this.core.scenes.current?.root) this.draw();
    this.place();
    const animate = this.drawn?.layer?.animate;
    if (!animate || !this.animating || this.core.config.reducedMotion()) return;
    const elapsed = Math.max(0, now - this.shownAt);
    this.animating = this.guard('couche, animation', false, () => animate(elapsed));
    if (this.animating) this.core.rendering.requestRender();
  }

  private remove(): void {
    if (!this.current) return;
    this.current = undefined;
    this.erase();
    this.core.rendering.requestRender();
  }

  /** Pose le voile, les éléments gardés au-dessus et les objets du mode. */
  private draw(): void {
    this.erase();
    const current = this.current;
    const page = this.core.pages.getCurrentPage();
    const scene = this.core.scenes.current;
    if (!current || !page || page.id !== current.pageId || !scene || scene.pageId !== page.id) return;
    const { overlay } = current;
    const build = overlay.layer;
    const layer = build && this.guard('couche', undefined, () => build(this.sceneOf(page)));
    const kept = overlay.veil && this.core.selection.withContent(page, keptItems(page, overlay.veil.kept ?? []));
    const veil =
      overlay.veil && veilPage(scene.root, page.bounds, kept!, overlay.veil.opacity ?? OVERLAY_DEFAULTS.veilOpacity);
    const holder = layer ? new Group().add(layer.object) : undefined;
    this.core.rendering.setOverlay(holder);
    this.drawn = { root: scene.root, veil, layer, holder };
    this.animating = layer?.animate !== undefined;
    this.place();
  }

  /** Retire ce qui est posé. */
  private erase(): void {
    const drawn = this.drawn;
    if (!drawn) return;
    this.drawn = undefined;
    this.animating = false;
    drawn.veil?.remove();
    if (drawn.holder) {
      this.core.rendering.setOverlay(undefined);
      disposeObject(drawn.holder);
    }
  }

  /** Les objets du mode suivent la scène de la page : même passage des pixels de page au monde. */
  private place(): void {
    const drawn = this.drawn;
    if (!drawn?.holder) return;
    drawn.root.updateMatrixWorld();
    drawn.holder.matrixAutoUpdate = false;
    drawn.holder.matrix.copy(drawn.root.matrixWorld);
    drawn.holder.matrixWorldNeedsUpdate = true;
  }

  /** La page dessinée, telle que la couche du mode la reçoit. */
  private sceneOf(page: PageModel): OverlayScene {
    const { registry, sceneView } = this.core;
    return {
      page,
      route: (edgeId) => {
        const object = sceneView.sceneObject(edgeId);
        const route = object?.userData.route as Point[] | undefined;
        if (!object || !route || route.length < 2) return undefined;
        // Flèche déplacée en bloc (avec sa forme) : son objet est décalé, pas son tracé.
        return route.map((p) => ({ x: p.x + object.position.x, y: p.y + object.position.y }));
      },
      outline: (shapeId) => {
        const shape = shapeOf(page, shapeId);
        return shape && (registry.outline(shape) ?? rectPath(registry.hitBounds(shape)));
      },
      ctx: sceneView.renderContext(page),
      reducedMotion: this.core.config.reducedMotion(),
    };
  }

  private guard<T>(hook: string, fallback: T, run: () => T): T {
    return this.core.pageModes.guardPage(this.current?.pageId ?? '', hook, fallback, run);
  }
}

/** Éléments gardés au-dessus du voile, tels que la sélection les décrit (pour les prendre avec leur contenu). */
function keptItems(page: PageModel, ids: readonly string[]): PickedElement[] {
  return ids.flatMap((id): PickedElement[] => {
    const shape = shapeOf(page, id);
    if (shape) return [{ type: 'shape', element: shape }];
    const edge = edgeOf(page, id);
    return edge ? [{ type: 'edge', element: edge }] : [];
  });
}
