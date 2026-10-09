import { setLineResolution } from '../../render/lines';
import { fitBounds } from '../../interaction/cameraFraming';
import type { Viewport } from '../../interaction/cameraState';
import type { Rect } from '../../model/types';
import type { EngineCore } from '../EngineCore';

/** Taille du canvas et de son tampon de rendu (pixels physiques exacts), suivie en direct. */
export class Display {
  viewport: Viewport = { width: 1, height: 1 };
  /** Cadrage demandé avant que le canvas ait une taille réelle : appliqué à la première mesure. */
  private pendingFit: Rect | undefined;
  private readonly resizeObserver: ResizeObserver;
  /** Taille de la boîte du canvas en pixels physiques, quand le navigateur la donne (pas Safari). */
  private devicePixelBox: { width: number; height: number } | undefined;
  /** Taille courante du tampon de rendu, en pixels physiques. */
  private bufferSize = { width: 0, height: 0 };
  /** Requête qui change quand `devicePixelRatio` change (autre écran, zoom du navigateur). */
  private pixelRatioQuery: MediaQueryList | undefined;
  /** Écran de la dernière mesure (taille de `window.screen`, densité) : un changement = la fenêtre a changé d'écran. */
  private screenKey: string | undefined;
  /** Dernier changement d'écran : zoom quitté et zoom donné, pour retrouver le cadrage exact au retour. */
  private lastSwitch: { from: string; to: string; fromZoom: number; toZoom: number } | undefined;

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
    const screenKey = currentScreenKey();
    const previousScreen = this.screenKey;
    const screenChanged = previousScreen !== undefined && screenKey !== previousScreen;
    this.screenKey = screenKey;
    if (width === this.viewport.width && height === this.viewport.height && sameBuffer) return;
    const previous = this.viewport;
    const wasMeasured = this.isMeasured();
    this.viewport = { width, height };
    if (!sameBuffer) {
      this.bufferSize = { width: bufferWidth, height: bufferHeight };
      this.core.rendering.renderer.setDrawingBufferSize(bufferWidth, bufferHeight, 1);
    }
    setLineResolution(width, height);
    if (this.pendingFit && this.isMeasured()) {
      this.core.camera.setCameraState(
        fitBounds(this.pendingFit, this.viewport, {
          ...this.core.camera.orientation(),
          limits: this.core.camera.limits,
        }),
      );
      return;
    }
    // Autre écran (sujet 238) : même portion du schéma, la zone vue avant remplit le nouvel écran.
    if (screenChanged && wasMeasured && this.isMeasured()) {
      const state = this.core.camera.state;
      const factor = keptFramingFactor(previous, this.viewport);
      // Retour sur l'écran d'avant sans avoir touché à la vue : son zoom exact (les rapports ne s'annulent pas quand
      // les deux écrans n'ont pas les mêmes proportions).
      const back = this.lastSwitch;
      const zoom =
        back && back.from === screenKey && back.to === previousScreen && back.toZoom === state.zoom
          ? back.fromZoom
          : state.zoom * factor;
      if (zoom !== state.zoom) {
        this.core.camera.setCameraState({ ...state, zoom });
        this.lastSwitch = {
          from: previousScreen!,
          to: screenKey,
          fromZoom: state.zoom,
          toZoom: this.core.camera.state.zoom,
        };
        this.core.labelEditor.relocateLabelEdit();
        this.core.minimap.requestDraw();
        return;
      }
    }
    this.core.rendering.applyProjection();
    this.core.labelEditor.relocateLabelEdit();
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

  /** Cadrage à appliquer dès que le canvas aura une taille réelle. */
  fitWhenMeasured(bounds: Rect): void {
    this.pendingFit = bounds;
  }

  /** La caméra a été placée : le cadrage en attente n'a plus lieu d'être. */
  cancelPendingFit(): void {
    this.pendingFit = undefined;
  }
}

/** Écran courant : taille de `window.screen` et densité de pixels (change quand la fenêtre passe sur un autre écran). */
function currentScreenKey(): string {
  const screen = typeof window.screen === 'undefined' ? undefined : window.screen;
  return `${screen?.width ?? 0}x${screen?.height ?? 0}@${window.devicePixelRatio || 1}`;
}

/**
 * Facteur de zoom qui garde le cadrage d'un viewport à l'autre (sujet 238) : la zone vue avant reste entièrement
 * visible et remplit le nouveau viewport (le plus petit des deux rapports de taille).
 */
export function keptFramingFactor(
  from: { width: number; height: number },
  to: { width: number; height: number },
): number {
  return Math.min(to.width / from.width, to.height / from.height);
}
