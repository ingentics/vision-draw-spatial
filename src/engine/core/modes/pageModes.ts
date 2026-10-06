import { setPageAttribute } from '../../format/edit';
import { writeDrawio } from '../../format/write';
import type { DocumentModel, PageModel } from '../../model/types';
import { setElementsDim } from '../../render/pageEffects';
import { applyModeEdit } from '../../modes/edit';
import { pageEffectIds, withPageEffect } from '../../effects/registry';
import type { ModeScope, PageModeRegistry } from '../../modes/registry';
import type { ModeEdit, ModeTarget } from '../../modes/types';
import { modePalette } from '../../settings';
import { SPATIAL } from '../../spatial';
import type { ModeIndicator } from '../types';
import type { EngineCore } from '../EngineCore';

/**
 * Modes et effets de page (sujets 69, 143) : choix du mode, réglages déclarés, « courant » du mode et ce qu'il estompe,
 * touches du mode.
 */
export class PageModes {
  /** « Courant » choisi du mode de chaque page (état de session, jamais écrit). */
  readonly modeCurrents = new Map<string, string>();

  constructor(private readonly core: EngineCore) {}

  getModeRegistry(): PageModeRegistry {
    return this.core.modes;
  }

  setPageMode(pageId: string, modeId: string | undefined): void {
    const page = this.core.pages.pageById(pageId);
    const pageTree = this.core.file.pageTreeOf(pageId);
    if (
      !this.core.file.xmlTree ||
      !page ||
      !pageTree?.diagram ||
      !this.core.targets.editable ||
      this.core.transitions.active
    )
      return;
    if ((this.core.modes.modeId(page) ?? '') === (modeId ?? '')) return;
    const name = modeId && this.core.modes.get(modeId)?.name;
    this.core.edits.recordEdit(name ? `Mode ${name}` : 'Page normale');
    setPageAttribute(pageTree, SPATIAL.mode, modeId);
    this.core.file.documentChanged([pageId]);
  }

  setPageEffect(pageId: string, effectId: string, enabled: boolean): void {
    const page = this.core.pages.pageById(pageId);
    const pageTree = this.core.file.pageTreeOf(pageId);
    if (
      !this.core.file.xmlTree ||
      !page ||
      !pageTree?.diagram ||
      !this.core.targets.editable ||
      this.core.transitions.active
    )
      return;
    if (pageEffectIds(page).includes(effectId) === enabled) return;
    const name = this.core.effects.get(effectId)?.name ?? effectId;
    this.core.edits.recordEdit(enabled ? `Effet ${name}` : `Sans effet ${name}`);
    setPageAttribute(pageTree, SPATIAL.effects, withPageEffect(page, effectId, enabled));
    this.core.file.documentChanged([pageId], { distribute: false });
  }

  editPageMode(label: string, edit: (edit: ModeEdit) => void): void {
    const editable = this.core.targets.editablePage();
    if (!editable || !this.core.file.xmlTree) return;
    const before = writeDrawio(this.core.file.xmlTree);
    if (!applyModeEdit(editable.page, editable.pageTree, edit, modePalette(this.core.settings.styles))) return;
    this.core.edits.undoStack.record(label, before);
    this.core.file.documentChanged([editable.page.id]);
  }

  setModeProperty(scope: ModeScope, targetId: string | undefined, key: string, value: string | undefined): void {
    const page = this.core.targets.editablePage()?.page;
    const property = page && this.core.modes.properties(page, scope).find((p) => p.key === key);
    const target: ModeTarget | undefined =
      scope === 'page'
        ? page
        : scope === 'edge'
          ? page?.edges.find((e) => e.id === targetId)
          : page?.shapes.find((s) => s.id === targetId);
    if (!property || !target) return;
    this.editPageMode(property.label, (edit) => {
      if (property.write) property.write(edit, target, value);
      else if (scope === 'page') edit.setPageAttribute(key, value);
      else edit.setElementAttribute(target.id, key, value);
    });
  }

  getModeCurrent(pageId = this.core.pages.currentPageId): string | undefined {
    const page = pageId ? this.core.pages.pageById(pageId) : undefined;
    const current = page && this.core.modes.modeOf(page)?.current;
    if (!page || !current) return undefined;
    const chosen = this.modeCurrents.get(page.id);
    return chosen !== undefined && current.valid(page, chosen) ? chosen : current.initial(page);
  }

  getModeIndicator(pageId = this.core.pages.currentPageId): ModeIndicator | undefined {
    const page = pageId ? this.core.pages.pageById(pageId) : undefined;
    const current = page && this.core.modes.modeOf(page)?.current;
    const value = this.getModeCurrent(pageId);
    const color = page && value !== undefined ? current?.color?.(page, value) : undefined;
    if (!page || !current || value === undefined || !color) return undefined;
    return {
      value,
      color,
      label: current.label?.(page, value) ?? value,
      values: current.values?.(page) ?? [],
      renamable: current.rename !== undefined && this.core.targets.editablePage()?.page.id === page.id,
    };
  }

  renameModeCurrent(label: string): void {
    const page = this.core.targets.editablePage()?.page;
    const rename = page && this.core.modes.modeOf(page)?.current?.rename;
    const value = page && this.getModeCurrent(page.id);
    const name = label.trim();
    if (!rename || value === undefined || !name) return;
    this.editPageMode('Renommage', (edit) => rename(edit, value, name));
  }

  setModeCurrent(value: string, pageId = this.core.pages.currentPageId): void {
    const page = pageId ? this.core.pages.pageById(pageId) : undefined;
    const current = page && this.core.modes.modeOf(page)?.current;
    if (!page || !current?.valid(page, value) || value === this.getModeCurrent(page.id)) return;
    this.modeCurrents.set(page.id, value);
    this.core.events.emit('modeCurrentChange', page.id, value);
    this.core.rendering.requestRender();
  }

  /**
   * Estompe ce qui n'est pas gardé net par le courant du mode de la page courante (`ModeCurrent.focus`, paramètre
   * `shapes.modeDimOpacity`) ; seuls les éléments dont l'état change sont repris. Appelé avant chaque image : suit
   * le courant, les modifications du schéma et les scènes reconstruites.
   */
  applyModeFocus(): void {
    const page = this.core.pages.getCurrentPage();
    const value = page && this.getModeCurrent(page.id);
    const focus = page && value !== undefined ? this.core.modes.modeOf(page)?.current?.focus?.(page, value) : undefined;
    const kept = focus && new Set(focus);
    const opacity = this.core.settings.shapes.modeDimOpacity;
    const scenes = new Set([
      this.core.scenes.current,
      this.core.levels.levelBlend?.flat,
      this.core.levels.levelBlend?.volume,
    ]);
    for (const scene of scenes) {
      if (scene && scene.pageId === page?.id) setElementsDim(scene.root, (id) => (kept && !kept.has(id) ? opacity : 1));
    }
  }

  /**
   * Un élément cliqué ou sélectionné seul peut changer le courant du mode (ex. flèche d'un flux) ; vrai s'il l'a
   * changé.
   */
  pickModeCurrent(page: PageModel, element: ModeTarget): boolean {
    const value = this.core.modes.modeOf(page)?.current?.pick?.(page, element);
    if (value === undefined || value === this.getModeCurrent(page.id)) return false;
    this.modeCurrents.set(page.id, value);
    this.core.events.emit('modeCurrentChange', page.id, value);
    this.core.rendering.requestRender();
    return true;
  }

  modeKey(key: string): boolean {
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || selection?.pageId !== editable.page.id || selection.items.length !== 1) return false;
    const action = this.core.modes.modeOf(editable.page)?.keys?.[key];
    const id = selection.picked.element.id;
    const target = [...editable.page.edges, ...editable.page.shapes].find((element) => element.id === id);
    if (!action || !target || !action.applies(editable.page, target)) return false;
    const current = this.getModeCurrent(editable.page.id);
    this.editPageMode(action.label, (edit) => action.run(edit, target, current));
    return true;
  }

  /** Avertissements des modes de page (mode inconnu, données remises en ordre) ajoutés à ceux de la lecture. */
  withModeWarnings(document: DocumentModel): DocumentModel {
    document.warnings.push(...this.core.modes.warnings(document), ...this.core.effects.warnings(document));
    return document;
  }
}
