import type { PageModel } from '../../model/types';
import { setElementsDim } from '../../render/pageEffects';
import { callMode } from '../../modes/modeCalls';
import type { ModeCurrentLook, ModeTarget } from '../../modes/types';
import type { ModeIndicator } from '../types';
import type { EngineCore } from '../EngineCore';

/** Apparence du courant d'un mode quand il n'en dit rien (`ModeCurrent.look`, ticket 283). */
const DEFAULT_DIM_OPACITY = 0.3;
const DEFAULT_BAR_SLIDE_DURATION = 200;

/**
 * « Courant » du mode de chaque page (ex. flux courant du mode Séquences) : choix, barre du courant, ce qu'il estompe.
 * Sorti de `PageModes` (sujet 288) ; ses appels au mode passent par l'hôte comme les autres (`PageModes.call`, `PageModes.guard`).
 */
export class ModeCurrents {
  /** « Courant » choisi du mode de chaque page (état de session, jamais écrit). */
  private readonly modeCurrents = new Map<string, string>();

  constructor(private readonly core: EngineCore) {}

  /** Nouveau document : « courants » des modes oubliés. */
  resetDocument(): void {
    this.modeCurrents.clear();
  }

  getModeCurrent(pageId = this.core.pages.currentPageId): string | undefined {
    const page = pageId ? this.core.pages.pageById(pageId) : undefined;
    const mode = page && this.core.modes.modeOf(page);
    const current = mode?.current;
    if (!page || !mode || !current) return undefined;
    const chosen = this.modeCurrents.get(page.id);
    return this.core.pageModes.guard(mode, 'current', undefined, () =>
      chosen !== undefined && callMode(current.valid, page, chosen) ? chosen : callMode(current.initial, page),
    );
  }

  getModeIndicator(pageId = this.core.pages.currentPageId): ModeIndicator | undefined {
    const page = pageId ? this.core.pages.pageById(pageId) : undefined;
    const mode = page && this.core.modes.modeOf(page);
    const current = mode?.current;
    const value = this.getModeCurrent(pageId);
    if (!page || !mode || !current || value === undefined) return undefined;
    return this.core.pageModes.guard(mode, 'current', undefined, () => {
      const color = current.color && callMode(current.color, page, value);
      if (!color) return undefined;
      return {
        value,
        color,
        label: (current.label && callMode(current.label, page, value)) ?? value,
        values: (current.values && callMode(current.values, page)) ?? [],
        renamable: current.rename !== undefined && this.core.targets.editablePage()?.page.id === page.id,
        slideDuration: this.currentLook(page).barSlideDuration ?? DEFAULT_BAR_SLIDE_DURATION,
      };
    });
  }

  renameModeCurrent(label: string): void {
    const page = this.core.targets.editablePage()?.page;
    const rename = page && this.core.modes.modeOf(page)?.current?.rename;
    const value = page && this.getModeCurrent(page.id);
    const name = label.trim();
    if (!rename || value === undefined || !name) return;
    this.core.pageModes.editPageMode('Renommage', (edit) => callMode(rename, edit, value, name));
  }

  setModeCurrent(value: string, pageId = this.core.pages.currentPageId): void {
    const page = pageId ? this.core.pages.pageById(pageId) : undefined;
    const mode = page && this.core.modes.modeOf(page);
    const current = mode?.current;
    if (!page || !mode || !current || value === this.getModeCurrent(page.id)) return;
    if (!this.core.pageModes.call(mode, 'current.valid', false, current.valid, page, value)) return;
    this.chooseCurrent(page.id, value);
  }

  /**
   * Estompe ce qui n'est pas gardé net par le courant du mode de la page courante (`ModeCurrent.focus`, opacité de
   * `ModeCurrent.look`) ; seuls les éléments dont l'état change sont repris. Appelé avant chaque image : suit
   * le courant, les modifications du schéma et les scènes reconstruites.
   */
  applyModeFocus(): void {
    const page = this.core.pages.getCurrentPage();
    const mode = page && this.core.modes.modeOf(page);
    const value = page && this.getModeCurrent(page.id);
    const focus =
      page && mode && value !== undefined
        ? this.core.pageModes.call(mode, 'current.focus', undefined, mode.current?.focus, page, value)
        : undefined;
    const kept = focus && new Set(focus);
    const opacity = (page && this.currentLook(page).dimOpacity) ?? DEFAULT_DIM_OPACITY;
    const scenes = new Set([
      this.core.scenes.current,
      this.core.levels.levelBlend?.flat,
      this.core.levels.levelBlend?.volume,
    ]);
    for (const scene of scenes) {
      if (scene && scene.pageId === page?.id) setElementsDim(scene.root, (id) => (kept && !kept.has(id) ? opacity : 1));
    }
  }

  /** Apparence du courant du mode de la page, d'après les réglages du mode. */
  private currentLook(page: PageModel): ModeCurrentLook {
    const mode = this.core.modes.modeOf(page);
    const look = mode?.current?.look;
    if (!mode || !look) return {};
    return this.core.pageModes.call(
      mode,
      'current.look',
      {},
      look,
      this.core.modes.valuesOf(page, this.core.settings.modes),
    );
  }

  /**
   * Un élément cliqué ou sélectionné seul peut changer le courant du mode (ex. flèche d'un flux) ; vrai s'il l'a
   * changé.
   */
  pickModeCurrent(page: PageModel, element: ModeTarget): boolean {
    const mode = this.core.modes.modeOf(page);
    const pick = mode?.current?.pick;
    const value = mode && this.core.pageModes.call(mode, 'current.pick', undefined, pick, page, element);
    if (value === undefined || value === this.getModeCurrent(page.id)) return false;
    this.chooseCurrent(page.id, value);
    return true;
  }

  private chooseCurrent(pageId: string, value: string): void {
    this.modeCurrents.set(pageId, value);
    const page = this.core.pages.pageById(pageId);
    // Habillage qui suit le courant (`ModeCurrent.redraws`, sujet 414) : les scènes de la page sont reconstruites.
    if (page && this.core.modes.modeOf(page)?.current?.redraws) this.core.levels.rebuildScenes([page.id]);
    this.core.events.emit('modeCurrentChange', pageId, value);
    this.core.rendering.requestRender();
  }
}
