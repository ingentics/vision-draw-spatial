import type { Object3D } from 'three';
import type { MoveSet } from '../../../edit/moveSet';
import type { EdgeModel, PageModel, Point, ShapeModel } from '../../../model/types';
import { disposeObject } from '../../../render/meshes';
import { createEdgeObject, createShapeObject, edgeRoute, placeInDrawOrder } from '../../../render/pageScene';
import { jumpStyleOf } from '../../../render/edges/jumps';
import type { EngineCore } from '../../EngineCore';
import { styleFlag } from '../../../model/styleValues';

/**
 * Modifications en direct de la scène pendant un glisser (objets décalés, forme ou flèches redessinées), sans
 * reconstruire la page.
 */
export class LiveEdit {
  constructor(private readonly core: EngineCore) {}

  translateObjects(set: MoveSet, step: Point): void {
    for (const object of this.core.scenes.current?.root.children ?? []) {
      const id = object.userData.elementId as string | undefined;
      if (id && (set.shapeIds.has(id) || set.edgeIds.has(id))) {
        object.position.x += step.x;
        object.position.y += step.y;
      }
    }
  }

  /** Après une modification en direct : contour, poignées, voile et mini-carte à jour. */
  afterLiveEdit(): void {
    // Le voile met en valeur des objets précis : il est reconstruit (objets remplacés).
    this.core.highlight.clearVeil();
    this.core.highlight.update();
    this.core.minimap.invalidate();
    this.core.rendering.requestRender();
  }

  /** Remplace l'objet d'une forme (taille changée), à la même hauteur et dans le même ordre de dessin. */
  rebuildShapeObject(shape: ShapeModel): void {
    const root = this.core.scenes.current?.root;
    const old = this.core.sceneView.sceneObject(shape.id);
    if (!root || !old) return;
    const base = old.position.z;
    const height = ((old.userData.top as number | undefined) ?? base) - base;
    const object = createShapeObject(
      shape,
      this.core.registry,
      this.core.sceneView.renderContext(),
      this.core.scenes.current!.level,
      {
        base,
        height,
      },
    );
    object.userData.elementId = shape.id;
    this.replaceObject(old, object, root);
  }

  /**
   * Reconstruit les arêtes reliées à des formes modifiées (même ordre de dessin, même hauteur), et les flèches à
   * sauts dessinées au-dessus d'elles ou des flèches `moved` (décalées en bloc, pas retracées) : leurs croisements
   * ont pu changer (ticket 129).
   */
  retraceEdges(page: PageModel, edgeIds: ReadonlySet<string>, moved: ReadonlySet<string> = new Set()): void {
    const root = this.core.scenes.current?.root;
    if (!root || edgeIds.size + moved.size === 0) return;
    const changed = page.edges.filter((edge) => edgeIds.has(edge.id) || moved.has(edge.id));
    const jumps = this.core.jumps.jumpsOf(page);
    const lowest = Math.min(...changed.map((edge) => edge.z));
    const retraced = page.edges
      .filter(
        (edge) => !moved.has(edge.id) && (edgeIds.has(edge.id) || (edge.z > lowest && jumpStyleOf(edge.style, jumps))),
      )
      .sort((a, b) => a.z - b.z);
    if (retraced.length === 0) return;
    const shapes = new Map(page.shapes.map((shape) => [shape.id, shape]));
    const dressing = this.core.pageModes.dressing(page);
    for (const edge of retraced) {
      const old = this.core.sceneView.sceneObject(edge.id);
      if (!old) continue;
      const object = createEdgeObject(
        edge,
        { source: shapes.get(edge.sourceId ?? ''), target: shapes.get(edge.targetId ?? '') },
        { ...this.core.sceneView.renderContext(page), raisedJumps: this.core.scenes.current!.level === 'iso' },
        dressing,
        jumpStyleOf(edge.style, jumps) ? this.routesBelow(page, edge) : [],
      );
      object.position.z = old.position.z;
      object.userData.elementId = edge.id;
      object.userData.top = old.userData.top;
      this.replaceObject(old, object, root);
    }
  }

  /** Tracés affichés des flèches dessinées sous `edge` (pour ses sauts), hors `noJump=1`. */
  private routesBelow(page: PageModel, edge: EdgeModel): Point[][] {
    const routes: Point[][] = [];
    for (const other of page.edges) {
      if (other.z >= edge.z || styleFlag(other.style, 'noJump')) continue;
      const object = this.core.sceneView.sceneObject(other.id);
      if (object) routes.push(edgeRoute(object));
    }
    return routes;
  }

  private replaceObject(old: Object3D, object: Object3D, root: Object3D): void {
    // Hors voile, la racine d'un élément porte son rang dans l'ordre de dessin. Sous le voile, elle
    // porte en plus la mise en avant : on la retire d'abord (le voile est remis par `afterLiveEdit`),
    // sinon le nouvel objet la garderait, et chaque pas d'un glisser l'ajouterait encore.
    this.core.highlight.clearVeil();
    placeInDrawOrder(object, old.renderOrder);
    old.removeFromParent();
    disposeObject(old);
    root.add(object);
  }
}
