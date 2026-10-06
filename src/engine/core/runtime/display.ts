import { setLineResolution } from '../../render/lines';
import { fitBounds } from '../../interaction/camera';
import type { Viewport } from '../../interaction/camera';
import type { Rect } from '../../model/types';
import type { EngineCore } from '../EngineCore';

/** Taille du canvas et de son tampon de rendu (pixels physiques exacts), suivie en direct. */
export class Display {
  viewport: Viewport = { width: 1, height: 1 };
  /** Cadrage demandé avant que le canvas ait une taille réelle : appliqué à la première mesure. */
  pendingFit: Rect | undefined;
  private readonly resizeObserver: ResizeObserver;
  /** Taille de la boîte du canvas en pixels physiques, quand le navigateur la donne (pas Safari). */
  private devicePixelBox: { width: number; height: number } | undefined;
  /** Taille courante du tampon de rendu, en pixels physiques. */
  private bufferSize = { width: 0, height: 0 };
  /** Requête qui change quand `devicePixelRatio` change (autre écran, zoom du navigateur). */
  private pixelRatioQuery: MediaQueryList | undefined;

  constructor(private readonly core: EngineCore) {
    this.resizeObserver = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.devicePixelContentBoxSize?.[0];
      this.devicePixelBox = box ? { width: box.inlineSize, height: box.blockSize } : undefined;
      this.resize();
    });
  }

  /** Commence à suivre la taille du canvas et la densité de l'écran, et prend la première mesure. */
  observe(): void {
    try {
      this.resizeObserver.observe(this.core.canvas, { box: 'device-pixel-content-box' });
    } catch {
      this.resizeObserver.observe(this.core.canvas);
    }
    this.watchPixelRatio();
    this.resize();
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.pixelRatioQuery?.removeEventListener?.('change', this.onPixelRatioChange);
  }

  private resize(): void {
    // Taille exacte (clientWidth/clientHeight arrondissent, ce qui décale le zoom au curseur).
    const rect = this.core.canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 1);
    const height = Math.max(rect.height, 1);
    // Tampon aux pixels physiques exacts de la boîte : sinon le navigateur ré-échantillonne l'image (flou).
    const pixelRatio = window.devicePixelRatio || 1;
    const bufferWidth = Math.max(this.devicePixelBox?.width ?? Math.round(width * pixelRatio), 1);
    const bufferHeight = Math.max(this.devicePixelBox?.height ?? Math.round(height * pixelRatio), 1);
    const sameBuffer = bufferWidth === this.bufferSize.width && bufferHeight === this.bufferSize.height;
    if (width === this.viewport.width && height === this.viewport.height && sameBuffer) return;
    this.viewport = { width, height };
    if (!sameBuffer) {
      this.bufferSize = { width: bufferWidth, height: bufferHeight };
      this.core.rendering.renderer.setDrawingBufferSize(bufferWidth, bufferHeight, 1);
    }
    setLineResolution(width, height);
    if (this.pendingFit && this.isMeasured()) {
      this.core.camera.setCameraState(fitBounds(this.pendingFit, this.viewport, this.core.camera.orientation()));
      return;
    }
    this.core.rendering.applyProjection();
    this.core.relocateLabelEdit();
    this.core.minimap.requestDraw();
    this.core.rendering.requestRender();
  }

  /** Suit `devicePixelRatio` (le ResizeObserver ne le signale pas partout) pour garder un tampon net. */
  private watchPixelRatio(): void {
    this.pixelRatioQuery?.removeEventListener?.('change', this.onPixelRatioChange);
    this.pixelRatioQuery = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    this.pixelRatioQuery?.addEventListener?.('change', this.onPixelRatioChange);
  }

  private readonly onPixelRatioChange = (): void => {
    this.watchPixelRatio();
    this.resize();
  };

  /** Un canvas masqué ou pas encore mis en page mesure 0 (ramené à 1). */
  isMeasured(): boolean {
    return this.viewport.width > 1 && this.viewport.height > 1;
  }
}
