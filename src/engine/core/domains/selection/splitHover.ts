import type { Object3D } from 'three';
import { splitHoverOverlay } from '../../render/edges/split';
import type { SplitHover } from '../../render/edges/split';
import { disposeObject } from '../../render/meshes';
import type { EngineCore } from '../EngineCore';

/**
 * Survol d'une flèche coupée (ticket 224) : tronçons et cadres épaissis, ligne directe d'un bout à l'autre, au-dessus
 * du schéma. Le calque est posé dans l'objet de la flèche (il suit son élévation et ses déplacements).
 */
export class SplitHoverView {
  private overlay: { edgeId: string; zoom: number; object: Object3D } | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Flèche sous le curseur (`undefined` : aucune) ; rien n'est dessiné si elle n'est pas coupée. */
  update(edgeId: string | undefined): void {
    const object = edgeId ? this.core.sceneView.sceneObject(edgeId) : undefined;
    const hover = object?.userData.splitHover as SplitHover | undefined;
    const { zoom } = this.core.camera.state;
    const current = this.overlay;
    // Même flèche, même zoom, calque toujours dans la scène : rien à refaire.
    if (current && current.edgeId === edgeId && current.zoom === zoom && current.object.parent === object) return;
    this.clear();
    if (!edgeId || !object || !hover) return;
    const overlay = splitHoverOverlay(hover, zoom);
    object.add(overlay);
    this.overlay = { edgeId, zoom, object: overlay };
    this.core.rendering.requestRender();
  }

  clear(): void {
    if (!this.overlay) return;
    this.overlay.object.removeFromParent();
    disposeObject(this.overlay.object);
    this.overlay = undefined;
    this.core.rendering.requestRender();
  }
}
