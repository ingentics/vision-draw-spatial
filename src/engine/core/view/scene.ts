import { Box3 } from 'three';
import type { Object3D } from 'three';
import type { PageModel, Rect, ShapeModel } from '../../model/types';
import { buildPageScene, effectiveLevel } from '../../render/pageScene';
import type { PageScene } from '../../render/pageScene';
import { outsideLabelBox } from '../../render/labelPosition';
import type { EngineCore } from '../EngineCore';
import { GRAPH_PAGE_ID } from '../../graph/graphPage';
import { buildGraphScene } from '../../graph/graphScene';
import type { SceneLevel } from '../../shapes/types';

/**
 * Scènes des pages : construction (contexte de rendu, niveau, décors des effets) et lecture de la scène affichée
 * (objets, hauteurs, emprises).
 */
export class SceneView {
  constructor(private readonly core: EngineCore) {}

  /** Scène d'une page à un niveau de rendu (vue graphe comprise). */
  buildScene(page: PageModel, level: SceneLevel): PageScene {
    const core = this.core;
    const layout = core.graph.layout;
    if (page.id === GRAPH_PAGE_ID && layout && core.file.document)
      return buildGraphScene(page, layout, core.file.document, core.registry, this.renderContext(page), level);
    const scene = buildPageScene(page, core.registry, this.renderContext(page), level, core.modes.dressing(page));
    // Décors des effets de la page : en volume seulement (iso / 3D).
    if (level === 'iso')
      core.effects.decorate(page, scene.root, {
        allows: (id) => core.modes.allowsEffect(page, id),
        settings: core.settings.effects,
      });
    return scene;
  }

  /** Niveau de rendu d'une page : celui demandé par la vue, à plat si rien n'y a de volume. */
  levelOf(page: PageModel): SceneLevel {
    const core = this.core;
    return effectiveLevel(
      page,
      core.registry,
      core.levels.requestedLevel(),
      core.effects.hasVolume(page, (id) => core.modes.allowsEffect(page, id)) || core.jumps.hasRaisedJumps(page),
    );
  }

  /** Emprise dessinée d'un élément de la page courante, en coordonnées page. */
  drawnBounds(elementId: string): Rect | undefined {
    const object = this.sceneObject(elementId);
    if (!object) return undefined;
    const box = new Box3().setFromObject(object);
    if (box.isEmpty()) return undefined;
    // Monde → page : X = x, Z = y.
    return { x: box.min.x, y: box.min.z, width: box.max.x - box.min.x, height: box.max.z - box.min.z };
  }

  getPageScene(): PageScene | undefined {
    return this.core.scenes.current;
  }

  getCachedPageIds(): string[] {
    return this.core.scenes.cachedIds();
  }

  renderContext(page?: PageModel) {
    return {
      text: this.core.text,
      edgeJumps: page && this.core.jumps.jumpsOf(page),
      volume: {
        depth: this.core.settings.view.isoDepth,
        shadeLight: this.core.settings.view.shadeLight,
        shadeDark: this.core.settings.view.shadeDark,
        tags: this.core.settings.view.facadeTags,
      },
      background: this.core.settings.background.color,
      placeholder: {
        fill: this.core.settings.shapes.placeholderFill,
        stroke: this.core.settings.shapes.placeholderStroke,
      },
      accent: this.core.settings.selection.accentColor,
      edgeFontColor: this.core.settings.shapes.edgeFontColor,
      edgeLabelBackdrop: {
        kind: this.core.settings.shapes.edgeLabelBackdrop,
        haloWidth: this.core.settings.shapes.edgeLabelHaloWidth,
        haloBlur: this.core.settings.shapes.edgeLabelHaloBlur,
      },
      edgeBadge: {
        radius: this.core.settings.shapes.edgeBadgeRadius,
        textSize: this.core.settings.shapes.edgeBadgeTextSize,
        smallRadius: this.core.settings.shapes.edgeBadgeSmallRadius,
        smallTextSize: this.core.settings.shapes.edgeBadgeSmallTextSize,
        borderColor: this.core.settings.shapes.edgeBadgeBorderColor,
        borderWidth: this.core.settings.shapes.edgeBadgeBorderWidth,
        textColor: this.core.settings.shapes.edgeBadgeTextColor,
        bold: this.core.settings.shapes.edgeBadgeBold,
        gap: this.core.settings.shapes.edgeBadgeGap,
        faceCamera: this.core.settings.shapes.edgeBadgeFaceCamera,
        labelFaceCamera: this.core.settings.shapes.edgeBadgeLabelFaceCamera,
      },
      dressingDarken: this.core.settings.shapes.edgeDressingDarken,
    };
  }

  /** Objets de label (texte dessiné) d'une cellule dans la scène courante. */
  labelObjects(cellId: string | undefined): Object3D[] {
    const found: Object3D[] = [];
    if (cellId) {
      this.core.scenes.current?.root.traverse((object) => {
        if (object.userData.labelCellId === cellId) found.push(object);
      });
    }
    return found;
  }

  /**
   * Hauteur où le label d'une forme est dessiné : le dessus de son volume, ou sa base pour un label hors
   * de la forme (posé au sol à côté du volume, `createShapeObject`).
   */
  labelTop(shape: ShapeModel): number {
    if (!outsideLabelBox(shape.bounds, shape.style)) return this.elementTop(shape.id);
    const base = (this.sceneObject(shape.id)?.userData.base as number | undefined) ?? 0;
    return this.core.scenes.current?.level === 'iso' ? base * this.core.levels.heightScale : 0;
  }

  /** Hauteur du dessus d'un élément (volume iso), mise à l'échelle de la bascule ; 0 à plat. */
  elementTop(elementId: string): number {
    const top = (this.sceneObject(elementId)?.userData.top as number | undefined) ?? 0;
    return this.core.scenes.current?.level === 'iso' ? top * this.core.levels.heightScale : 0;
  }

  /** Base du volume d'un élément en iso / 3D (le clic le prend du dessus à la base), sinon `undefined`. */
  volumeBase(elementId: string): number | undefined {
    const object = this.sceneObject(elementId);
    if (this.core.scenes.current?.level !== 'iso' || !object) return undefined;
    return ((object.userData.base as number | undefined) ?? 0) * this.core.levels.heightScale;
  }

  /**
   * Silhouette debout d'une forme en iso / 3D (Actor) : cadre de sa tête dans son plan et position de son pied
   * dans la scène ; `undefined` à plat ou pour une autre forme.
   */
  standingHead(elementId: string): { head: Rect; at: { x: number; y: number; z: number } } | undefined {
    const object = this.sceneObject(elementId);
    if (this.core.scenes.current?.level !== 'iso' || !object?.userData.standing) return undefined;
    const silhouette = object.getObjectByName('silhouette');
    const head = silhouette?.userData.head as Rect | undefined;
    if (!silhouette || !head) return undefined;
    const at = object.position.clone().add(silhouette.position);
    return { head, at: { x: at.x, y: at.y, z: at.z } };
  }

  sceneObject(elementId: string) {
    return this.core.scenes.current?.root.children.find((c) => c.userData.elementId === elementId);
  }
}
