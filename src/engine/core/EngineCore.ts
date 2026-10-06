import { Emitter } from '../events';
import { withViewMode } from '../interaction/camera';
import type { CameraController } from '../interaction/controls';
import { defaultEffectRegistry } from '../effects/registry';
import type { PageEffectRegistry } from '../effects/registry';
import { defaultModeRegistry } from '../modes/registry';
import type { PageModeRegistry } from '../modes/registry';
import { SceneManager } from '../render/sceneManager';
import { defaultShapeRegistry } from '../shapes/registry';
import type { ShapeRegistry } from '../shapes/registry';
import { createTroikaTextFactory } from '../render/troikaText';
import type { EngineEvent, EngineEvents, EngineOptions } from './types';
import { Config } from './runtime/config';
import type { Settings } from '../settings';
import { Rendering } from './runtime/rendering';
import { Display } from './runtime/display';
import { DocumentFile } from './document/file';
import { EditHistory } from './document/undo';
import { Pages } from './document/pages';
import { createCameraController } from './input/controls';
import { ViewCamera } from './view/camera';
import { ViewModes } from './view/viewModes';
import { Levels } from './view/levels';
import { SceneView } from './view/scene';
import { GraphView } from './view/graph';
import { MinimapView } from './view/minimap';
import { Selections } from './selection/selection';
import { Picking } from './selection/picking';
import { SelectionHighlight } from './selection/highlight';
import { PointerInput } from './input/pointer';
import { ModifierKeys } from './input/keys';
import { Links } from './navigation/links';
import { BackHistory } from './navigation/history';
import { Transitions } from './navigation/transition';
import { PageModes } from './modes/pageModes';
import { EditTargets } from './edit/targets';
import { ShapeHandles } from './edit/handles';
import { EdgeHandles } from './edit/edges/handles';
import { Anchors } from './edit/edges/anchors';
import { EdgePoints } from './edit/edges/points';
import { EdgeArrangement } from './edit/edges/arrangement';
import { EdgeJumps } from './edit/edges/jumps';
import { DragGesture } from './edit/drag/gesture';
import { MoveDrags } from './edit/drag/move';
import { ResizeDrags } from './edit/drag/resize';
import { ConnectDrags } from './edit/drag/connect';
import { EdgeEndDrags } from './edit/drag/edgeEnd';
import { EdgePointsDrags } from './edit/drag/edgePoints';
import { LabelDrags } from './edit/drag/label';
import { ConnectorPreview } from './edit/drag/preview';
import { LiveEdit } from './edit/drag/liveEdit';
import { LabelEditor } from './edit/text/labelEditor';
import { EdgeTexts } from './edit/text/edgeTexts';
import { TextEdits } from './edit/text/textEdits';
import { PropertyEdits } from './edit/commands/properties';
import { ElementCommands } from './edit/commands/elements';
import { StyleCommands } from './edit/commands/styles';
import { ArrangeCommands } from './edit/commands/arrange';
import { Clipboard } from './edit/commands/clipboard';

/** Cœur du moteur : état et comportement, derrière la façade `Engine` (SPEC §4.3). */
export class EngineCore {
  // Domaines
  readonly clipboard = new Clipboard(this);
  readonly arrange = new ArrangeCommands(this);
  readonly styles = new StyleCommands(this);
  readonly elements = new ElementCommands(this);
  readonly properties = new PropertyEdits(this);
  readonly textEdits = new TextEdits(this);
  readonly edgeTexts = new EdgeTexts(this);
  readonly labelEditor = new LabelEditor(this);
  readonly live = new LiveEdit(this);
  readonly preview = new ConnectorPreview(this);
  readonly labelDrags = new LabelDrags(this);
  readonly edgePointsDrags = new EdgePointsDrags(this);
  readonly edgeEndDrags = new EdgeEndDrags(this);
  readonly connectDrags = new ConnectDrags(this);
  readonly resizeDrags = new ResizeDrags(this);
  readonly moveDrags = new MoveDrags(this);
  readonly gesture = new DragGesture(this);
  readonly jumps = new EdgeJumps(this);
  readonly arrangement = new EdgeArrangement(this);
  readonly edgePoints = new EdgePoints(this);
  readonly anchors = new Anchors(this);
  readonly edgeHandles = new EdgeHandles(this);
  readonly shapeHandles = new ShapeHandles(this);
  readonly targets: EditTargets;
  readonly pageModes = new PageModes(this);
  readonly transitions = new Transitions(this);
  readonly history = new BackHistory(this);
  readonly links: Links;
  readonly keys = new ModifierKeys(this);
  readonly pointer = new PointerInput(this);
  readonly highlight = new SelectionHighlight(this);
  readonly picking = new Picking(this);
  readonly selection = new Selections(this);
  readonly minimap = new MinimapView(this);
  readonly graph = new GraphView(this);
  readonly sceneView = new SceneView(this);
  readonly levels = new Levels(this);
  readonly viewModes = new ViewModes(this);
  readonly camera = new ViewCamera(this);
  readonly pages = new Pages(this);
  readonly edits = new EditHistory(this);
  readonly file = new DocumentFile(this);
  readonly display = new Display(this);
  readonly rendering: Rendering;
  readonly config: Config;

  /** Paramètres en vigueur (`config`). */
  get settings(): Settings {
    return this.config.settings;
  }

  readonly canvas: HTMLCanvasElement;
  readonly registry: ShapeRegistry;
  readonly modes: PageModeRegistry;
  readonly effects: PageEffectRegistry;
  readonly text: ReturnType<typeof createTroikaTextFactory>;
  readonly events = new Emitter<EngineEvents>();
  readonly controller: CameraController;

  readonly scenes: SceneManager;
  disposed = false;

  constructor(options: EngineOptions) {
    this.canvas = options.canvas;
    this.registry = options.registry ?? defaultShapeRegistry;
    this.modes = options.modes ?? defaultModeRegistry;
    this.effects = options.effects ?? defaultEffectRegistry;
    this.config = new Config(this, options);
    this.edits.undoStack.setLimit(this.settings.edit.undoLimit);
    if (this.settings.view.defaultMode !== 'top') {
      this.camera.state = withViewMode(
        this.camera.state,
        this.settings.view.defaultMode,
        this.camera.isoTilt(),
        this.camera.isoAzimuth(),
      );
    }
    this.links = new Links(this, options.openUrl);
    this.targets = new EditTargets(this, options.editable ?? false);
    this.rendering = new Rendering(this);
    this.text = createTroikaTextFactory(options.fonts ?? {}, this.rendering.requestRender);
    this.scenes = new SceneManager(
      this.rendering.scene,
      (page, level) => this.sceneView.buildScene(page, level),
      this.settings.preload.maxCachedPages,
      (page) => this.sceneView.levelOf(page),
    );

    this.display.observe();

    this.controller = createCameraController(this);
  }

  // -------------------------------------------------------------------------
  // Création (SPEC §14.1)

  focusCanvas(): void {
    this.canvas.focus({ preventScroll: true });
  }

  // -------------------------------------------------------------------------
  // Modes de vue (SPEC §9.1)

  // -------------------------------------------------------------------------
  // Vue graphe (SPEC §12)

  // -------------------------------------------------------------------------
  // Paramètres (SPEC §13)

  // -------------------------------------------------------------------------
  // Sélection et liens (SPEC §11)

  // -------------------------------------------------------------------------
  // Édition à la souris (SPEC §14.1) : déplacer, redimensionner, connecter

  // -------------------------------------------------------------------------
  // Édition par commandes (SPEC §14.1) : label, lien, suppression, annuler / rétablir

  // -------------------------------------------------------------------------
  // Modes de page (sujet 69)

  on<K extends EngineEvent>(event: K, handler: (...args: EngineEvents[K]) => void): () => void {
    return this.events.on(event, handler);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.camera.animation);
    this.highlight.dispose();
    clearTimeout(this.pointer.hoverTimer);
    this.transitions.active?.abort();
    this.display.dispose();
    this.controller.dispose();
    this.config.dispose();
    this.minimap.dispose();
    this.scenes.clear();
    this.text.dispose();
    this.rendering.dispose();
    this.events.clear();
  }

  // -------------------------------------------------------------------------
}
