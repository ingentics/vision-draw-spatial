import type { UnsupportedReport } from './core/diagnostics/unsupportedStyles';
import type { DocumentModel } from './core/model/types';
import type { EngineMetrics } from './core/domains/runtime/metrics';
import type { Settings, SettingsPatch } from './core/settings';
import { EngineCore } from './core/domains/EngineCore';
import { createDefaultEffectRegistry, createDefaultModeRegistry, createDefaultRegistry } from './plugins';
import type { EngineEvent, EngineEvents, EngineOptions, InitialView } from './core/domains/types';
import { HistoryApi } from './facade/historyApi';
import { PagesApi } from './facade/pagesApi';
import { ViewApi } from './facade/viewApi';
import { GraphApi } from './facade/graphApi';
import { NavigationApi } from './facade/navigationApi';
import { SelectionApi } from './facade/selectionApi';
import { EditApi } from './facade/editApi';
import { TextApi } from './facade/textApi';
import { LayersApi } from './facade/layersApi';
import { ShapesApi } from './facade/shapesApi';
import { GenerationApi } from './facade/generationApi';
import { ModesApi } from './facade/modesApi';
import { EffectsApi } from './facade/effectsApi';
import { TakeoverApi } from './facade/takeoverApi';

/**
 * Façade publique du moteur (SPEC §4.3). Aucune dépendance à React. Le comportement est dans `core/`, découpé par
 * domaine ; la façade n'en expose que l'API : ici le cycle de vie, le document, les métriques et les paramètres, et un
 * objet par domaine (`facade/`, sujet 558 : `engine.pages.add()`, `engine.layers.rename()`…).
 */
export class Engine {
  private readonly core: EngineCore;
  /** Annuler / rétablir. */
  readonly history: HistoryApi;
  /** Pages du document. */
  readonly pages: PagesApi;
  /** Caméra et vues. */
  readonly view: ViewApi;
  /** Vue graphe et mini-graphe. */
  readonly graph: GraphApi;
  /** Liens et navigation. */
  readonly navigation: NavigationApi;
  /** Sélection et commandes sur elle. */
  readonly selection: SelectionApi;
  /** Édition des éléments. */
  readonly edit: EditApi;
  /** Textes et commentaires. */
  readonly text: TextApi;
  /** Calques des pages. */
  readonly layers: LayersApi;
  /** Formes, palette et bibliothèques de formes. */
  readonly shapes: ShapesApi;
  /** Formes générées par l'hôte. */
  readonly generation: GenerationApi;
  /** Modes de page. */
  readonly modes: ModesApi;
  /** Effets de page. */
  readonly effects: EffectsApi;
  /** Prise en main de la page par un mode (`PageTakeover`). */
  readonly takeover: TakeoverApi;

  constructor(options: EngineOptions) {
    // Registres des plugins : ceux donnés, sinon ceux construits par la racine de composition (sujet 286), propres à
    // ce moteur (sujet 304).
    this.core = new EngineCore({
      ...options,
      registry: options.registry ?? createDefaultRegistry(),
      modes: options.modes ?? createDefaultModeRegistry(),
      effects: options.effects ?? createDefaultEffectRegistry(),
    });
    this.history = new HistoryApi(this.core);
    this.pages = new PagesApi(this.core);
    this.view = new ViewApi(this.core);
    this.graph = new GraphApi(this.core);
    this.navigation = new NavigationApi(this.core);
    this.selection = new SelectionApi(this.core);
    this.edit = new EditApi(this.core);
    this.text = new TextApi(this.core);
    this.layers = new LayersApi(this.core);
    this.shapes = new ShapesApi(this.core);
    this.generation = new GenerationApi(this.core);
    this.modes = new ModesApi(this.core);
    this.effects = new EffectsApi(this.core);
    this.takeover = new TakeoverApi(this.core);
  }

  /** Rend le focus clavier au canvas (ex. après un dépôt depuis la palette). */
  focusCanvas(): void {
    this.core.focusCanvas();
  }

  on<K extends EngineEvent>(event: K, handler: (...args: EngineEvents[K]) => void): () => void {
    return this.core.on(event, handler);
  }

  dispose(): void {
    this.core.dispose();
  }

  load(xml: string, fileId: string, initialView?: InitialView): Promise<void> {
    return this.core.file.load(xml, fileId, initialView);
  }

  getDocument(): DocumentModel | undefined {
    return this.core.file.document;
  }

  /**
   * XML du document à sauvegarder (SPEC §14.2) : l'arbre d'origine, modifié en place, avec l'état
   * de vue de chaque page visitée (caméra, mode et réglages de rendu). Le document est ensuite
   * considéré comme sauvegardé.
   */
  serialize(): string | undefined {
    return this.core.file.serialize();
  }

  /** Éléments non supportés du document chargé, triés par fréquence (SPEC §8.4). */
  getUnsupportedReport(): UnsupportedReport | undefined {
    return this.core.file.getUnsupportedReport();
  }

  getFileId(): string | undefined {
    return this.core.file.fileId;
  }

  /**
   * Métriques de l'instance (sujet 298) : images rendues (si la mesure est active), durées de lecture et de
   * construction de la scène courante, comptes de la scène et de la mémoire GPU.
   */
  getMetrics(): EngineMetrics {
    return this.core.metrics.snapshot();
  }

  /** Mesure des images rendues, à n'activer que le temps de l'afficher (panneau Diagnostics ouvert). */
  setFrameSampling(on: boolean): void {
    this.core.metrics.setSampling(on);
  }

  getSettings(): Settings {
    return this.core.config.getSettings();
  }

  /**
   * Modifie des paramètres, section par section ; tout s'applique immédiatement : contrôles,
   * transitions, préchargement, taille du cache, et en iso l'élévation / l'orientation (animées ;
   * l'orientation est absolue : la vue prend exactement l'angle choisi).
   */
  updateSettings(patch: SettingsPatch): void {
    this.core.config.updateSettings(patch);
  }
}
