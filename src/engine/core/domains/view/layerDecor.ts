import type { Object3D } from 'three';
import type { PageModel } from '../../model/types';
import { layerPlanes, LAYER_PLANES } from '../../render/layerPlanes';
import { disposeObject } from '../../render/meshes';
import type { EngineCore } from '../EngineCore';

/**
 * Plans des calques élevés (sujet 525) dans la scène en volume d'une page : posés à sa construction, refaits quand le
 * calque courant change (le reste de la scène ne dépend pas de lui).
 */
export class LayerDecor {
  constructor(private readonly core: EngineCore) {}

  /** Plans ajoutés à la scène en volume de `page`, si elle a des calques et que le réglage les montre. */
  decorate(page: PageModel, root: Object3D): void {
    const current = this.core.layers.view(page.id)?.current;
    if (current === undefined || !this.core.settings.view.layerPlanes) return;
    const { view, selection } = this.core.settings;
    const spread = this.core.layerSpreads.spreadOf(page.id);
    const planes = layerPlanes(page, current, selection.accentColor, view.layerGroundPlane, spread);
    if (planes) root.add(planes);
  }

  /** Calque courant de la page changé : plans de la scène affichée refaits. */
  redecorate(pageId: string): void {
    const scene = this.core.scenes.current;
    const page = this.core.pages.pageById(pageId);
    if (!scene || scene.pageId !== pageId || scene.level !== 'iso' || !page) return;
    const old = scene.root.getObjectByName(LAYER_PLANES);
    if (old) {
      old.removeFromParent();
      disposeObject(old);
    }
    this.decorate(page, scene.root);
    this.core.rendering.requestRender();
  }
}
