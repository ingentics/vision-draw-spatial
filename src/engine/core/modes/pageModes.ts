import { setPageAttribute } from '../../format/cellEdits';
import { documentFromTree } from '../../format/parse';
import { writeDrawio } from '../../format/write';
import type { DocumentModel, PageModel, Rect, ShapeModel } from '../../model/types';
import { setElementsDim } from '../../render/pageEffects';
import { hasExactTextMeasure } from '../../render/textMeasure';
import { applyModeEdit } from '../../modes/modeEdits';
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
  private readonly modeCurrents = new Map<string, string>();

  constructor(private readonly core: EngineCore) {}

  /** Nouveau document : « courants » des modes oubliés. */
  resetDocument(): void {
    this.modeCurrents.clear();
  }

  getModeRegistry(): PageModeRegistry {
    return this.core.modes;
  }

  setPageMode(pageId: string, modeId: string | undefined): void {
    const target = this.core.targets.editablePageById(pageId);
    if (!target) return;
    const { page, pageTree } = target;
    if ((this.core.modes.modeId(page) ?? '') === (modeId ?? '')) return;
    const name = modeId && this.core.modes.get(modeId)?.name;
    this.core.edits.recordEdit(name ? `Mode ${name}` : 'Page normale');
    setPageAttribute(pageTree, SPATIAL.mode, modeId);
    this.core.file.documentChanged([pageId]);
  }

  setPageEffect(pageId: string, effectId: string, enabled: boolean): void {
    const target = this.core.targets.editablePageById(pageId);
    if (!target) return;
    const { page, pageTree } = target;
    if (pageEffectIds(page).includes(effectId) === enabled) return;
    const name = this.core.effects.get(effectId)?.name ?? effectId;
    this.core.edits.recordEdit(enabled ? `Effet ${name}` : `Sans effet ${name}`);
    setPageAttribute(pageTree, SPATIAL.effects, withPageEffect(page, effectId, enabled));
    this.core.file.documentChanged([pageId], { distribute: false });
  }

  /** Opération du mode sur la page courante, en une étape d'annulation ; vrai si elle a changé quelque chose. */
  editPageMode(label: string, edit: (edit: ModeEdit) => void): boolean {
    const editable = this.core.targets.editablePage();
    if (!editable || !this.core.file.xmlTree) return false;
    const before = writeDrawio(this.core.file.xmlTree);
    if (!applyModeEdit(editable.page, editable.pageTree, edit, modePalette(this.core.settings.styles))) return false;
    this.core.edits.recordSnapshot(label, before);
    this.core.file.documentChanged([editable.page.id]);
    return true;
  }

  /** `part` : partie de la forme sélectionnée, pour un réglage de partie (sujet 249). */
  setModeProperty(
    scope: ModeScope,
    targetId: string | undefined,
    key: string,
    value: string | undefined,
    part?: string,
  ): void {
    const page = this.core.targets.editablePage()?.page;
    const property = page && this.core.modes.properties(page, scope, part).find((p) => p.key === key);
    const target: ModeTarget | undefined =
      scope === 'page'
        ? page
        : scope === 'edge'
          ? page?.edges.find((e) => e.id === targetId)
          : page?.shapes.find((s) => s.id === targetId);
    if (!property || !target) return;
    let next: string | void = undefined;
    this.editPageMode(property.label, (edit) => {
      if (property.write) next = property.write(edit, target, value, part);
      else if (scope === 'page') edit.setPageAttribute(key, value);
      else edit.setElementAttribute(target.id, key, value);
    });
    // Partie désignée par le réglage (ex. séparateur ajouté, sujet 253) : sélectionnée, son texte en édition.
    const shape =
      scope === 'shape' && typeof next === 'string'
        ? this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === target.id)
        : undefined;
    if (shape && typeof next === 'string') {
      this.core.selection.selectItems([{ type: 'shape', element: shape }], next);
      if (this.core.shapeParts.text(shape.id, next)) this.core.labelEditor.editPartLabel(shape.id, next);
    }
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
    const part = selection.part;
    if (!action || !target || !action.applies(editable.page, target, part)) return false;
    const current = this.getModeCurrent(editable.page.id);
    let next: string | void = undefined;
    this.editPageMode(action.label, (edit) => {
      next = action.run(edit, target, current, part);
    });
    // Partie désignée par la touche (ex. séparateur ajouté, sujet 253) : sélectionnée, son texte en édition.
    const shape =
      typeof next === 'string' ? this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === id) : undefined;
    if (shape && typeof next === 'string') {
      this.core.selection.selectItems([{ type: 'shape', element: shape }], next);
      if (this.core.shapeParts.text(id, next)) this.core.labelEditor.editPartLabel(id, next);
    }
    return true;
  }

  /**
   * Formes posées sur la page (déplacées, redimensionnées, ajoutées, collées), déjà écrites dans l'arbre : le mode de
   * la page les remet en ordre dans la même étape d'annulation (`placed`). `previous` : bornes d'avant d'une forme qui a
   * bougé (déplacement, redimensionnement), pour retrouver la page d'avant ; absent pour un ajout. Vrai si l'arbre a
   * changé (le modèle est alors à relire).
   */
  shapesPlaced(pageId: string, shapeIds: string[], previous?: (shape: ShapeModel) => Rect | undefined): boolean {
    const page = this.core.pages.pageById(pageId);
    const placed = page && this.core.modes.modeOf(page)?.placed;
    const pageTree = this.core.file.pageTreeOf(pageId);
    if (!placed || !pageTree || !this.core.file.xmlTree || shapeIds.length === 0) return false;
    const fresh = documentFromTree(this.core.file.xmlTree).pages.find((p) => p.id === pageId);
    if (!fresh) return false;
    const before = previous && {
      ...fresh,
      shapes: fresh.shapes.map((shape) => {
        const bounds = previous(shape);
        return bounds ? { ...shape, bounds } : shape;
      }),
    };
    return applyModeEdit(
      fresh,
      pageTree,
      (edit) => placed(edit, shapeIds, before),
      modePalette(this.core.settings.styles),
    );
  }

  /**
   * Texte d'un élément changé, déjà écrit dans l'arbre : le mode de la page le remet en ordre dans la même étape
   * d'annulation (`relabeled`, ex. table RDD élargie, sujet 247).
   */
  elementRelabeled(pageId: string, elementId: string): void {
    const page = this.core.pages.pageById(pageId);
    const relabeled = page && this.core.modes.modeOf(page)?.relabeled;
    const pageTree = this.core.file.pageTreeOf(pageId);
    if (!relabeled || !pageTree || !this.core.file.xmlTree) return;
    const fresh = documentFromTree(this.core.file.xmlTree).pages.find((p) => p.id === pageId);
    if (!fresh) return;
    applyModeEdit(fresh, pageTree, (edit) => relabeled(edit, elementId), modePalette(this.core.settings.styles));
  }

  /**
   * Document ouvert, ou mesure exacte du texte arrivée : chaque page d'un mode qui a `opened` est remise en ordre
   * (sujet 255), en une étape d'annulation pour tout le document ; rien si rien ne change, si on ne peut pas modifier
   * ou tant que la mesure du texte n'est qu'approchée.
   */
  documentOpened(): void {
    const document = this.core.file.getDocument();
    const xmlTree = this.core.file.xmlTree;
    // Mesure approchée (polices pas encore chargées) : on attend la mesure exacte, sinon chaque ouverture décalerait les
    // tailles d'un fichier déjà ajusté.
    if (!document || !xmlTree || !hasExactTextMeasure()) return;
    const before = writeDrawio(xmlTree);
    const palette = modePalette(this.core.settings.styles);
    const changed = document.pages
      .filter((page) => {
        const opened = this.core.modes.modeOf(page)?.opened;
        const target = opened && this.core.targets.editablePageById(page.id);
        return !!target && applyModeEdit(target.page, target.pageTree, opened, palette);
      })
      .map((page) => page.id);
    if (changed.length === 0) return;
    this.core.edits.recordSnapshot('Ajustement du mode', before);
    this.core.file.documentChanged(changed);
  }

  /** Avertissements des modes de page (mode inconnu, données remises en ordre) ajoutés à ceux de la lecture. */
  withModeWarnings(document: DocumentModel): DocumentModel {
    document.warnings.push(...this.core.modes.warnings(document), ...this.core.effects.warnings(document));
    return document;
  }
}
