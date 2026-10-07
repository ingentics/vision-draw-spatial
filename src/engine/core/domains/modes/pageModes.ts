import { canMoveCell, setPageAttribute } from '../../format/cellEdits';
import { documentFromTree } from '../../format/parse';
import { writeDrawio } from '../../format/write';
import type { PageTree } from '../../format/xmlTree';
import type { TerminalEnd } from '../../edit/edgeEnds';
import { carriedShapes, isLocked } from '../../edit/moveSet';
import type { DocumentModel, PageModel, Rect, ShapeModel } from '../../model/types';
import { hasExactTextMeasure } from '../../render/textMeasure';
import { applyModeEdit } from '../../modes/modeEdits';
import { pageEffectIds, withPageEffect } from '../../effects/registry';
import type { PageEffectDefinition } from '../../effects/types';
import type { ModeScope, PageModeRegistry } from '../../modes/registry';
import type {
  ModeEdit,
  ModeEditContext,
  ModeObstacles,
  ModeTarget,
  PageDressing,
  PageModeDefinition,
} from '../../modes/types';
import { modePalette } from '../../settings';
import { SPATIAL, spatialValue } from '../../spatial';
import type { ModePropertyView } from '../types';
import type { EngineCore } from '../EngineCore';

/**
 * Modes et effets de page (sujets 69, 143) : choix du mode, réglages déclarés, opérations et touches du mode. Hôte des appels au mode de la page (sujet 288) : le reste du moteur passe par ses méthodes (ou par
 * `ShapeParts` et `ModeHandles`), qui protègent chaque appel (`PluginGuard`).
 */
export class PageModes {
  constructor(private readonly core: EngineCore) {}

  getModeRegistry(): PageModeRegistry {
    return this.core.modes;
  }

  /**
   * Appel protégé d'un point d'entrée du mode `mode` (sujet 288) : sa valeur, ou `fallback` (le point d'appel traité
   * comme absent) s'il lève une exception, signalée dans les Diagnostics.
   */
  guard<T>(mode: PageModeDefinition, hook: string, fallback: T, run: () => T): T {
    return this.core.pluginGuard.call(`Mode ${mode.id}`, hook, fallback, run);
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

  /**
   * Flèche gérée par le mode de sa page (`managesEdge`, sujet 265, ex. relation RDD) : ses textes de début / fin
   * (cardinalités) ne se modifient ni ne se déplacent.
   */
  managesEdge(edgeId: string): boolean {
    const page = this.core.pages.getCurrentPage();
    const edge = page?.edges.find((e) => e.id === edgeId);
    const mode = page && this.core.modes.modeOf(page);
    if (!page || !edge || !mode?.managesEdge) return false;
    return this.guard(mode, 'managesEdge', false, () => mode.managesEdge!(page, edge));
  }

  /** Habillage du rendu de la page par son mode, protégé jusque dans ses fonctions (appelées au dessin). */
  dressing(page: PageModel): PageDressing | undefined {
    const mode = this.core.modes.modeOf(page);
    if (!mode?.dressing) return undefined;
    const dressing = this.guard(mode, 'dressing', undefined, () =>
      this.core.modes.dressing(page, this.core.settings.modes),
    );
    if (!dressing) return undefined;
    const { edgeColor, edgeBadge } = dressing;
    return {
      ...dressing,
      ...(edgeColor && {
        edgeColor: (edge) => this.guard(mode, 'dressing.edgeColor', undefined, () => edgeColor(edge)),
      }),
      ...(edgeBadge && {
        edgeBadge: (edge) => this.guard(mode, 'dressing.edgeBadge', undefined, () => edgeBadge(edge)),
      }),
    };
  }

  /**
   * L'effet est-il actif sur la page (`allowsEffect` du mode, sujet 143, et modes d'affichage de l'effet) ? Le mode en
   * panne est traité comme absent : l'effet est permis (dette 296).
   */
  allowsEffect(page: PageModel, effect: Pick<PageEffectDefinition, 'id' | 'viewModes'>): boolean {
    const mode = this.core.modes.modeOf(page);
    const allows = mode?.allowsEffect;
    if (mode && allows && !this.guard(mode, 'allowsEffect', true, () => allows(effect.id))) return false;
    return this.core.modes.effectViewable(page, effect);
  }

  /** Bornes de `shape` pendant un déplacement ou un redimensionnement (`obstacles`, sujet 241) ; undefined : aucune. */
  obstacles(page: PageModel, shape: ShapeModel): ModeObstacles | undefined {
    const mode = this.core.modes.modeOf(page);
    if (!mode?.obstacles) return undefined;
    const values = this.core.modes.values(mode.id, this.core.settings.modes[mode.id]);
    return this.guard(mode, 'obstacles', undefined, () => mode.obstacles!(page, shape, values));
  }

  /** Le mode de la page emporte-t-il des formes (`carries`) ? Leurs flèches sont alors mises en valeur avec elles. */
  hasCarries(page: PageModel): boolean {
    return !!this.core.modes.modeOf(page)?.carries;
  }

  /**
   * Formes emportées par le mode avec `shapeIds` (`carries`, ex. contenu d'une région RDD), de proche en proche ;
   * `movableIn` : seulement celles qui peuvent bouger dans cet arbre (geste), sinon toutes (mise en valeur).
   */
  carried(page: PageModel, shapeIds: readonly string[], movableIn?: PageTree): string[] {
    const mode = this.core.modes.modeOf(page);
    if (!mode?.carries) return [];
    const carries = (shape: ShapeModel) => this.guard(mode, 'carries', [], () => mode.carries!(page, shape));
    const accept = movableIn ? (shape: ShapeModel) => !isLocked(shape) && canMoveCell(movableIn, shape.id) : undefined;
    return carriedShapes(page, shapeIds, carries, accept);
  }

  /** Contexte des opérations de mode : couleurs proposées et textes de début / fin, d'après les paramètres. */
  editContext(): ModeEditContext {
    const { shapes, styles } = this.core.settings;
    return {
      palette: modePalette(styles),
      endText: {
        size: shapes.edgeEndTextSize,
        color: shapes.edgeEndTextColor,
        gap: { along: shapes.edgeEndTextGapAlong, across: shapes.edgeEndTextGapAcross },
      },
    };
  }

  /**
   * Opération du mode sur la page courante, en une étape d'annulation ; vrai si elle a changé quelque chose. `merge` :
   * réglage en direct, une seule étape tant que la clé est la même (sujet 271). Une opération qui lève une exception
   * n'écrit rien (sujet 288).
   */
  editPageMode(label: string, edit: (edit: ModeEdit) => void, merge?: string): boolean {
    const editable = this.core.targets.editablePage();
    const mode = editable && this.core.modes.modeOf(editable.page);
    if (!editable || !mode || !this.core.file.xmlTree) return false;
    const before = writeDrawio(this.core.file.xmlTree);
    const context = this.editContext();
    if (
      !this.guard(mode, `opération « ${label} »`, false, () =>
        applyModeEdit(editable.page, editable.pageTree, edit, context),
      )
    )
      return false;
    this.core.edits.recordSnapshot(label, before, merge);
    this.core.file.documentChanged([editable.page.id]);
    return true;
  }

  /**
   * Partie d'une forme désignée par une opération du mode (ex. séparateur ajouté, sujet 253) : sélectionnée, son
   * texte passe en édition s'il en a un.
   */
  selectPart(shapeId: string, part: string | void | undefined): void {
    const shape = this.core.pages.getCurrentPage()?.shapes.find((s) => s.id === shapeId);
    if (!shape || typeof part !== 'string') return;
    this.core.selection.selectItems([{ type: 'shape', element: shape }], part);
    if (this.core.shapeParts.text(shapeId, part)) this.core.labelEditor.editPartLabel(shapeId, part);
  }

  /**
   * Réglages déclarés par le mode de `page` pour une cible et une portée, évalués pour le panneau (sujet 294) : ceux
   * qui ne sont pas masqués, avec leur valeur, leur lecture seule et leurs choix. Chaque appel au mode est protégé ; un
   * point d'entrée en panne est traité comme absent (réglage montré, valeur de l'attribut, modifiable, sans choix).
   * `part` : partie de la forme sélectionnée ; `palette` : couleurs proposées aux choix.
   */
  propertyViews(
    page: PageModel,
    scope: ModeScope,
    target: ModeTarget,
    part?: string,
    palette: readonly string[] = [],
  ): ModePropertyView[] {
    const mode = this.core.modes.modeOf(page);
    if (!mode) return [];
    return this.core.modes.properties(page, scope, part).flatMap((property) => {
      const call = <T>(hook: string, fallback: T, run: () => T) =>
        this.guard(mode, `réglage « ${property.key} » : ${hook}`, fallback, run);
      if (property.hidden && call('hidden', false, () => property.hidden!(page, target, part))) return [];
      const raw = 'style' in target ? spatialValue(target, property.key) : target.attributes[property.key];
      const { readOnly } = property;
      return [
        {
          property,
          value: property.value ? call('value', raw, () => property.value!(page, target, part)) : raw,
          readOnly:
            typeof readOnly === 'function' ? call('readOnly', false, () => readOnly(page, target, part)) : !!readOnly,
          options: property.type === 'select' ? call('options', [], () => property.options(page, palette)) : [],
        },
      ];
    });
  }

  /**
   * `part` : partie de la forme sélectionnée, pour un réglage de partie (sujet 249) ; `merge` : réglage en direct
   * (`ModeProperty.live`, sujet 271).
   */
  setModeProperty(
    scope: ModeScope,
    targetId: string | undefined,
    key: string,
    value: string | undefined,
    part?: string,
    merge?: string,
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
    this.editPageMode(
      property.label,
      (edit) => {
        if (property.write) next = property.write(edit, target, value, part);
        else if (scope === 'page') edit.setPageAttribute(key, value);
        else edit.setElementAttribute(target.id, key, value);
      },
      merge,
    );
    if (scope === 'shape') this.selectPart(target.id, next);
  }

  modeKey(key: string): boolean {
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || selection?.pageId !== editable.page.id || selection.items.length !== 1) return false;
    const mode = this.core.modes.modeOf(editable.page);
    const action = mode?.keys?.[key];
    const id = selection.picked.element.id;
    const target = [...editable.page.edges, ...editable.page.shapes].find((element) => element.id === id);
    const part = selection.part;
    if (!mode || !action || !target) return false;
    if (!this.guard(mode, `touche « ${key} »`, false, () => action.applies(editable.page, target, part))) return false;
    const current = this.core.modeCurrents.getModeCurrent(editable.page.id);
    let next: string | void = undefined;
    this.editPageMode(action.label, (edit) => {
      next = action.run(edit, target, current, part);
    });
    this.selectPart(id, next);
    return true;
  }

  /**
   * Remise en ordre par le mode de la page, après une modification déjà écrite dans l'arbre, dans la même étape
   * d'annulation (sujet 288) : `run` reçoit la page relue de l'arbre. Vrai si l'arbre a changé (le modèle est alors à
   * relire) ; rien d'écrit si le mode lève une exception.
   */
  private followUp(
    pageId: string,
    hook: keyof PageModeDefinition,
    run: (mode: PageModeDefinition, edit: ModeEdit, fresh: PageModel) => void,
  ): boolean {
    const page = this.core.pages.pageById(pageId);
    const mode = page && this.core.modes.modeOf(page);
    const pageTree = this.core.file.pageTreeOf(pageId);
    if (!mode?.[hook] || !pageTree || !this.core.file.xmlTree) return false;
    const fresh = documentFromTree(this.core.file.xmlTree).pages.find((p) => p.id === pageId);
    if (!fresh) return false;
    const context = this.editContext();
    return this.guard(mode, hook, false, () =>
      applyModeEdit(fresh, pageTree, (edit) => run(mode, edit, fresh), context),
    );
  }

  /**
   * Formes posées sur la page (déplacées, redimensionnées, ajoutées, collées), déjà écrites dans l'arbre : le mode de
   * la page les remet en ordre (`placed`). `previous` : bornes d'avant d'une forme qui a bougé (déplacement,
   * redimensionnement), pour retrouver la page d'avant ; absent pour un ajout.
   */
  shapesPlaced(pageId: string, shapeIds: string[], previous?: (shape: ShapeModel) => Rect | undefined): boolean {
    if (shapeIds.length === 0) return false;
    return this.followUp(pageId, 'placed', (mode, edit, fresh) => {
      const before = previous && {
        ...fresh,
        shapes: fresh.shapes.map((shape) => {
          const bounds = previous(shape);
          return bounds ? { ...shape, bounds } : shape;
        }),
      };
      mode.placed!(edit, shapeIds, before);
    });
  }

  /** Texte d'un élément changé, déjà écrit : remise en ordre par le mode (`relabeled`, ex. table RDD élargie). */
  elementRelabeled(pageId: string, elementId: string): void {
    this.followUp(pageId, 'relabeled', (mode, edit) => mode.relabeled!(edit, elementId));
  }

  /** Bout d'une flèche rebranché, déjà écrit : remise en ordre par le mode (`edgeReconnected`, sujet 265). */
  edgeReconnected(pageId: string, edgeId: string): void {
    this.followUp(pageId, 'edgeReconnected', (mode, edit) => mode.edgeReconnected!(edit, edgeId));
  }

  /** Flèche tirée depuis une forme, déjà écrite : le mode la reçoit (`edgeCreated`, ex. ajoutée au flux courant). */
  edgeCreated(pageId: string, edgeId: string): void {
    const current = this.core.modeCurrents.getModeCurrent(pageId);
    this.followUp(pageId, 'edgeCreated', (mode, edit) => mode.edgeCreated!(edit, edgeId, current));
  }

  /** Éléments supprimés, déjà retirés de l'arbre : le mode remet ses données en ordre (`repair`, ex. rangs resserrés). */
  elementsRemoved(pageId: string): void {
    this.followUp(pageId, 'repair', (mode, edit) => mode.repair!(edit));
  }

  /**
   * Formes où accrocher le bout `end` d'une flèche dont l'autre bout est sur `otherId`, d'après le mode de la page
   * (`connects`, sujet 265) ; undefined = toutes (pas de règle, ou autre bout libre).
   */
  endAccepts(
    page: PageModel,
    end: TerminalEnd,
    otherId: string | undefined,
  ): ((shape: ShapeModel) => boolean) | undefined {
    const mode = this.core.modes.modeOf(page);
    const connects = mode?.connects;
    const other = connects && otherId !== undefined ? page.shapes.find((s) => s.id === otherId) : undefined;
    if (!mode || !connects || !other) return undefined;
    const allowed = (source: ShapeModel, target: ShapeModel) =>
      this.guard(mode, 'connects', true, () => connects(page, source, target));
    return end === 'target' ? (shape) => allowed(other, shape) : (shape) => allowed(shape, other);
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
    const context = this.editContext();
    const changed = document.pages
      .filter((page) => {
        const mode = this.core.modes.modeOf(page);
        const target = mode?.opened && this.core.targets.editablePageById(page.id);
        if (!mode?.opened || !target) return false;
        return this.guard(mode, 'opened', false, () =>
          applyModeEdit(target.page, target.pageTree, mode.opened!, context),
        );
      })
      .map((page) => page.id);
    if (changed.length === 0) return;
    this.core.edits.recordSnapshot('Ajustement du mode', before);
    this.core.file.documentChanged(changed);
  }

  /**
   * Avertissements des modes de page (mode inconnu, données remises en ordre) et des effets ajoutés à ceux de la
   * lecture, puis les erreurs des plugins (sujet 288).
   */
  withModeWarnings(document: DocumentModel): DocumentModel {
    for (const page of document.pages) {
      const mode = this.core.modes.modeOf(page);
      const single = { ...document, pages: [page] };
      const warnings = mode
        ? this.guard(mode, 'check', [], () => this.core.modes.warnings(single))
        : this.core.modes.warnings(single);
      document.warnings.push(...warnings);
    }
    document.warnings.push(...this.core.effects.warnings(document), ...this.core.pluginGuard.warnings());
    return document;
  }
}
