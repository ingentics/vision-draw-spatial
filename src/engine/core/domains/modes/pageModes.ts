import { canMoveCell, setPageAttribute } from '../../format/cellEdits';
import { documentFromTree } from '../../format/parse';
import { writeDrawio } from '../../format/write';
import type { PageTree } from '../../format/xmlTree';
import type { TerminalEnd } from '../../edit/edgeEnds';
import { carriedShapes, isLocked } from '../../edit/moveSet';
import type { DocumentModel, PageModel, Point, Rect, ShapeModel } from '../../model/types';
import { freezeModel, readonlyModel } from '../../model/freeze';
import { hasExactTextMeasure } from '../../render/textMeasure';
import { applyModeEdit } from '../../modes/modeEdits';
import { modeKeys } from '../../modes/modeKeys';
import { pageEffectIds, withPageEffect } from '../../effects/registry';
import type { PageEffectDefinition } from '../../effects/types';
import type { ModeScope } from '../../modes/registry';
import type {
  ModeEdit,
  ModeEditContext,
  ModeObstacles,
  ModeTarget,
  PageDressing,
  PageModeDefinition,
} from '../../modes/types';
import { modePalette } from '../../settings';
import { SPATIAL } from '../../spatial';
import type { ModePropertyView } from '../types';
import type { EngineCore } from '../EngineCore';

/** Règle d'accroche d'un bout de flèche : la forme est-elle permise au point visé (pixels de page, sujet 333) ? */
export type EndAccepts = (shape: ShapeModel, point: Point) => boolean;

/**
 * Modes et effets de page (sujets 69, 143) : choix du mode, réglages déclarés, opérations et touches du mode. Hôte des appels au mode de la page (sujet 288) : le reste du moteur passe par ses méthodes (ou par
 * `ShapeParts` et `ModeHandles`), qui protègent chaque appel (`PluginGuard`).
 */
export class PageModes {
  constructor(private readonly core: EngineCore) {}

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
   * Flèche gérée par le mode de sa page (`edges.manages`, sujet 265, ex. relation RDD) : ses textes de début / fin
   * (cardinalités) ne se modifient ni ne se déplacent.
   */
  managesEdge(edgeId: string): boolean {
    const page = this.core.pages.getCurrentPage();
    const edge = page?.edges.find((e) => e.id === edgeId);
    const mode = page && this.core.modes.modeOf(page);
    const manages = mode?.edges?.manages;
    if (!page || !edge || !mode || !manages) return false;
    return this.guard(mode, 'edges.manages', false, () => manages(readonlyModel(page), readonlyModel(edge)));
  }

  /** Habillage du rendu de la page par son mode, protégé jusque dans ses fonctions (appelées au dessin). */
  dressing(page: PageModel): PageDressing | undefined {
    const mode = this.core.modes.modeOf(page);
    if (!mode?.dressing) return undefined;
    const values = this.core.modes.values(mode.id, this.core.settings.modes[mode.id]);
    const dressing = this.guard(mode, 'dressing', undefined, () => mode.dressing!(readonlyModel(page), values));
    if (!dressing) return undefined;
    const { edgeColor, edgeBadge } = dressing;
    return {
      ...dressing,
      ...(edgeColor && {
        edgeColor: (edge) => this.guard(mode, 'dressing.edgeColor', undefined, () => edgeColor(readonlyModel(edge))),
      }),
      ...(edgeBadge && {
        edgeBadge: (edge) => this.guard(mode, 'dressing.edgeBadge', undefined, () => edgeBadge(readonlyModel(edge))),
      }),
    };
  }

  /**
   * L'effet est-il actif sur la page (`page.allowsEffect` du mode, sujet 143, et modes d'affichage de l'effet) ? Le mode en
   * panne est traité comme absent : l'effet est permis (dette 296).
   */
  allowsEffect(page: PageModel, effect: Pick<PageEffectDefinition, 'id' | 'viewModes'>): boolean {
    const mode = this.core.modes.modeOf(page);
    const allows = mode?.page?.allowsEffect;
    if (mode && allows && !this.guard(mode, 'page.allowsEffect', true, () => allows(effect.id))) return false;
    return this.core.modes.effectViewable(page, effect);
  }

  /** Bornes de `shape` pendant un déplacement ou un redimensionnement (`gestures.obstacles`, sujet 241) ; undefined : aucune. */
  obstacles(page: PageModel, shape: ShapeModel): ModeObstacles | undefined {
    const mode = this.core.modes.modeOf(page);
    const obstacles = mode?.gestures?.obstacles;
    if (!mode || !obstacles) return undefined;
    const values = this.core.modes.values(mode.id, this.core.settings.modes[mode.id]);
    return this.guard(mode, 'gestures.obstacles', undefined, () =>
      obstacles(readonlyModel(page), readonlyModel(shape), values),
    );
  }

  /** Le mode de la page emporte-t-il des formes (`gestures.carries`) ? Leurs flèches sont alors mises en valeur avec elles. */
  hasCarries(page: PageModel): boolean {
    return !!this.core.modes.modeOf(page)?.gestures?.carries;
  }

  /**
   * Formes emportées par le mode avec `shapeIds` (`gestures.carries`, ex. contenu d'une région RDD), de proche en proche ;
   * `movableIn` : seulement celles qui peuvent bouger dans cet arbre (geste), sinon toutes (mise en valeur).
   */
  carried(page: PageModel, shapeIds: readonly string[], movableIn?: PageTree): string[] {
    const mode = this.core.modes.modeOf(page);
    const carriesOf = mode?.gestures?.carries;
    if (!mode || !carriesOf) return [];
    const carries = (shape: ShapeModel) =>
      this.guard(mode, 'gestures.carries', [], () => carriesOf(readonlyModel(page), readonlyModel(shape)));
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
        applyModeEdit(editable.page, editable.pageTree, mode, edit, context),
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
    const keys = modeKeys(mode);
    const readonlyPage = readonlyModel(page);
    const readonlyTarget = readonlyModel(target);
    return this.core.modes.properties(page, scope, part).flatMap((property) => {
      const call = <T>(hook: string, fallback: T, run: () => T) =>
        this.guard(mode, `réglage « ${property.key} » : ${hook}`, fallback, run);
      if (property.hidden && call('hidden', false, () => property.hidden!(readonlyPage, readonlyTarget, part)))
        return [];
      // Attribut du mode au nom court du réglage ; un nom invalide est traité comme un attribut absent.
      const raw = this.guard(mode, `réglage « ${property.key} » : clé`, undefined, () =>
        'style' in target ? keys.value(target, property.key) : keys.pageValue(target, property.key),
      );
      const { readOnly } = property;
      return [
        {
          property,
          value: property.value ? call('value', raw, () => property.value!(readonlyPage, readonlyTarget, part)) : raw,
          readOnly:
            typeof readOnly === 'function'
              ? call('readOnly', false, () => readOnly(readonlyPage, readonlyTarget, part))
              : !!readOnly,
          options: property.type === 'select' ? call('options', [], () => property.options(readonlyPage, palette)) : [],
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
        if (property.write) next = property.write(edit, readonlyModel(target), value, part);
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
    if (
      !this.guard(mode, `touche « ${key} »`, false, () =>
        action.applies(readonlyModel(editable.page), readonlyModel(target), part),
      )
    )
      return false;
    const current = this.core.modeCurrents.getModeCurrent(editable.page.id);
    let next: string | void = undefined;
    this.editPageMode(action.label, (edit) => {
      next = action.run(edit, readonlyModel(target), current, part);
    });
    this.selectPart(id, next);
    return true;
  }

  /**
   * Remise en ordre par le mode de la page, après une modification déjà écrite dans l'arbre, dans la même étape
   * d'annulation (sujet 288) : `run` reçoit la page relue de l'arbre. Vrai si l'arbre a changé (le modèle est alors à
   * relire) ; rien d'écrit si le mode lève une exception, ou si une de ses écritures échoue en route (sujet 302).
   */
  private followUp<F>(
    pageId: string,
    hook: string,
    entryOf: (mode: PageModeDefinition) => F | undefined,
    run: (entry: F, edit: ModeEdit, fresh: PageModel) => void,
  ): boolean {
    // Page modifiable seulement (sujet 302), comme une opération.
    const target = this.core.targets.editablePageById(pageId);
    const mode = target && this.core.modes.modeOf(target.page);
    const entry = mode && entryOf(mode);
    const pageTree = target?.pageTree;
    if (!mode || !entry || !pageTree || !this.core.file.xmlTree) return false;
    const read = documentFromTree(this.core.file.xmlTree).pages.find((p) => p.id === pageId);
    if (!read) return false;
    // Page de ce seul usage : gelée comme celles du document, le mode n'y écrit pas (sujet 324).
    const fresh = freezeModel(read);
    const context = this.editContext();
    return this.guard(mode, hook, false, () =>
      applyModeEdit(fresh, pageTree, mode, (edit) => run(entry, edit, fresh), context),
    );
  }

  /**
   * Formes posées sur la page (déplacées, redimensionnées, ajoutées, collées), déjà écrites dans l'arbre : le mode de
   * la page les remet en ordre (`gestures.placed`). `previous` : bornes d'avant d'une forme qui a bougé (déplacement,
   * redimensionnement), pour retrouver la page d'avant ; absent pour un ajout.
   */
  shapesPlaced(pageId: string, shapeIds: string[], previous?: (shape: ShapeModel) => Rect | undefined): boolean {
    if (shapeIds.length === 0) return false;
    return this.followUp(
      pageId,
      'gestures.placed',
      (mode) => mode.gestures?.placed,
      (placed, edit, fresh) => {
        const before = previous && {
          ...fresh,
          shapes: fresh.shapes.map((shape) => {
            const bounds = previous(shape);
            return bounds ? { ...shape, bounds } : shape;
          }),
        };
        placed(edit, shapeIds, readonlyModel(before));
      },
    );
  }

  /** Texte d'un élément changé, déjà écrit : remise en ordre par le mode (`gestures.relabeled`, ex. table RDD élargie). */
  elementRelabeled(pageId: string, elementId: string): void {
    this.followUp(
      pageId,
      'gestures.relabeled',
      (mode) => mode.gestures?.relabeled,
      (relabeled, edit) => relabeled(edit, elementId),
    );
  }

  /** Bout d'une flèche rebranché, déjà écrit : remise en ordre par le mode (`edges.reconnected`, sujet 265). */
  edgeReconnected(pageId: string, edgeId: string, part?: string): void {
    this.followUp(
      pageId,
      'edges.reconnected',
      (mode) => mode.edges?.reconnected,
      (reconnected, edit) => reconnected(edit, edgeId, part),
    );
  }

  /** Flèche tirée depuis une forme, déjà écrite : le mode la reçoit (`edges.created`, ex. ajoutée au flux courant). */
  edgeCreated(pageId: string, edgeId: string, part?: string): void {
    const current = this.core.modeCurrents.getModeCurrent(pageId);
    this.followUp(
      pageId,
      'edges.created',
      (mode) => mode.edges?.created,
      (created, edit) => created(edit, edgeId, current, part),
    );
  }

  /** Éléments supprimés, déjà retirés de l'arbre : le mode remet ses données en ordre (`lifecycle.removed`, ex. rangs resserrés). */
  elementsRemoved(pageId: string): void {
    this.followUp(
      pageId,
      'lifecycle.removed',
      (mode) => mode.lifecycle?.removed,
      (removed, edit) => removed(edit),
    );
  }

  /**
   * Formes où accrocher le bout `end` d'une flèche dont l'autre bout est sur `otherId`, d'après le mode de la page
   * (`edges.connects`, sujet 265) ; undefined = toutes (pas de règle, ou autre bout libre). Le prédicat reçoit la forme
   * et le point visé (pixels de page) : au bout d'arrivée, la partie sous ce point est transmise au mode (sujet 333).
   */
  endAccepts(page: PageModel, end: TerminalEnd, otherId: string | undefined): EndAccepts | undefined {
    const mode = this.core.modes.modeOf(page);
    const connects = mode?.edges?.connects;
    const other = connects && otherId !== undefined ? page.shapes.find((s) => s.id === otherId) : undefined;
    if (!mode || !connects || !other) return undefined;
    const allowed = (source: ShapeModel, target: ShapeModel, part?: string) =>
      this.guard(mode, 'edges.connects', true, () =>
        connects(readonlyModel(page), readonlyModel(source), readonlyModel(target), part),
      );
    return end === 'target'
      ? (shape, point) => allowed(other, shape, this.core.shapeParts.at(page, shape, point))
      : (shape) => allowed(shape, other);
  }

  /**
   * Document ouvert, ou mesure exacte du texte arrivée : chaque page d'un mode est remise en ordre par
   * `lifecycle.opened` (sujet 255), en une étape d'annulation pour tout le document ; rien si rien ne change, si on ne
   * peut pas modifier ou tant que la mesure du texte n'est qu'approchée.
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
        const opened = mode?.lifecycle?.opened;
        const target = opened && this.core.targets.editablePageById(page.id);
        if (!mode || !opened || !target) return false;
        return this.guard(mode, 'lifecycle.opened', false, () =>
          applyModeEdit(target.page, target.pageTree, mode, opened, context),
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
      const id = this.core.modes.modeId(page);
      if (id === undefined) continue;
      const mode = this.core.modes.get(id);
      if (!mode) {
        document.warnings.push({ pageId: page.id, message: `Mode de page inconnu : ${id}` });
        continue;
      }
      const lifecycle = mode.lifecycle;
      const issues = lifecycle?.check
        ? this.guard(mode, 'lifecycle.check', [], () => lifecycle.check!(readonlyModel(page)))
        : [];
      document.warnings.push(...issues.map((issue) => ({ pageId: page.id, ...issue })));
    }
    document.warnings.push(...this.core.effects.warnings(document), ...this.core.pluginGuard.warnings());
    return document;
  }
}
