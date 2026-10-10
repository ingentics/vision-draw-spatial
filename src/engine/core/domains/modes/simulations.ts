import { Group } from 'three';
import type { Object3D } from 'three';
import type { PickedElement } from '../../interaction/pick';
import { center, rectPath } from '../../model/geometry';
import { edgeOf, shapeOf } from '../../model/pageIndex';
import type { PageModel, Point } from '../../model/types';
import { SIMULATION_DEFAULTS } from '../../modes/simulation';
import type {
  SimulationFrame,
  SimulationHandlers,
  SimulationLayer,
  SimulationScene,
  SimulationSession,
} from '../../modes/simulation';
import { disposeObject } from '../../render/meshes';
import { createVeil, liftAboveVeil } from '../../render/veil';
import type { EngineCore } from '../EngineCore';

/** Ce qui est posé pour le pas affiché : voile sur la scène courante, couche du mode au-dessus de tout. */
interface Drawn {
  root: Object3D;
  veil: Object3D;
  restore: () => void;
  layer?: SimulationLayer;
  /** Porteur de la couche dans la scène par-dessus : il reprend le passage page → monde de la scène de la page. */
  holder?: Group;
}

/**
 * Simulation d'un mode sur la page courante (sujet 461) : état de session, jamais écrit ni annulable. Bloque l'édition
 * (gardes `EditTargets`, annuler / rétablir, clics et touches), pose le voile et la couche que le mode dessine pour
 * chaque pas, l'anime, rend les clics et les touches au mode. Fermée par `close`, Échap, un changement de page ou de
 * fichier. Elle ne sait rien de ce que le mode simule.
 */
export class Simulations {
  private session: (SimulationSession & { handlers: SimulationHandlers; frame: SimulationFrame }) | undefined;
  private drawn: Drawn | undefined;
  /** Affichage du pas courant (origine de `SimulationLayer.animate`). */
  private shownAt = 0;
  private animation = 0;

  constructor(private readonly core: EngineCore) {}

  /** Simulation ouverte (sur la page courante : changer de page la ferme). */
  get current(): SimulationSession | undefined {
    return this.session && { pageId: this.session.pageId, owner: this.session.owner };
  }

  /** Ouvre une simulation sur la page courante (même en lecture seule) ; faux sans page ou pendant une transition. */
  open(owner: object, handlers: SimulationHandlers): boolean {
    const page = this.core.pages.getCurrentPage();
    if (!page || this.core.graph.isGraph(page.id) || !this.core.canInteract()) return false;
    this.close();
    this.core.gesture.endMove();
    this.core.labelEditor.closeLabelEdit();
    this.core.selection.clearSelection();
    this.session = { pageId: page.id, owner, handlers, frame: {} };
    this.changed();
    return true;
  }

  /** Affiche un pas : voile, éléments gardés, couche du mode ; la caméra suit la forme `follow`. */
  show(frame: SimulationFrame): void {
    if (!this.session) return;
    this.session.frame = frame;
    this.shownAt = performance.now();
    this.draw();
    this.follow();
    this.changed();
  }

  close(): void {
    const session = this.session;
    if (!session) return;
    this.session = undefined;
    this.clear();
    this.stopAnimation();
    session.handlers.closed?.();
    this.changed();
  }

  /** Nouveau document : la simulation est fermée. */
  resetDocument(): void {
    this.close();
  }

  /** Page affichée : une autre page ferme la simulation. */
  pageShown(pageId: string): void {
    if (this.session && this.session.pageId !== pageId) this.close();
  }

  dispose(): void {
    this.stopAnimation();
  }

  /** Clic pendant la simulation : rendu au mode, rien n'est sélectionné ; vrai si une simulation est ouverte. */
  click(screen: Point): boolean {
    if (!this.session) return false;
    const elementId = this.targetAt(screen);
    if (elementId !== undefined) this.session.handlers.click?.(elementId);
    return true;
  }

  /** Survol pendant la simulation : main sur un élément qui réagit au clic ; vrai si une simulation est ouverte. */
  hover(screen: Point | undefined): boolean {
    if (!this.session) return false;
    const elementId = screen && this.targetAt(screen);
    const over = elementId !== undefined && (this.session.handlers.clickable?.(elementId) ?? false);
    if (!this.core.canvas.style.cursor.startsWith('grab')) this.core.canvas.style.cursor = over ? 'pointer' : '';
    return true;
  }

  /** Touche pendant la simulation : Échap la ferme, les autres vont au mode ; vrai si elle est prise. */
  key(key: string): boolean {
    if (!this.session) return false;
    if (key === 'Escape') {
      this.close();
      return true;
    }
    return this.session.handlers.key?.(key) ?? false;
  }

  /** Avant chaque image : scène reconstruite (mesure du texte, paramètres), le pas y est reposé. */
  sync(): void {
    if (this.session && this.drawn?.root !== this.core.scenes.current?.root) this.draw();
    else this.place();
  }

  /** La couche suit la scène de la page : même passage des pixels de page au monde (repère, échelle des hauteurs). */
  private place(): void {
    const drawn = this.drawn;
    if (!drawn?.holder) return;
    drawn.root.updateMatrixWorld();
    drawn.holder.matrixAutoUpdate = false;
    drawn.holder.matrix.copy(drawn.root.matrixWorld);
    drawn.holder.matrixWorldNeedsUpdate = true;
  }

  private changed(): void {
    this.core.events.emit('simulationChange', this.current);
    this.core.rendering.requestRender();
  }

  /** Page simulée, si elle est affichée. */
  private page(): PageModel | undefined {
    const page = this.core.pages.getCurrentPage();
    return page && page.id === this.session?.pageId ? page : undefined;
  }

  /** Élément sous le point écran : celui que vise la couche du mode, sinon celui de la page. */
  private targetAt(screen: Point): string | undefined {
    const layer = this.drawn?.layer;
    const hit = layer?.hit?.(this.core.projection.groundPointAtHeight(screen, 0));
    return hit ?? this.core.picking.pickAt(screen)?.element.id;
  }

  /** La page dessinée, telle que la couche du mode la reçoit. */
  private sceneOf(page: PageModel): SimulationScene {
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

  /** Pose le voile, les éléments gardés au-dessus et la couche du mode. */
  private draw(): void {
    this.clear();
    const session = this.session;
    const page = this.page();
    const scene = this.core.scenes.current;
    if (!session || !page || !scene || scene.pageId !== page.id) return;
    const { frame } = session;
    const root = scene.root;
    const veil = createVeil(page.bounds, frame.veilOpacity ?? SIMULATION_DEFAULTS.veilOpacity);
    root.add(veil);
    const kept = this.core.selection.withContent(page, keptItems(page, frame.kept ?? []));
    const restore = liftAboveVeil(root.children.filter((c) => kept.has(c.userData.elementId as string)));
    const layer = frame.layer?.(this.sceneOf(page));
    const holder = layer ? new Group().add(layer.object) : undefined;
    if (holder) this.core.rendering.overlay.add(holder);
    this.drawn = { root, veil, restore, layer, holder };
    this.place();
    this.startAnimation();
  }

  /** Retire le voile et la couche posés. */
  private clear(): void {
    const drawn = this.drawn;
    if (!drawn) return;
    this.drawn = undefined;
    drawn.restore();
    drawn.holder?.removeFromParent();
    for (const object of [drawn.veil, drawn.layer?.object]) {
      if (!object) continue;
      object.removeFromParent();
      disposeObject(object);
    }
  }

  /** Boucle d'animation de la couche, tant qu'elle a quelque chose à animer. */
  private startAnimation(): void {
    if (this.animation || !this.drawn?.layer?.animate) return;
    const tick = (now: number) => {
      this.animation = 0;
      const going = this.drawn?.layer?.animate?.(now - this.shownAt) ?? false;
      this.core.rendering.requestRender();
      if (going) this.animation = requestAnimationFrame(tick);
    };
    this.animation = requestAnimationFrame(tick);
  }

  private stopAnimation(): void {
    if (this.animation) cancelAnimationFrame(this.animation);
    this.animation = 0;
  }

  /** Forme à suivre sortie de la vue : la caméra glisse pour la centrer. */
  private follow(): void {
    const id = this.session?.frame.follow;
    const shape = id !== undefined ? shapeOf(this.page(), id) : undefined;
    const rect = shape && this.core.projection.screenRectOf(shape.id);
    if (!shape || !rect) return;
    const { width, height } = this.core.display.viewport;
    if (rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height) return;
    const state = this.core.camera.state;
    this.core.camera.animateCameraTo({ ...state, center: center(shape.bounds) }, SIMULATION_DEFAULTS.followDuration);
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
