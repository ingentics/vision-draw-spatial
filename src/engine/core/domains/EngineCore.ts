import { Emitter } from '../../events';
import type { CameraController } from '../interaction/controls';
import type { PageEffectRegistry } from '../effects/registry';
import type { PageModeRegistry } from '../modes/registry';
import { SceneManager } from '../render/sceneManager';
import type { ShapeRegistry } from '../shapes/registry';
import { TextMeasure } from '../render/textMeasure';
import { createTroikaTextFactory } from '../render/troikaText';
import type { EngineEvent, EngineEvents, EngineOptions, InitialView, PluginRegistries } from './types';
import { Config } from './runtime/config';
import type { Settings } from '../settings';
import { Rendering } from './runtime/rendering';
import { Display } from './runtime/display';
import { Metrics } from './runtime/metrics';
import { PluginGuard } from './runtime/pluginGuard';
import { DocumentFile } from './document/file';
import { EditHistory } from './document/undo';
import { Pages } from './document/pages';
import { createCameraController } from './input/cameraControls';
import { ViewCamera } from './view/camera';
import { ViewModes } from './view/viewModes';
import { Levels } from './view/levels';
import { SceneView } from './view/scene';
import { GraphView } from './view/graph';
import { ImageExport } from './view/imageExport';
import { MinimapView } from './view/minimap';
import { ScreenProjection } from './view/projection';
import { Selections } from './selection/selection';
import { Picking } from './selection/picking';
import { SelectionHighlight } from './selection/highlight';
import { SplitHoverView } from './selection/splitHover';
import { PointerInput } from './input/pointerInput';
import { ModifierKeys } from './input/keys';
import { Links } from './navigation/links';
import { BackHistory } from './navigation/history';
import { Transitions } from './navigation/transition';
import { ModeCurrents } from './modes/modeCurrents';
import { EditLocks } from './edit/editLocks';
import { InputCaptures } from './input/inputCaptures';
import { PageOverlays } from './runtime/pageOverlays';
import { PageModes } from './modes/pageModes';
import { ModePanel } from './modes/modePanel';
import { ModeFollowUps } from './modes/modeFollowUps';
import { ShapeParts } from './modes/shapeParts';
import { ModeHandles } from './modes/modeHandles';
import { PageEffects } from './effects/pageEffects';
import { EditTargets } from './edit/targets';
import { ShapeHandles } from './edit/shapeHandles';
import { EdgeHandles } from './edit/edges/edgeHandles';
import { Anchors } from './edit/edges/anchors';
import { EdgePoints } from './edit/edges/points';
import { EdgeArrangement } from './edit/edges/arrangement';
import { EdgeJumps } from './edit/edges/edgeJumps';
import { DragGesture } from './edit/drag/gesture';
import { MoveDrags } from './edit/drag/move';
import { ResizeDrags } from './edit/drag/resize';
import { ConnectDrags } from './edit/drag/connect';
import { EdgeEndDrags } from './edit/drag/edgeEnd';
import { EdgePointsDrags } from './edit/drag/edgePoints';
import { LabelDrags } from './edit/drag/label';
import { PartDrags } from './edit/drag/part';
import { ConnectorPreview } from './edit/drag/preview';
import { LiveEdit } from './edit/drag/liveEdit';
import { LabelEditor } from './edit/text/labelEditor';
import { EdgeTexts } from './edit/text/edgeTexts';
import { TextEdits } from './edit/text/textEdits';
import { PropertyEdits } from './edit/commands/properties';
import { ElementCommands } from './edit/commands/elements';
import { StyleCommands } from './edit/commands/styles';
import { ArrangeCommands } from './edit/commands/arrange';
import { OrientCommands } from './edit/commands/orientation';
import { Clipboard } from './edit/commands/clipboard';

/** Domaine qui garde un état lié au document chargé : remis à zéro à chaque chargement. */
interface DocumentState {
  resetDocument(initialView: InitialView | undefined): void;
}

/** Domaine qui dépend des paramètres : prévenu de chaque changement (`previous` : valeurs d'avant). */
interface SettingsListener {
  settingsChanged(settings: Settings, previous: Settings): void;
}

/** Domaine qui dépend des réglages propres à une page (réglages iso), adoptés à son arrivée sans animer. */
interface PageSettingsListener {
  pageSettingsAdopted(settings: Settings, previous: Settings): void;
}

/**
 * Cœur du moteur, derrière la façade `Engine` (SPEC §4.3) : l'infrastructure partagée (canvas, registres,
 * événements, scènes) et un objet par domaine (un dossier de `core/` chacun). Chaque domaine garde son état et
 * passe par le cœur pour joindre les autres.
 */
export class EngineCore {
  readonly canvas: HTMLCanvasElement;
  readonly registry: ShapeRegistry;
  readonly modes: PageModeRegistry;
  readonly effects: PageEffectRegistry;
  readonly events = new Emitter<EngineEvents>();
  readonly text: ReturnType<typeof createTroikaTextFactory>;
  /** Polices nommées fournies par l'hôte (`fonts.families`) : celles qu'un mode demande sans les trouver sont signalées. */
  readonly providedFonts: ReadonlySet<string>;
  /** Mesure du texte de ce moteur (sujet 377), remise aux formes et aux modes : approchée, puis exacte. */
  readonly textMeasure = new TextMeasure();
  readonly scenes: SceneManager;
  readonly controller: CameraController;
  private wasDisposed = false;

  // runtime : paramètres, rendu, taille du canvas, mesures, erreurs des plugins
  readonly config: Config;
  readonly rendering: Rendering;
  readonly display = new Display(this);
  readonly metrics = new Metrics(this);
  readonly pluginGuard = new PluginGuard(this);

  // document : fichier chargé, annuler / rétablir, pages
  readonly file = new DocumentFile(this);
  readonly edits = new EditHistory(this);
  readonly pages = new Pages(this);

  // view : caméra, modes de vue, niveaux de rendu, scènes, vue graphe, mini-carte, projection page ↔ écran
  readonly camera = new ViewCamera(this);
  readonly viewModes = new ViewModes(this);
  readonly levels = new Levels(this);
  readonly sceneView = new SceneView(this);
  readonly graph = new GraphView(this);
  readonly minimap = new MinimapView(this);
  readonly imageExport = new ImageExport(this);
  readonly projection = new ScreenProjection(this);

  // selection : sélection, ce qui est sous le pointeur, mise en valeur
  readonly selection = new Selections(this);
  readonly picking = new Picking(this);
  readonly highlight = new SelectionHighlight(this);
  readonly splitHover = new SplitHoverView(this);

  // input : gestes du pointeur, touches maintenues
  readonly pointer = new PointerInput(this);
  readonly keys = new ModifierKeys(this);

  // navigation : liens, retour, transitions entre pages
  readonly links: Links;
  readonly history = new BackHistory(this);
  readonly transitions = new Transitions(this);

  // modes : modes de page
  readonly pageModes = new PageModes(this);
  readonly modePanel = new ModePanel(this);
  readonly modeFollowUps = new ModeFollowUps(this);
  readonly modeCurrents = new ModeCurrents(this);
  /** Prise en main de la page par un mode (sujet 467) : verrou d'édition, entrées capturées, couche par-dessus. */
  readonly editLocks = new EditLocks(this);
  readonly inputCaptures = new InputCaptures(this);
  readonly overlays = new PageOverlays(this);
  readonly shapeParts = new ShapeParts(this);
  readonly modeHandles = new ModeHandles(this);

  // effects : effets de page
  readonly pageEffects = new PageEffects(this);

  // edit : cibles et poignées
  readonly targets: EditTargets;
  readonly shapeHandles = new ShapeHandles(this);
  // edit/edges : flèches
  readonly edgeHandles = new EdgeHandles(this);
  readonly anchors = new Anchors(this);
  readonly edgePoints = new EdgePoints(this);
  readonly arrangement = new EdgeArrangement(this);
  readonly jumps = new EdgeJumps(this);
  // edit/drag : glisser à la souris
  readonly gesture = new DragGesture(this);
  readonly moveDrags = new MoveDrags(this);
  readonly partDrags = new PartDrags(this);
  readonly resizeDrags = new ResizeDrags(this);
  readonly connectDrags = new ConnectDrags(this);
  readonly edgeEndDrags = new EdgeEndDrags(this);
  readonly edgePointsDrags = new EdgePointsDrags(this);
  readonly labelDrags = new LabelDrags(this);
  readonly preview = new ConnectorPreview(this);
  readonly live = new LiveEdit(this);
  // edit/text : textes
  readonly labelEditor = new LabelEditor(this);
  readonly edgeTexts = new EdgeTexts(this);
  readonly textEdits = new TextEdits(this);
  // edit/commands : commandes
  readonly elements = new ElementCommands(this);
  readonly styles = new StyleCommands(this);
  readonly arrange = new ArrangeCommands(this);
  readonly orient = new OrientCommands(this);
  readonly clipboard = new Clipboard(this);
  readonly properties = new PropertyEdits(this);

  /** Paramètres en vigueur (`config`). */
  get settings(): Settings {
    return this.config.settings;
  }

  /** `options` : registres des plugins résolus par la façade (registres par défaut si on n'en donne pas, sujet 286). */
  constructor(options: EngineOptions & PluginRegistries) {
    this.canvas = options.canvas;
    // Formes protégées (sujet 300) : une forme en panne est signalée dans les Diagnostics, comme un mode.
    this.registry = options.registry
      .reportingTo((shapeId, hook, error) => this.pluginGuard.reporter('Forme', shapeId, hook, error))
      .measuringWith(this.textMeasure.measure);
    this.modes = options.modes;
    this.effects = options.effects;
    this.config = new Config(this, options);
    // Paramètres de départ : seul l'historique, créé avant `config`, ne les a pas reçus à sa construction.
    this.edits.settingsChanged(this.settings);
    this.camera.startInDefaultMode();
    this.links = new Links(this, options.openUrl);
    this.targets = new EditTargets(this, options.editable ?? false);
    this.rendering = new Rendering(this);
    this.text = createTroikaTextFactory(options.fonts ?? {}, this.rendering.requestRender);
    this.providedFonts = new Set(Object.keys(options.fonts?.families ?? {}));
    // Polices chargées : les géométries qui suivent la largeur d'un texte (onglet d'une région RDD) la prennent exacte.
    void this.text.measured().then((measure) => {
      this.textMeasure.settle(measure);
      if (!this.wasDisposed && this.scenes.current) this.levels.rebuildScenes();
      // Tailles calculées sur la mesure approchée : reprises sur la mesure exacte (sujet 255).
      if (!this.wasDisposed) this.modeFollowUps.documentOpened();
    });
    this.scenes = new SceneManager(
      this.rendering.scene,
      (page, level) => this.sceneView.buildScene(page, level),
      this.settings.preload.maxCachedPages,
      (page) => this.sceneView.levelOf(page),
    );

    this.display.observe();

    this.controller = createCameraController(this);
    // Changer de page rend le verrou d'un mode et retire sa couche (sujet 467).
    this.events.on('pageChange', (page) => {
      this.editLocks.pageShown(page.id);
      this.overlays.pageShown(page.id);
    });
  }

  /** Moteur libéré (lecture seule : `dispose`). */
  get disposed(): boolean {
    return this.wasDisposed;
  }

  focusCanvas(): void {
    this.canvas.focus({ preventScroll: true });
  }

  /**
   * Nouveau document (`DocumentFile.load`) : chaque domaine qui garde un état lié au document le remet à zéro, dans
   * cet ordre. Un domaine qui ajoute un tel état s'inscrit ici.
   */
  resetDocumentState(initialView: InitialView | undefined): void {
    const states: DocumentState[] = [
      this.editLocks,
      this.overlays,
      this.transitions,
      this.selection,
      this.sceneView,
      this.pages,
      this.graph,
      this.gesture,
      this.partDrags,
      this.edits,
      this.modeCurrents,
      this.shapeParts,
      this.history,
      this.links,
      this.metrics,
    ];
    for (const state of states) state.resetDocument(initialView);
  }

  /**
   * Paramètres changés (`Config.updateSettings`) : chaque domaine concerné en tire les conséquences, dans cet ordre
   * (la vue graphe est invalidée avant la reconstruction des scènes). Un domaine qui dépend d'un paramètre s'inscrit
   * ici.
   */
  settingsChanged(settings: Settings, previous: Settings): void {
    const listeners: SettingsListener[] = [
      this.sceneView,
      this.edits,
      this.highlight,
      this.graph,
      this.levels,
      this.camera,
      this.minimap,
      this.rendering,
      this.viewModes,
    ];
    for (const listener of listeners) listener.settingsChanged(settings, previous);
  }

  /**
   * Réglages propres à une page adoptés à son arrivée (`Config.adoptPageIso`), sans animer : seuls les domaines dont le
   * dessin en dépend avant l'affichage de la page s'inscrivent ici (les autres suivent à l'affichage).
   */
  pageSettingsAdopted(settings: Settings, previous: Settings): void {
    const listeners: PageSettingsListener[] = [this.levels];
    for (const listener of listeners) listener.pageSettingsAdopted(settings, previous);
  }

  /** Garde commun : la vue accepte les commandes (pas de transition entre pages en cours, SPEC §11.2). */
  canInteract(): boolean {
    return !this.transitions.isTransitioning();
  }

  on<K extends EngineEvent>(event: K, handler: (...args: EngineEvents[K]) => void): () => void {
    return this.events.on(event, handler);
  }

  dispose(): void {
    if (this.wasDisposed) return;
    this.wasDisposed = true;
    this.camera.cancelAnimation();
    this.highlight.dispose();
    this.editLocks.dispose();
    this.overlays.dispose();
    this.pointer.dispose();
    this.transitions.abort();
    this.display.dispose();
    this.controller.dispose();
    this.config.dispose();
    this.minimap.dispose();
    this.scenes.clear();
    this.text.dispose();
    this.rendering.dispose();
    this.events.clear();
  }
}
