import { Group, Mesh } from 'three';
import type { MeshBasicMaterial, Object3D } from 'three';
import { pointHandles } from '../../edit/edgePointEdits';
import { collectMoveSet } from '../../edit/moveSet';
import type { Point } from '../../model/types';
import { headSelectionRing, partSelection, selectionOutline } from '../../render/decorations';
import { edgeEndHandles, edgePointHandles, modeHandleMeshes, selectionHandles } from '../../render/handleMeshes';
import { createVeil, createVeilHole, liftAboveVeil } from '../../render/veil';
import { disposeObject } from '../../render/meshes';
import type { EngineCore } from '../EngineCore';
import type { PickedElement } from '../../interaction/pick';
import { styleNumber } from '../../model/styleValues';

/**
 * Mise en valeur de la sélection (paramètre `selection.style`) : voile, contour animé, poignées de l'élément
 * modifiable.
 */
export class SelectionHighlight {
  /** Voile de mise en valeur de la sélection, et de quoi l'annuler. */
  private veil: { key: string; object: Object3D; restore: () => void } | undefined;
  /** Trou du voile autour d'une flèche sélectionnée (dépend du zoom : largeur fixe à l'écran). */
  private veilHole: { key: string; object: Object3D } | undefined;
  /** Contours de la sélection (style « contour »), un par élément sélectionné. */
  private selectionObject: Group | undefined;
  /** Contour animé : décalage des tirets (pixels écran) et boucle d'animation. */
  private selectionPhase = 0;
  private selectionAnimation = 0;
  /** Poignées de la forme sélectionnée. */
  private handlesObject: Object3D | undefined;
  /** Pré-sélection de la partie survolée (sujet 259). */
  private hoverObject: Object3D | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Style de la mise en valeur : celui qu'impose le mode de la page courante (sujet 254), sinon le paramètre. */
  private style(): 'veil' | 'outline' {
    const page = this.core.pages.getCurrentPage();
    return (page && this.core.modes.modeOf(page)?.page?.selectionStyle) ?? this.core.settings.selection.style;
  }

  /** Paramètres changés : style, couleur et animation de la mise en valeur. */
  settingsChanged(): void {
    this.syncAnimation();
    this.update();
  }

  /**
   * Contour de sélection animé (paramètre `selection`) : les tirets défilent lentement tant qu'il y a
   * une sélection ; arrêté sans sélection, si désactivé, ou si les animations sont réduites.
   */
  syncAnimation(): void {
    const run =
      this.core.selection.current !== undefined &&
      this.style() === 'outline' &&
      this.core.settings.selection.animated &&
      !this.core.config.reducedMotion();
    if (!run) {
      cancelAnimationFrame(this.selectionAnimation);
      this.selectionAnimation = 0;
      if (this.selectionPhase !== 0) {
        this.selectionPhase = 0;
        this.update();
      }
      return;
    }
    if (this.selectionAnimation) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // Phase décroissante : les tirets avancent dans le sens du contour.
      this.selectionPhase -= this.core.settings.selection.speed * dt;
      this.update();
      this.selectionAnimation = requestAnimationFrame(tick);
    };
    this.selectionAnimation = requestAnimationFrame(tick);
  }

  /**
   * Mise en valeur de la sélection (paramètre `selection.style`) : voile d'ombre sur le reste de la
   * page (défaut), ou contour bleu pointillé (éventuellement animé), et poignées de l'élément modifiable.
   */
  update(): void {
    if (this.selectionObject) {
      this.selectionObject.parent?.remove(this.selectionObject);
      disposeObject(this.selectionObject);
      this.selectionObject = undefined;
    }
    const selection = this.core.selection.current;
    const root = this.core.scenes.current?.root;
    const visible = selection && root && selection.pageId === this.core.pages.currentPageId ? selection : undefined;
    const items = visible?.items ?? [];
    const veilKey = this.updateVeil(root, items);
    this.updateVeilHoles(root, items, veilKey);
    if (root && items.length > 0) this.addOutlines(root, items);
    this.updateHandles(visible && root);
    this.updateHover();
  }

  /** Pré-sélection de la partie survolée (sujet 259) : fond plus léger que la sélection, sans trait. */
  updateHover(): void {
    if (this.hoverObject) {
      this.hoverObject.removeFromParent();
      disposeObject(this.hoverObject);
      this.hoverObject = undefined;
    }
    const root = this.core.scenes.current?.root;
    const hovered = this.core.shapeParts.hoveredBounds();
    if (root && hovered) {
      const { zoom } = this.core.camera.state;
      this.hoverObject = partSelection(hovered.rect, zoom, this.core.settings.selection.accentColor, true);
      this.hoverObject.position.z =
        ((this.core.sceneView.sceneObject(hovered.shape.id)?.userData.top as number) ?? 0) + 0.24;
      alwaysOnTop(this.hoverObject);
      root.add(this.hoverObject);
    }
    this.core.rendering.requestRender();
  }

  /** Arrêt du moteur : plus d'animation du contour. */
  dispose(): void {
    cancelAnimationFrame(this.selectionAnimation);
  }

  /**
   * Voile : gardé tant que la même sélection est affichée dans la même scène. L'emprise de la page en fait
   * partie : le voile la couvre, et un déplacement peut l'agrandir. Renvoie la clé du voile affiché.
   */
  private updateVeil(root: Object3D | undefined, items: PickedElement[]): string | undefined {
    const ids = items.map((item) => item.element.id);
    const pageBounds = this.core.pages.getCurrentPage()?.bounds;
    const { veilOpacity, veilColor } = this.core.settings.selection;
    const veilKey =
      items.length > 0 && root && pageBounds && this.style() === 'veil'
        ? `${root.uuid}:${ids.join('|')}:${veilOpacity}:${veilColor}:${Object.values(pageBounds).join(',')}`
        : undefined;
    if (this.veil?.key === veilKey) return veilKey;
    this.clearVeil();
    const page = this.core.pages.getCurrentPage();
    if (!veilKey || !root || !page) return veilKey;
    const object = createVeil(page.bounds, veilOpacity, veilColor);
    root.add(object);
    // Une forme sélectionnée est mise en valeur avec son contenu (enfants d'un groupe, d'un conteneur, formes emportées
    // par le mode de la page, comme le contenu d'une région RDD).
    const highlighted = new Set(ids);
    const carries = this.core.pageModes.hasCarries(page);
    for (const item of items) {
      if (item.type !== 'shape') continue;
      const roots = [item.element.id, ...this.core.pageModes.carried(page, [item.element.id])];
      for (const root of roots) {
        const content = collectMoveSet(page, root);
        for (const id of [...content.shapeIds, ...content.edgeIds]) highlighted.add(id);
      }
    }
    if (carries) {
      for (const edge of page.edges) {
        if (highlighted.has(edge.sourceId ?? '') && highlighted.has(edge.targetId ?? '')) highlighted.add(edge.id);
      }
    }
    const lifted = root.children.filter((c) => {
      const elementId = c.userData.elementId as string | undefined;
      const partner = c.userData.highlightWith as string | undefined;
      return (
        (elementId !== undefined && highlighted.has(elementId)) || (partner !== undefined && highlighted.has(partner))
      );
    });
    this.veil = { key: veilKey, object, restore: liftAboveVeil(lifted) };
    return veilKey;
  }

  /** Flèches et liaisons : le voile est percé autour de leur tracé (≈ 10 px de chaque côté à l'écran). */
  private updateVeilHoles(root: Object3D | undefined, items: PickedElement[], veilKey: string | undefined): void {
    const edges = veilKey ? items.filter((item) => item.type === 'edge') : [];
    const { zoom } = this.core.camera.state;
    const { veilPadding } = this.core.settings.selection;
    const holeKey = edges.length > 0 ? `${veilKey}:${zoom}:${veilPadding}` : undefined;
    if (this.veilHole?.key === holeKey) return;
    this.veilHole?.object.removeFromParent();
    if (this.veilHole) disposeObject(this.veilHole.object);
    this.veilHole = undefined;
    if (!holeKey || !root) return;
    const holes = new Group();
    holes.name = 'selection-veil-holes';
    for (const { element } of edges) {
      const object = this.core.sceneView.sceneObject(element.id);
      const route = (object?.userData.path ?? object?.userData.route) as Point[] | undefined;
      if (!object || !route || route.length < 2) continue;
      const strokeWidth = styleNumber(element.style, 'strokeWidth', 1) || 1;
      const width = strokeWidth + (2 * veilPadding) / zoom;
      const hole = createVeilHole(route, object.position.z, width);
      // Flèche déplacée en bloc (au clavier, avec sa forme) : son objet est décalé, pas son tracé.
      hole.position.x = object.position.x;
      hole.position.y = object.position.y;
      holes.add(hole);
    }
    root.add(holes);
    this.veilHole = { key: holeKey, object: holes };
  }

  /**
   * Style « contour » : un contour pointillé (éventuellement animé) par élément sélectionné. Silhouette debout (Actor
   * en iso / 3D) : un cercle autour de sa tête, quel que soit le style (plein avec le voile), à la place du contour.
   */
  private addOutlines(root: Object3D, items: PickedElement[]): void {
    const outlines = new Group();
    outlines.name = 'selection';
    const { accentColor } = this.core.settings.selection;
    const style = this.style();
    for (const { type, element } of items) {
      const standing = type === 'shape' ? this.core.sceneView.standingHead(element.id) : undefined;
      if (standing) {
        const ring = headSelectionRing(standing.head, standing.at, this.core.camera.state.zoom, {
          phase: this.selectionPhase,
          accent: accentColor,
          dashed: style === 'outline',
        });
        alwaysOnTop(ring);
        outlines.add(ring);
        continue;
      }
      if (style !== 'outline') continue;
      // Forme : son emprise prise au clic (ex. région RDD et son onglet, sujet 315).
      const bounds =
        type === 'shape' ? this.core.registry.hitBounds(element) : this.core.sceneView.drawnBounds(element.id);
      if (!bounds) continue;
      const outline = selectionOutline(bounds, this.core.camera.state.zoom, this.selectionPhase, accentColor);
      // Posé sur le dessus d'un volume, et toujours visible (pas caché par les blocs).
      outline.position.z = ((this.core.sceneView.sceneObject(element.id)?.userData.top as number) ?? 0) + 0.2;
      alwaysOnTop(outline);
      outlines.add(outline);
    }
    // Partie sélectionnée de la forme (sujet 249), quel que soit le style de la mise en valeur.
    const part = this.core.shapeParts.selectedBounds();
    if (part) {
      const object = partSelection(part.rect, this.core.camera.state.zoom, accentColor);
      object.position.z = ((this.core.sceneView.sceneObject(part.shape.id)?.userData.top as number) ?? 0) + 0.25;
      alwaysOnTop(object);
      outlines.add(object);
    }
    outlines.renderOrder = Number.MAX_SAFE_INTEGER;
    this.selectionObject = outlines;
    root.add(outlines);
  }

  /** Poignées de l'élément sélectionné, si on peut le modifier : bouts et points d'une flèche, ou cadre d'une forme. */
  private updateHandles(root: Object3D | undefined): void {
    if (this.handlesObject) {
      this.handlesObject.removeFromParent();
      disposeObject(this.handlesObject);
      this.handlesObject = undefined;
    }
    if (!root) return;
    const { zoom } = this.core.camera.state;
    const editableEdge = this.core.targets.edgeHandlesSelection();
    const ends = editableEdge && this.core.edgeHandles.edgeEndPoints(editableEdge.edge.id);
    if (editableEdge && ends) {
      const { edge } = editableEdge;
      const handleStyle = {
        size: this.core.settings.edit.handleSize,
        accent: this.core.settings.selection.accentColor,
      };
      this.handlesObject = edgeEndHandles(
        [
          { point: ends.source, attached: !!edge.sourceId },
          { point: ends.target, attached: !!edge.targetId },
        ],
        zoom,
        handleStyle,
      );
      const context = this.core.edgeHandles.pointsContext(editableEdge.page, edge);
      if (context) this.handlesObject.add(edgePointHandles(pointHandles(context), zoom, handleStyle));
      this.handlesObject.position.z = this.core.sceneView.elementTop(edge.id) + 0.3;
      alwaysOnTop(this.handlesObject);
      root.add(this.handlesObject);
    }
    const editable = this.core.targets.editableSelection();
    // Silhouette debout (Actor en iso / 3D) : pas de poignées, le cercle de sa tête suffit (`addOutlines`).
    if (editable && !this.core.sceneView.standingHead(editable.shape.id)) {
      const { shape } = editable;
      this.handlesObject = selectionHandles(shape.bounds, zoom, {
        resize: this.core.registry.isResizable(shape),
        connect: true,
        connectSides: this.core.registry.connectSides(shape),
        size: this.core.settings.edit.handleSize,
        accent: this.core.settings.selection.accentColor,
        layout: this.core.shapeHandles.handleLayout(),
      });
      // Poignées propres au mode de la page (sujet 250, ex. « + » d'une table RDD).
      const modeHandles = this.core.modeHandles.current()?.handles ?? [];
      if (modeHandles.length > 0)
        this.handlesObject.add(modeHandleMeshes(modeHandles, zoom, this.core.settings.edit.handleSize));
      this.handlesObject.position.z = this.core.sceneView.elementTop(shape.id) + 0.3;
      alwaysOnTop(this.handlesObject);
      root.add(this.handlesObject);
    }
  }

  clearVeil(): void {
    this.veilHole?.object.removeFromParent();
    if (this.veilHole) disposeObject(this.veilHole.object);
    this.veilHole = undefined;
    if (!this.veil) return;
    this.veil.restore();
    this.veil.object.removeFromParent();
    disposeObject(this.veil.object);
    this.veil = undefined;
  }
}

/** Toujours visible : pas caché par les blocs (test de profondeur coupé). */
function alwaysOnTop(object: Object3D): void {
  object.traverse((o) => {
    if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
  });
}
