import { easeInOutCubic } from '../../model/numbers';
import { spreadLayers } from '../../render/layerPlanes';
import type { EngineCore } from '../EngineCore';

/**
 * Calques aplatis ou étendus de chaque page (sujet 526) : état de session, jamais écrit. Aplatir ramène l'élévation
 * des calques à 0 en animation sur la scène affichée, puis la scène est reconstruite à plat (clic et poignées lisent
 * ses hauteurs) ; étendre fait l'inverse.
 */
export class LayerSpreads {
  /** Pages aux calques aplatis. */
  private readonly flat = new Set<string>();
  private animation: { pageId: string; from: number; to: number; start: number; frame: number } | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Nouveau document : calques étendus partout, animation arrêtée. */
  resetDocument(): void {
    this.flat.clear();
    this.stop();
  }

  layersFlattened(pageId: string): boolean {
    return this.flat.has(pageId);
  }

  /** Part de l'élévation des calques appliquée à la construction d'une scène : 0 aplatis, 1 étendus. */
  spreadOf(pageId: string): number {
    return this.flat.has(pageId) ? 0 : 1;
  }

  setLayersFlattened(pageId: string, flattened: boolean): void {
    if (flattened === this.flat.has(pageId) || !this.core.canInteract()) return;
    // Repart d'où en est une animation interrompue sur la même page.
    const from = this.animation?.pageId === pageId ? this.current(performance.now()) : this.spreadOf(pageId);
    this.stop();
    if (flattened) this.flat.add(pageId);
    else this.flat.delete(pageId);
    this.core.events.emit('layerChange', pageId);
    const scene = this.core.scenes.current;
    const duration = this.core.settings.view.switchDurationMs;
    if (!scene || scene.pageId !== pageId || scene.level !== 'iso' || duration <= 0 || this.core.config.reducedMotion())
      return this.settle(pageId);
    this.animation = { pageId, from, to: this.spreadOf(pageId), start: performance.now(), frame: 0 };
    const step = (now: number) => {
      const animation = this.animation;
      const shown = this.core.scenes.current;
      if (!animation || this.core.disposed) return;
      if (!shown || shown.pageId !== pageId) return this.settle(pageId);
      spreadLayers(shown.root, this.current(now));
      this.core.rendering.requestRender();
      if (now - animation.start >= duration) return this.settle(pageId);
      animation.frame = requestAnimationFrame(step);
    };
    this.animation.frame = requestAnimationFrame(step);
  }

  /** Valeur animée à l'instant `now`. */
  private current(now: number): number {
    const animation = this.animation;
    if (!animation) return 0;
    const t = Math.min((now - animation.start) / Math.max(this.core.settings.view.switchDurationMs, 1), 1);
    return animation.from + (animation.to - animation.from) * easeInOutCubic(t);
  }

  /** Fin de l'animation : la scène de la page est reconstruite à sa valeur d'arrivée. */
  private settle(pageId: string): void {
    this.stop();
    this.core.levels.rebuildScenes([pageId]);
  }

  private stop(): void {
    if (this.animation) cancelAnimationFrame(this.animation.frame);
    this.animation = undefined;
  }
}
