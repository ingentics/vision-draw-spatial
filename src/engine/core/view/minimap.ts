import { Minimap } from '../../interaction/minimap';
import type { Point } from '../../model/types';
import type { EngineCore } from '../EngineCore';
import type { Settings } from '../../settings';

/** Mini-carte (SPEC §10), dans un canvas fourni par l'UI. */
export class MinimapView {
  private current: Minimap | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Paramètres changés : couleurs de la mini-carte (redessinée), couleur d'accent (cadre de la vue). */
  settingsChanged(settings: Settings, previous: Settings): void {
    if (
      settings.minimap.edgeColor !== previous.minimap.edgeColor ||
      settings.minimap.outlineColor !== previous.minimap.outlineColor
    )
      this.invalidate();
    else if (settings.selection.accentColor !== previous.selection.accentColor) this.requestDraw();
  }

  /** Page ou scène changée : la mini-carte est redessinée de zéro. */
  invalidate(): void {
    this.current?.invalidate();
  }

  /** Caméra changée : seul le cadre de la vue bouge. */
  requestDraw(): void {
    this.current?.requestDraw();
  }

  dispose(): void {
    this.current?.dispose();
  }

  attachMinimap(canvas: HTMLCanvasElement, size = 200): () => void {
    this.current?.dispose();
    const minimap = new Minimap(
      canvas,
      {
        getPage: () => this.core.pages.getCurrentPage(),
        getCamera: () => this.core.camera.state,
        getViewport: () => this.core.display.viewport,
        getBackground: () => this.core.settings.background.color,
        getAccent: () => this.core.settings.selection.accentColor,
        getColors: () => ({
          edge: this.core.settings.minimap.edgeColor,
          outline: this.core.settings.minimap.outlineColor,
          placeholder: this.core.settings.shapes.placeholderFill,
        }),
        getEdgeRoute: (id) => this.core.sceneView.sceneObject(id)?.userData.route as Point[] | undefined,
        paintShape: (context, shape, map) => this.core.registry.minimapPainter(shape)?.(context, shape, map),
        centerOn: (point) => {
          if (this.core.canInteract()) this.core.camera.setCameraState({ ...this.core.camera.state, center: point });
        },
      },
      size,
    );
    this.current = minimap;
    minimap.invalidate();
    return () => {
      minimap.dispose();
      if (this.current === minimap) this.current = undefined;
    };
  }
}
