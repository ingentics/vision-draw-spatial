import { canMoveCell, setPageAttribute } from '../../format/cellEdits';
import { writeDrawio } from '../../format/write';
import type { PageTree } from '../../format/xmlTree';
import type { TerminalEnd } from '../../edit/edgeEnds';
import { endKey } from '../../edit/anchoring/auto/distribute';
import { carriedShapes, isLocked } from '../../edit/moveSet';
import type { DocumentModel, PageModel, Point, ShapeModel } from '../../model/types';
import { applyModeEdit } from '../../modes/modeEditWriter';
import { callMode } from '../../modes/modeCalls';
import type { PageEffectDefinition } from '../../effects/types';
import type { PageDressing } from '../../modes/dressing';
import type { ModeEdit, ModeEditContext } from '../../modes/modeEdit';
import type { ModeObstacles, PageModeDefinition } from '../../modes/types';
import { modePalette } from '../../settings';
import { SPATIAL } from '../../spatial';
import type { EngineCore } from '../EngineCore';
import { edgeOf, shapeOf } from '../../model/pageIndex';

/** Règle d'accroche d'un bout de flèche : la forme est-elle permise au point visé (pixels de page, sujet 333) ? */
export type EndAccepts = (shape: ShapeModel, point: Point) => boolean;

/**
 * Modes de page (sujet 69) : choix du mode, questions au mode de la page, opérations. Hôte des appels au mode de la
 * page (sujets 288, 379) : le reste du moteur passe par ses méthodes, ou par les domaines voisins qui s'appuient sur
 * `call` (`ModePanel` : réglages et touches ; `ModeFollowUps` : remises en ordre ; `ShapeParts`, `ModeHandles`,
 * `ModeCurrents`). Les effets ont leur hôte (`PageEffects`), qui ne demande au mode que s'il permet un effet
 * (`allowsEffect`).
 */
export class PageModes {
  constructor(private readonly core: EngineCore) {}

  /**
   * Appel protégé (sujet 288, `PluginGuard`, appel protégé commun aux plugins, sujet 378) de `run`, qui appelle le mode
   * `mode` : sa valeur, ou `fallback` (le point d'appel traité comme absent) s'il lève une exception, signalée dans les
   * Diagnostics. Pour plusieurs points d'entrée sous une seule protection ; un point d'entrée seul passe par `call`.
   */
  guard<T>(mode: PageModeDefinition, hook: string, fallback: T, run: () => T): T {
    return this.core.pluginGuard.call('Mode', mode.id, hook, fallback, run);
  }

  /**
   * Point d'entrée `entry` du mode `mode` appelé avec `args` (sujet 379) : arguments en lecture seule (`callMode`) et
   * appel protégé (`guard`) posés ici une fois pour tous les hôtes. `fallback` si le point d'entrée est absent ou lève
   * une exception.
   */
  call<A extends unknown[], R, F>(
    mode: PageModeDefinition,
    hook: string,
    fallback: F,
    entry: ((...args: A) => R) | undefined,
    ...args: A
  ): R | F {
    if (!entry) return fallback;
    return this.guard<R | F>(mode, hook, fallback, () => callMode(entry, ...args));
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

  /**
   * Flèche gérée par le mode de sa page (`edges.manages`, sujet 265, ex. relation RDD) : ses textes de début / fin
   * (cardinalités) ne se modifient ni ne se déplacent.
   */
  managesEdge(edgeId: string): boolean {
    const page = this.core.pages.getCurrentPage();
    const edge = edgeOf(page, edgeId);
    const mode = page && this.core.modes.modeOf(page);
    if (!page || !edge || !mode) return false;
    return this.call(mode, 'edges.manages', false, mode.edges?.manages, page, edge);
  }

  /**
   * Bouts d'arrivée que le mode de `page` place lui-même (`edges.placedEntries`, sujet 338), en clés `endKey` : la
   * répartition de l'ancrage automatique et Typon les laisse en place.
   */
  placedEntries(page: PageModel): Set<string> {
    const mode = this.core.modes.modeOf(page);
    if (!mode) return new Set();
    const ids = this.call(mode, 'edges.placedEntries', [], mode.edges?.placedEntries, page);
    return new Set(ids.map((id) => endKey(id, 'target')));
  }

  /** Habillage du rendu de la page par son mode, protégé jusque dans ses fonctions (appelées au dessin). */
  dressing(page: PageModel): PageDressing | undefined {
    const mode = this.core.modes.modeOf(page);
    if (!mode?.dressing) return undefined;
    const values = this.core.modes.values(mode.id, this.core.settings.modes[mode.id]);
    const dressing = this.call(mode, 'dressing', undefined, mode.dressing, page, values);
    if (!dressing) return undefined;
    const { shapeStyle, edgeColor, edgeBadge } = dressing;
    return {
      ...dressing,
      ...(shapeStyle && {
        shapeStyle: (shape) => this.call(mode, 'dressing.shapeStyle', undefined, shapeStyle, shape),
      }),
      ...(edgeColor && {
        edgeColor: (edge) => this.call(mode, 'dressing.edgeColor', undefined, edgeColor, edge),
      }),
      ...(edgeBadge && {
        edgeBadge: (edge) => this.call(mode, 'dressing.edgeBadge', undefined, edgeBadge, edge),
      }),
    };
  }

  /**
   * L'effet est-il actif sur la page (`page.allowsEffect` du mode, sujet 143, et modes d'affichage de l'effet) ? Le mode en
   * panne est traité comme absent : l'effet est permis (dette 296).
   */
  allowsEffect(page: PageModel, effect: Pick<PageEffectDefinition, 'id' | 'viewModes'>): boolean {
    const mode = this.core.modes.modeOf(page);
    if (mode && !this.call(mode, 'page.allowsEffect', true, mode.page?.allowsEffect, effect.id)) return false;
    return this.core.modes.effectViewable(page, effect);
  }

  /** Bornes de `shape` pendant un déplacement ou un redimensionnement (`gestures.obstacles`, sujet 241) ; undefined : aucune. */
  obstacles(page: PageModel, shape: ShapeModel): ModeObstacles | undefined {
    const mode = this.core.modes.modeOf(page);
    const obstacles = mode?.gestures?.obstacles;
    if (!mode || !obstacles) return undefined;
    const values = this.core.modes.values(mode.id, this.core.settings.modes[mode.id]);
    return this.call(mode, 'gestures.obstacles', undefined, obstacles, page, shape, values);
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
    const carries = (shape: ShapeModel) => this.call(mode, 'gestures.carries', [], carriesOf, page, shape);
    const accept = movableIn ? (shape: ShapeModel) => !isLocked(shape) && canMoveCell(movableIn, shape.id) : undefined;
    return carriedShapes(page, shapeIds, carries, accept);
  }

  /**
   * Contexte des opérations de mode : couleurs proposées et textes de début / fin, d'après les paramètres ; mesure du
   * texte du moteur.
   */
  editContext(): ModeEditContext {
    const { shapes, styles } = this.core.settings;
    return {
      palette: modePalette(styles),
      endText: {
        size: shapes.edgeEndTextSize,
        color: shapes.edgeEndTextColor,
        gap: { along: shapes.edgeEndTextGapAlong, across: shapes.edgeEndTextGapAcross },
      },
      measureText: this.core.textMeasure.measure,
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
    const shape = shapeOf(this.core.pages.getCurrentPage(), shapeId);
    if (!shape || typeof part !== 'string') return;
    this.core.selection.selectItems([{ type: 'shape', element: shape }], part);
    if (this.core.shapeParts.text(shapeId, part)) this.core.labelEditor.editPartLabel(shapeId, part);
  }

  /**
   * Formes où accrocher le bout `end` d'une flèche dont l'autre bout est sur `otherId`, d'après le mode de la page
   * (`edges.connects`, sujet 265) ; undefined = toutes (pas de règle, ou autre bout libre). Le prédicat reçoit la forme
   * et le point visé (pixels de page) : au bout d'arrivée, la partie sous ce point est transmise au mode (sujet 333).
   */
  endAccepts(page: PageModel, end: TerminalEnd, otherId: string | undefined): EndAccepts | undefined {
    const mode = this.core.modes.modeOf(page);
    const connects = mode?.edges?.connects;
    const other = connects ? shapeOf(page, otherId) : undefined;
    if (!mode || !connects || !other) return undefined;
    const allowed = (source: ShapeModel, target: ShapeModel, part?: string) =>
      this.call(mode, 'edges.connects', true, connects, page, source, target, part);
    return end === 'target'
      ? (shape, point) => allowed(other, shape, this.core.shapeParts.at(page, shape, point))
      : (shape) => allowed(shape, other);
  }

  /**
   * Avertissements des modes de page ajoutés à ceux de la lecture, page par page : mode inconnu (registre), données
   * remises en ordre (`lifecycle.check`). `DocumentFile` y ajoute ceux des effets et les erreurs des plugins (sujet 378).
   */
  withModeWarnings(document: DocumentModel): DocumentModel {
    for (const page of document.pages) {
      const mode = this.core.modes.modeOf(page);
      if (!mode) {
        document.warnings.push(...this.core.modes.warnings({ pages: [page] }));
        continue;
      }
      const issues = this.call(mode, 'lifecycle.check', [], mode.lifecycle?.check, page);
      document.warnings.push(...issues.map((issue) => ({ pageId: page.id, ...issue })));
    }
    return document;
  }
}
