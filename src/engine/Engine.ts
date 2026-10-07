import type { ElementComment } from './core/edit/comment';
import type { UnsupportedReport } from './core/diagnostics/unsupportedStyles';
import type { AlignMove, AlignReference, DistributeMove } from './core/edit/align';
import type { Anchoring } from './core/edit/anchoring/mode';
import type { EdgeEnd } from './core/edit/edgeLabels';
import { usedTemplatesIn } from './core/edit/palette';
import type { PageModePalette, ShapeTemplate } from './core/edit/palette';
import type { EffectRegistryView } from './core/effects/registry';
import type { StylePreset } from './core/edit/stylePresets';
import type { OrderMove } from './core/format/order';
import type { DrawioTree } from './core/format/xmlTree';
import type { CameraState, ViewMode } from './core/interaction/cameraMath';
import type { HistoryEntry, LinkUsage } from './core/interaction/navigationHistory';
import type { PickedElement } from './core/interaction/pick';
import type { DocumentModel, LinkModel, PageModel, Point, Rect } from './core/model/types';
import type { ModeRegistryView, ModeScope } from './core/modes/registry';
import type { ShapeRegistryView } from './core/shapes/registry';
import type { ModeEdit, ModeTarget } from './core/modes/types';
import type { JumpDefaults } from './core/render/edges/jumps';
import type { PageScene } from './core/render/pageScene';
import type { EngineMetrics } from './core/domains/runtime/metrics';
import type { Settings, SettingsPatch } from './core/settings';
import { EngineCore } from './core/domains/EngineCore';
import { createDefaultEffectRegistry, createDefaultModeRegistry, createDefaultRegistry } from './plugins';
import type {
  BackTarget,
  EdgeTextAnchor,
  EngineEvent,
  EngineEvents,
  EngineOptions,
  InitialView,
  ModeIndicator,
  ModePropertyView,
  Selection,
} from './core/domains/types';

export type { PreloadSettings, Settings, SettingsPatch, TransitionSettings, ViewSettings } from './core/settings';
export type {
  BackTarget,
  EdgeTextAnchor,
  EngineEvent,
  EngineEvents,
  EngineOptions,
  InitialView,
  LabelEditPlane,
  CommentEditRequest,
  LabelEditRequest,
  ModeHint,
  ModeIndicator,
  ModePropertyView,
  Selection,
} from './core/domains/types';

/**
 * Façade publique du moteur (SPEC §4.3). Aucune dépendance à React. Le comportement est dans `core/`, découpé
 * par domaine ; la façade n'en expose que l'API.
 */
export class Engine {
  private readonly core: EngineCore;

  constructor(options: EngineOptions) {
    // Registres des plugins : ceux donnés, sinon ceux construits par la racine de composition (sujet 286), propres à
    // ce moteur (sujet 304).
    this.core = new EngineCore({
      ...options,
      registry: options.registry ?? createDefaultRegistry(),
      modes: options.modes ?? createDefaultModeRegistry(),
      effects: options.effects ?? createDefaultEffectRegistry(),
    });
  }

  // -------------------------------------------------------------------------
  // Cycle de vie

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

  // -------------------------------------------------------------------------
  // Document (SPEC §5, §14.2)

  load(xml: string, fileId: string, initialView?: InitialView): Promise<void> {
    return this.core.file.load(xml, fileId, initialView);
  }

  getDocument(): DocumentModel | undefined {
    return this.core.file.getDocument();
  }

  /** Arbre XML d'origine du document chargé : ses `cells` ont les mêmes ids que le modèle. */
  getXmlTree(): DrawioTree | undefined {
    return this.core.file.getXmlTree();
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
    return this.core.file.getFileId();
  }

  // -------------------------------------------------------------------------
  // Pages

  /** Pages modifiables : fichier `<mxfile>` (l'ancien format n'a qu'une page sans nom). */
  canEditPages(): boolean {
    return this.core.pages.canEditPages();
  }

  /** Ajoute une page vide (« Page-n ») et l'affiche. */
  addPage(name?: string): string | undefined {
    return this.core.pages.addPage(name);
  }

  renamePage(pageId: string, name: string): void {
    this.core.pages.renamePage(pageId, name);
  }

  /** Retire une page (pas la dernière) ; si c'était la page affichée, on passe à sa voisine. */
  removePage(pageId: string): void {
    this.core.pages.removePage(pageId);
  }

  getCurrentPage(): PageModel | undefined {
    return this.core.pages.getCurrentPage();
  }

  /** Dernière caméra de chaque page visitée (à persister, SPEC §5.1 `cameraByPage`). */
  getPageCameras(): Record<string, CameraState> {
    return this.core.pages.getPageCameras();
  }

  /**
   * Affiche une page (SPEC §9.4) : sa scène est reprise du cache si elle a déjà été construite,
   * et sa caméra est celle de la dernière visite (sinon la page entière est cadrée).
   */
  goToPage(pageId: string): void {
    this.core.pages.goToPage(pageId);
  }

  // -------------------------------------------------------------------------
  // Annuler / rétablir

  /** Modifications non sauvegardées depuis le chargement ou la dernière sérialisation. */
  isModified(): boolean {
    return this.core.edits.isModified();
  }

  canUndo(): boolean {
    return this.core.edits.canUndo();
  }

  canRedo(): boolean {
    return this.core.edits.canRedo();
  }

  undo(): void {
    this.core.edits.undo();
  }

  redo(): void {
    this.core.edits.redo();
  }

  // -------------------------------------------------------------------------
  // Caméra et vues (SPEC §9)

  /**
   * Va à la page d'un élément et cadre dessus (diagnostics, liens). Les formes sont cadrées
   * sur leurs bornes, les arêtes sur leur tracé dessiné.
   */
  focusElement(pageId: string, elementId: string): void {
    this.core.camera.focusElement(pageId, elementId);
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

  /** Scène de la page courante (lecture seule : diagnostics, tests). */
  getPageScene(): PageScene | undefined {
    return this.core.sceneView.getPageScene();
  }

  /** Pages dont la scène est construite, de la moins à la plus récemment affichée. */
  getCachedPageIds(): string[] {
    return this.core.sceneView.getCachedPageIds();
  }

  getCameraState(): CameraState {
    return this.core.camera.getCameraState();
  }

  /** Cadre une emprise de la page courante (sans dépasser 100 %), dans l'orientation courante. */
  fitToBounds(bounds: Rect): void {
    this.core.camera.fitToBounds(bounds);
  }

  setCameraState(state: CameraState): void {
    this.core.camera.setCameraState(state);
  }

  /**
   * Anime la caméra vers un état (instantané si les animations sont réduites). Toute autre entrée
   * l'interrompt. `blendLevels` : bascule 2D ↔ volume, en fondu enchaîné des deux rendus.
   */
  animateCameraTo(target: CameraState, durationMs?: number, blendLevels?: boolean): void {
    this.core.camera.animateCameraTo(target, durationMs, blendLevels);
  }

  /**
   * Vue globale de la page courante, dans l'orientation actuelle. Contrairement au cadrage
   * d'ouverture, elle n'est pas plafonnée à 100 % : un petit schéma remplit l'écran,
   * sinon la bascule globale ↔ 1:1 n'aurait aucun effet.
   */
  getOverviewState(): CameraState | undefined {
    return this.core.camera.getOverviewState();
  }

  /**
   * Bascule vue globale ↔ 1:1 (touche Entrée). Depuis la vue globale, passe à 100 % autour
   * du point écran donné (ou du centre) ; depuis toute autre vue, revient à la vue globale.
   */
  toggleOverview(screen?: Point): void {
    this.core.camera.toggleOverview(screen);
  }

  getViewMode(): ViewMode {
    return this.core.viewModes.getViewMode();
  }

  /** Bascule animée vers la vue de dessus, isométrique ou 3D ; le centre de l'écran ne bouge pas. */
  setViewMode(mode: ViewMode): void {
    this.core.viewModes.setViewMode(mode);
  }

  toggleViewMode(): void {
    this.core.viewModes.toggleViewMode();
  }

  /** Touche P : vers la 3D, ou retour au dernier mode 2D / iso. */
  toggle3d(): void {
    this.core.viewModes.toggle3d();
  }

  /**
   * Aplatit ou rétablit les volumes : rendu à plat, comme une épaisseur nulle, sans toucher à la
   * caméra ni aux réglages. Rien en 2D, où tout est déjà à plat (l'état y est seulement levé).
   */
  setFlattened(flattened: boolean): void {
    this.core.viewModes.setFlattened(flattened);
  }

  /** Touche V : sans effet en 2D. */
  toggleFlatten(): void {
    this.core.viewModes.toggleFlatten();
  }

  /** Orientation de référence du mode courant : 0 en vue de dessus, l'azimut iso en isométrie et en 3D. */
  getReferenceRotation(): number {
    return this.core.camera.getReferenceRotation();
  }

  /** Vue par défaut du mode courant (orientation de référence, page entière), en animation. */
  resetView(): void {
    this.core.camera.resetView();
  }

  /** Revient à l'orientation de référence du mode (nord en haut, ou l'orientation iso), autour du centre de l'écran. */
  resetRotation(): void {
    this.core.camera.resetRotation();
  }

  // -------------------------------------------------------------------------
  // Vue graphe et mini-carte (SPEC §10, §12)

  /** Page générée de la vue graphe (cartes des pages, flèches des liens). */
  getGraphPage(): PageModel | undefined {
    return this.core.graph.getGraphPage();
  }

  isGraphView(): boolean {
    return this.core.graph.isGraphView();
  }

  /**
   * Affiche la vue graphe. Depuis une page : la page rétrécit dans sa carte (transition inverse
   * d'un lien), puis on recule jusqu'à la vue d'ensemble du graphe (ou sa dernière vue).
   */
  showGraph(): void {
    this.core.graph.showGraph();
  }

  /** Touche G : graphe ↔ dernière page affichée (en plongeant dans sa carte). */
  toggleGraph(): void {
    this.core.graph.toggleGraph();
  }

  /**
   * Affiche la mini-carte dans un canvas fourni par l'UI (SPEC §10). Renvoie de quoi la détacher.
   * `size` : largeur en pixels CSS (la hauteur suit les proportions de la page).
   */
  attachMinimap(canvas: HTMLCanvasElement, size?: number): () => void {
    return this.core.minimap.attachMinimap(canvas, size);
  }

  // -------------------------------------------------------------------------
  // Paramètres (SPEC §13)

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

  /** Animations réduites : réglage d'accessibilité, ou préférence système si « système ». */
  reducedMotion(): boolean {
    return this.core.config.reducedMotion();
  }

  // -------------------------------------------------------------------------
  // Sélection (SPEC §11)

  getSelection(): Selection | undefined {
    return this.core.selection.getSelection();
  }

  /** Élément de la page courante sous un point écran. */
  pickAt(screen: Point): PickedElement | undefined {
    return this.core.picking.pickAt(screen);
  }

  select(picked: PickedElement | undefined): void {
    this.core.selection.select(picked);
  }

  /** Tout sélectionner (⌘ + A, ticket 122) : tous les éléments de la page courante, comme une zone qui les couvrirait. */
  selectAll(): void {
    this.core.selection.selectAll();
  }

  clearSelection(): void {
    this.core.selection.clearSelection();
  }

  // -------------------------------------------------------------------------
  // Liens et navigation (SPEC §11)

  isTransitioning(): boolean {
    return this.core.transitions.isTransitioning();
  }

  /** Construit en arrière-plan la page cible d'un lien, sans l'afficher (SPEC §11.1). */
  preloadLink(link: LinkModel | undefined): void {
    this.core.links.preloadLink(link);
  }

  /**
   * Suit le lien d'un élément de la page courante : transition vers la page cible, ou ouverture
   * de l'URL dans un nouvel onglet. Sans effet si l'élément n'a pas de lien exploitable.
   */
  followLink(elementId: string): void {
    this.core.links.followLink(elementId);
  }

  /** Dernière utilisation des liens entre pages du fichier (à persister). */
  getLinkUsage(): LinkUsage {
    return this.core.links.getLinkUsage();
  }

  /** Pile de navigation (de la plus ancienne à la plus récente entrée). */
  getHistory(): HistoryEntry[] {
    return this.core.history.getHistory();
  }

  /**
   * Destination de « Retour » (SPEC §11.3) : le haut de la pile si elle mène à la page courante ;
   * sinon les pages parentes (liens vers la page courante), la plus récemment utilisée d'abord.
   */
  getBackTarget(): BackTarget {
    return this.core.history.getBackTarget();
  }

  /**
   * Retour : dépile et revient exactement à la vue d'origine, par la transition inverse
   * (la page courante rétrécit dans la forme d'où l'on venait). Sans historique : un seul parent
   * → on y va ; plusieurs → événement `backChoice` (l'UI propose la liste, puis `backTo`).
   */
  back(): void {
    this.core.history.back();
  }

  /** Remonte vers une page parente choisie (sortie par la forme qui porte le lien). */
  backTo(parentPageId: string): void {
    this.core.history.backTo(parentPageId);
  }

  // -------------------------------------------------------------------------
  // Modes et effets de page (sujets 69, 143)

  /** Modes de page du moteur, en lecture seule (sujet 304) : choix du mode, réglages déclarés, modes d'affichage. */
  getModeRegistry(): ModeRegistryView {
    return this.core.modes.view();
  }

  /** Effets de page du moteur, en lecture seule (sujets 290, 304 : l'appli n'en suppose pas d'autre). */
  getEffectRegistry(): EffectRegistryView {
    return this.core.effects.view();
  }

  /** Formes du moteur, en lecture seule (panneau, aperçus ; sujets 290, 304). */
  getShapeRegistry(): ShapeRegistryView {
    return this.core.registry.view();
  }

  /** Palette d'une page : catégories et modèles proposés, d'après son mode et les formes du moteur. */
  paletteFor(page: PageModel | undefined): PageModePalette {
    return this.core.modes.paletteFor(page, this.core.registry.templates(), this.core.registry.categories());
  }

  /** Modèles des formes présentes sur la page (catégorie « Utilisées » de la palette). */
  usedTemplates(page: Pick<PageModel, 'shapes'> | undefined): ShapeTemplate[] {
    return usedTemplatesIn(page, this.core.registry);
  }

  /** Effets actifs possibles sur la page : permis par son mode et ses modes d'affichage (appel du mode protégé). */
  allowedEffects(page: PageModel): string[] {
    return this.core.effects
      .list()
      .filter((effect) => this.core.pageModes.allowsEffect(page, effect))
      .map((effect) => effect.id);
  }

  /** Flèche gérée par le mode de la page courante (`edges.manages`, ex. relation RDD) : réglages imposés. */
  managesEdge(edgeId: string): boolean {
    return this.core.pageModes.managesEdge(edgeId);
  }

  /**
   * Mode d'une page (`spatial.mode`) ; undefined : page normale. Les données du mode restent en sommeil sur la page
   * et ses éléments : revenir au mode les retrouve.
   */
  setPageMode(pageId: string, modeId: string | undefined): void {
    this.core.pageModes.setPageMode(pageId, modeId);
  }

  /** Active ou retire un effet d'une page (`spatial.effects`), en une étape d'annulation. */
  setPageEffect(pageId: string, effectId: string, enabled: boolean): void {
    this.core.pageModes.setPageEffect(pageId, effectId, enabled);
  }

  /**
   * Opération d'un mode sur la page courante (ex. ajouter un flux) : ses écritures forment une étape d'annulation ;
   * rien n'est enregistré si elle ne change rien.
   */
  editPageMode(label: string, edit: (edit: ModeEdit) => void): void {
    this.core.pageModes.editPageMode(label, edit);
  }

  /**
   * Réglage déclaré par le mode de la page courante (`scope` : la page, ou la flèche / forme `targetId`), écrit par
   * sa règle s'il en a une, sinon dans son attribut. undefined = vide. `part` : partie sélectionnée de la forme, pour
   * un réglage de partie (sujet 249). `merge` : réglage en direct (`ModeProperty.live`), une seule étape d'annulation
   * tant que la clé est la même (sujet 271).
   */
  /**
   * Réglages déclarés par le mode de la page pour une cible, évalués (valeur, lecture seule, choix) : le panneau les
   * affiche sans appeler le mode (sujet 294). `palette` : couleurs proposées aux choix.
   */
  modePropertyViews(
    page: PageModel,
    scope: ModeScope,
    target: ModeTarget,
    part?: string,
    palette?: readonly string[],
  ): ModePropertyView[] {
    return this.core.pageModes.propertyViews(page, scope, target, part, palette);
  }

  setModeProperty(
    scope: ModeScope,
    targetId: string | undefined,
    key: string,
    value: string | undefined,
    part?: string,
    merge?: string,
  ): void {
    this.core.pageModes.setModeProperty(scope, targetId, key, value, part, merge);
  }

  /**
   * « Courant » du mode d'une page (ex. flux courant) : le dernier choisi s'il est encore valable, sinon la valeur
   * initiale du mode ; undefined pour une page sans mode ou sans courant.
   */
  getModeCurrent(pageId?: string): string | undefined {
    return this.core.modeCurrents.getModeCurrent(pageId);
  }

  /**
   * Barre du courant du mode de la page, en haut de la zone de dessin : couleur, libellé, valeurs possibles dans
   * l'ordre (boutons précédent / suivant). Undefined : pas de barre (pas de mode, pas de courant, pas de couleur).
   */
  getModeIndicator(pageId?: string): ModeIndicator | undefined {
    return this.core.modeCurrents.getModeIndicator(pageId);
  }

  /**
   * Renomme le courant du mode de la page courante (ex. titre du flux courant, depuis la barre) : une étape
   * d'annulation. Un nom vide (ou fait d'espaces) est ignoré.
   */
  renameModeCurrent(label: string): void {
    this.core.modeCurrents.renameModeCurrent(label);
  }

  /** Choisit le courant du mode d'une page (ex. bouton « suivant » de la barre) ; ignoré s'il n'est pas valable. */
  setModeCurrent(value: string, pageId?: string): void {
    this.core.modeCurrents.setModeCurrent(value, pageId);
  }

  /**
   * Touche du mode de la page courante sur l'élément sélectionné seul (ex. « + » : rang suivant) : une étape
   * d'annulation. Faux si la touche n'est pas prise (pas de mode, pas de touche, élément non concerné).
   */
  modeKey(key: string): boolean {
    return this.core.pageModes.modeKey(key);
  }

  // -------------------------------------------------------------------------
  // Édition (SPEC §14) : cibles, flèches, glisser

  /** Geste d'édition en cours (déplacement, redimensionnement, connecteur) : ne pas l'interrompre. */
  isDragging(): boolean {
    return this.core.gesture.isDragging();
  }

  isEditable(): boolean {
    return this.core.targets.isEditable();
  }

  /** Active ou désactive l'édition (poignées, glisser, commandes d'édition). */
  setEditable(editable: boolean): void {
    this.core.targets.setEditable(editable);
  }

  /**
   * Variante de placement de la flèche sélectionnée seule, sur une page en ancrage manuel (touche F) : la variante
   * qui suit le placement actuel (`edit/anchoring/manual/variants.ts`) est appliquée tout de suite, points
   * intermédiaires retirés (sauf les coudes d'une boucle), en une étape d'annulation. En ancrage automatique ou
   * Typon : un autre agencement (`otherArrangement`). Faux si elle ne s'applique pas.
   */
  placementVariant(): boolean {
    return this.core.arrangement.placementVariant();
  }

  /**
   * Ancrage propre à une page (undefined : celui de l'appli). Passer une page en automatique y répartit toutes les
   * flèches, dans la même étape d'annulation.
   */
  setPageAnchoring(pageId: string, anchoring: Anchoring | undefined): void {
    this.core.arrangement.setPageAnchoring(pageId, anchoring);
  }

  /** Saut propre à une page (undefined : celui de l'appli), suivi par ses flèches sans `jumpStyle`. */
  setPageJumps(pageId: string, jumps: JumpDefaults['style'] | undefined): void {
    this.core.jumps.setPageJumps(pageId, jumps);
  }

  /**
   * Retour en auto : points intermédiaires et points d'attache imposés retirés, la flèche reste reliée
   * aux mêmes formes (le tracé redevient entièrement calculé).
   */
  resetEdgeRoute(edgeId: string): void {
    this.core.edgePoints.resetEdgeRoute(edgeId);
  }

  // -------------------------------------------------------------------------
  // Édition : textes

  /**
   * Texte d'une flèche : son label (`cellId` = l'arête) ou un label enfant, retiré si le texte est vide ;
   * HTML draw.io s'il a une mise en forme partielle.
   */
  setEdgeText(edgeId: string, cellId: string, text: string, html?: string): void {
    this.core.edgeTexts.setEdgeText(edgeId, cellId, text, html);
  }

  /**
   * Déplace le texte de flèche en cours d'édition (poignée sous l'éditeur) : `screen` est le point visé
   * pour le texte (son ancre). Suivi en direct ; `endEditedTextMove` l'écrit dans le fichier.
   */
  moveEditedText(screen: Point): void {
    this.core.edgeTexts.moveEditedText(screen);
  }

  /** Fin du déplacement du texte en cours d'édition : une étape d'annulation, écrite comme draw.io. */
  endEditedTextMove(): void {
    this.core.edgeTexts.endEditedTextMove();
  }

  /**
   * Ancre un texte de flèche au début, au milieu ou à la fin du tracé (à 10 % du bout pour le début et
   * la fin, comme les textes créés), sur le tracé (distance et décalage remis à zéro).
   */
  setEdgeTextAnchor(edgeId: string, cellId: string, anchor: EdgeTextAnchor): void {
    this.core.edgeTexts.setEdgeTextAnchor(edgeId, cellId, anchor);
  }

  /**
   * Fait sauter le texte de début / fin en cours d'édition de l'autre côté du trait (règle inversée), s'il
   * est dans une configuration par défaut ; un texte encore à créer sera créé de ce côté.
   */
  flipEditedText(): void {
    this.core.edgeTexts.flipEditedText();
  }

  /**
   * Demande d'édition du label d'un élément de la page courante (double-clic, F2) : l'UI reçoit
   * le texte et l'emprise à l'écran (événement `labelEdit`), puis appelle `setLabel`.
   */
  editLabel(elementId?: string): void {
    this.core.labelEditor.editLabel(elementId);
  }

  /**
   * Texte en cours de saisie dans l'éditeur en place (à chaque frappe) : une forme qui place elle-même son label (ex.
   * onglet d'une région RDD) est redessinée avec lui, sans rien écrire ; la fermeture rétablit le texte d'origine.
   */
  previewEditedLabel(text: string): void {
    this.core.labelEditor.previewLabel(text);
  }

  /** Fin de l'édition en place (validée ou annulée) : le label dessiné réapparaît. */
  closeLabelEdit(): void {
    this.core.labelEditor.closeLabelEdit();
  }

  /**
   * Format du texte d'une cellule de la page courante (forme, arête ou label enfant) : clés de style
   * `fontStyle`, `fontSize`, `fontColor`, `align`, `verticalAlign`… (undefined = clé retirée). Une
   * étape d'annulation ; pendant l'édition en place, l'éditeur reçoit le nouveau format.
   */
  setTextFormat(cellId: string, patch: Record<string, string | undefined>): void {
    this.core.textEdits.setTextFormat(cellId, patch);
  }

  /**
   * Remplace le label d'un élément : texte brut (converti en HTML si le style l'exige), ou HTML draw.io
   * si le texte a une mise en forme partielle (`html`, le style passe en `html=1`).
   */
  setLabel(elementId: string, text: string, html?: string): void {
    this.core.textEdits.setLabel(elementId, text, html);
  }

  /** Commentaire d'une partie d'une forme validé dans l'éditeur (touche C, sujet 262) ; vide le retire. */
  setPartComment(shapeId: string, part: string, text: string): void {
    this.core.shapeParts.setComment(shapeId, part, text);
  }

  /** Texte d'une partie d'une forme (ex. label d'un champ d'une table RDD, sujet 249), validé dans l'éditeur. */
  setPartText(shapeId: string, part: string, text: string): void {
    this.core.shapeParts.setText(shapeId, part, text);
  }

  /**
   * Texte de début ou de fin d'une flèche de la page courante (label enfant près de la source ou de
   * la cible, comme dans draw.io) : créé, modifié, ou retiré si le texte est vide.
   */
  setEdgeEndLabel(edgeId: string, end: EdgeEnd, text: string, html?: string, flipped?: boolean): void {
    this.core.edgeTexts.setEdgeEndLabel(edgeId, end, text, html, flipped);
  }

  // -------------------------------------------------------------------------
  // Édition : commandes

  /**
   * Ajoute une forme de la palette sur la page courante, centrée sur un point écran (dépôt) ou au
   * centre de la vue : point projeté au sol (vue de dessus comme iso), aimanté à la grille.
   * Renvoie l'id de la nouvelle cellule, sélectionnée.
   */
  addShape(template: ShapeTemplate, screen?: Point): string | undefined {
    return this.core.elements.addShape(template, screen);
  }

  /** Lien d'un élément de la page courante (vers une page ou une URL) ; undefined = retiré. */
  setLink(elementId: string, link: LinkModel | undefined): void {
    this.core.properties.setLink(elementId, link);
  }

  /**
   * Commentaire d'un élément de la page courante (attribut `tooltip`, montré au survol) : texte brut, et HTML s'il a
   * une mise en forme partielle ; texte vide = retiré.
   */
  setComment(elementId: string, comment: ElementComment): void {
    this.core.properties.setComment(elementId, comment);
  }

  /** Édition en place du commentaire d'un élément de la page courante (événement `commentEdit` pour l'UI). */
  editComment(elementId: string): void {
    this.core.properties.editComment(elementId);
  }

  /**
   * Attribut spatial d'une forme (SPEC §14.3), ex. `spatial.height`, `spatial.tag` : nombre (positif) ou texte
   * (sans `;`, séparateur du style) ; undefined le retire (valeur par défaut). Écrit là où il est déjà (attribut
   * de l'objet), sinon dans le style. `merge` : réglage en direct (champ tapé au fil des frappes), fusionné en une
   * étape d'annulation avec les précédents de même clé ; pour un attribut qui ne touche que le dessin de la forme
   * (`LIVE_SHAPE_KEYS`), seule la forme est redessinée.
   */
  setSpatial(elementId: string, key: string, value: number | string | undefined, merge?: string): void {
    this.core.properties.setSpatial(elementId, key, value, merge);
  }

  /**
   * Applique un style (fond, contour, texte) à des formes de la page courante, en une seule étape
   * d'annulation. `known` : styles de la palette, pour retirer une couleur de texte posée par l'un d'eux.
   */
  applyStylePreset(elementIds: string[], preset: StylePreset, known?: StylePreset[]): void {
    this.core.styles.applyStylePreset(elementIds, preset, known);
  }

  /**
   * Clés de style draw.io sur des formes ou des flèches de la page courante (ex. bordure : `strokeColor`, `strokeWidth`,
   * `dashed`…), en une étape d'annulation ; undefined retire la clé. Seules les clés qui changent.
   */
  setElementsStyle(
    elementIds: string[],
    patch: Record<string, string | undefined> | ((style: Record<string, string>) => Record<string, string | undefined>),
    label?: string,
    merge?: string,
  ): void {
    this.core.styles.setElementsStyle(elementIds, patch, label, merge);
  }

  /** Inverse des flèches de la page courante (ticket 131) : elles vont de leur ancienne cible à leur ancienne source. */
  reverseEdges(edgeIds: string[]): void {
    this.core.styles.reverseEdges(edgeIds);
  }

  /** Ordre de dessin de la sélection (ticket 130) : premier plan, arrière-plan, avancer, reculer. */
  orderSelection(move: OrderMove): void {
    this.core.arrange.orderSelection(move);
  }

  /**
   * Aligne les formes de la sélection (ticket 136) sur la référence : cadre de la sélection, premier ou dernier
   * élément sélectionné ; une étape d'annulation, flèches réparties à nouveau en ancrage automatique.
   */
  alignSelection(move: AlignMove, reference: AlignReference): void {
    this.core.arrange.alignSelection(move, reference);
  }

  /** Répartit les formes de la sélection (ticket 136) à intervalles égaux, les deux extrêmes restant en place. */
  distributeSelection(move: DistributeMove): void {
    this.core.arrange.distributeSelection(move);
  }

  /** Supprime la sélection : avec son contenu, ses labels et les arêtes qui y sont reliées (comme draw.io). */
  deleteSelection(label?: string): void {
    this.core.elements.deleteSelection(label);
  }

  /**
   * Copie la sélection (ticket 59) : renvoie le XML à mettre dans le presse-papier (format draw.io),
   * aussi gardé comme presse-papier interne. Undefined : rien à copier.
   */
  copySelection(): string | undefined {
    return this.core.clipboard.copySelection();
  }

  /** Coupe la sélection : copiée puis supprimée ; le premier collage la remet à sa place. */
  cutSelection(): string | undefined {
    return this.core.clipboard.cutSelection();
  }

  /**
   * Colle sur la page courante : `text` lu dans le presse-papier système (sans lui : le presse-papier
   * interne). Les éléments collés sont décalés d'un pas de grille de plus à chaque collage du même
   * contenu, puis sélectionnés. Renvoie false si le texte n'est pas un contenu draw.io.
   */
  paste(text?: string): boolean {
    return this.core.clipboard.paste(text);
  }

  /** Duplique la sélection (copier + coller sans toucher au presse-papier), décalée d'un pas de grille. */
  duplicateSelection(): void {
    this.core.clipboard.duplicateSelection();
  }
}
