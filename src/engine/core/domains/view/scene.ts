import { Box3 } from 'three';
import type { Object3D } from 'three';
import type { PageModel, Rect } from '../../model/types';
import { buildPageScene, effectiveLevel } from '../../render/pageScene';
import type { PageScene } from '../../render/pageScene';
import { outsideLabelBox } from '../../render/labelPosition';
import { labelBackdropSettings } from '../../render/styleColors';
import type { EngineCore } from '../EngineCore';
import type { SceneLevel } from '../../shapes/types';
import type { Settings } from '../../settings';
import type { ReadonlyShapeModel } from '../../model/readonly';
import { freezePlain } from '../../model/freeze';
import { standingFigure } from '../../render/standing';
import { pageRectOfBox } from '../../render/space';

/**
 * Scènes des pages : construction (contexte de rendu, niveau, décors des effets) et lecture de la scène affichée
 * (objets, hauteurs, emprises).
 */
export class SceneView {
  constructor(private readonly core: EngineCore) {}

  /** Nouveau document : toutes les scènes construites sont libérées. */
  resetDocument(): void {
    this.core.scenes.clear();
  }

  /** Paramètres changés : taille du cache des scènes. */
  settingsChanged(settings: Settings): void {
    this.core.scenes.setMaxCached(settings.preload.maxCachedPages);
  }

  /** Scène d'une page à un niveau de rendu (vue graphe comprise, page générée ordinaire), sa durée de construction mesurée. */
  buildScene(page: PageModel, level: SceneLevel): PageScene {
    const start = performance.now();
    const scene = this.createScene(page, level);
    this.core.metrics.sceneBuilt(page.id, performance.now() - start);
    return scene;
  }

  /** Scène construite hors de la vue (export d'image) : non comptée dans les métriques de la page (sujet 453). */
  buildDetachedScene(page: PageModel, level: SceneLevel): PageScene {
    return this.createScene(page, level);
  }

  private createScene(page: PageModel, level: SceneLevel): PageScene {
    const core = this.core;
    const scene = buildPageScene(page, core.registry, this.renderContext(page), level, core.pageModes.dressing(page));
    // Décors des effets de la page : en volume seulement (iso / 3D).
    if (level === 'iso') core.pageEffects.decorate(page, scene.root);
    return scene;
  }

  /** Niveau de rendu d'une page : celui demandé par la vue, à plat si rien n'y a de volume. */
  levelOf(page: PageModel): SceneLevel {
    const core = this.core;
    return effectiveLevel(
      page,
      core.registry,
      core.levels.requestedLevel(),
      core.pageEffects.hasVolume(page) || core.jumps.hasRaisedJumps(page),
    );
  }

  /** Emprise dessinée d'un élément de la page courante, en coordonnées page. */
  drawnBounds(elementId: string): Rect | undefined {
    const object = this.sceneObject(elementId);
    if (!object) return undefined;
    const box = new Box3().setFromObject(object);
    if (box.isEmpty()) return undefined;
    return pageRectOfBox(box);
  }

  /**
   * Contexte de rendu d'une page, gelé (sujet 303) : une forme ne change pas le rendu des suivantes. La fabrique de
   * textes, partagée par tout le moteur, n'est pas gelée ; la mesure du texte est celle du moteur (sujet 377).
   */
  renderContext(page?: PageModel) {
    const { text, measureText, ...settings } = {
      text: this.core.text,
      measureText: this.core.textMeasure.measure,
      edgeJumps: page && this.core.jumps.jumpsOf(page),
      volume: {
        depth: this.core.settings.view.isoDepth,
        shadeLight: this.core.settings.view.shadeLight,
        shadeDark: this.core.settings.view.shadeDark,
      },
      background: this.core.settings.background.color,
      placeholder: {
        fill: this.core.settings.shapes.placeholderFill,
        stroke: this.core.settings.shapes.placeholderStroke,
      },
      accent: this.core.settings.selection.accentColor,
      edgeFontColor: this.core.settings.shapes.edgeFontColor,
      edgeLabelBackdrop: labelBackdropSettings(this.core.settings.shapes),
      edgeSplit: {
        length: this.core.settings.shapes.edgeSplitLength,
        fade: this.core.settings.shapes.edgeSplitFade,
        labelPadding: this.core.settings.shapes.edgeSplitLabelPadding,
        labelSize: this.core.settings.shapes.edgeSplitLabelSize,
      },
      categoryValues: this.core.registry.categoryValues(this.core.settings.shapeCategories),
    };
    return Object.freeze({ text, measureText, ...freezePlain(settings) });
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
  labelTop(shape: ReadonlyShapeModel): number {
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
    const standing = this.core.scenes.current?.level === 'iso' ? standingFigure(object) : undefined;
    if (!object || !standing) return undefined;
    const at = object.position.clone().add(standing.silhouette.position);
    return { head: standing.figure.head, at: { x: at.x, y: at.y, z: at.z } };
  }

  sceneObject(elementId: string) {
    return this.core.scenes.current?.root.children.find((c) => c.userData.elementId === elementId);
  }
}
