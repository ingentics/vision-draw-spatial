import type { EdgeModel, PageModel, ShapeModel } from '../../../../core/plugins';
import { edgeOf, shapeOf } from '../../../../core/plugins';
import { compositeAncestors, compositeOf } from '../composites/compositeLayout';
import { isErrorExit } from '../exits/exitKind';
import { isComposite, isFinal, isInitial, isStateLike } from '../kinds';
import { outgoingTransitions, transitionEnds } from '../transitions/transitionRules';

/**
 * Simulation pas à pas d'une machine à états (sujet 460) : logique pure, rien n'est écrit dans le fichier. Les
 * transitions n'ont ni garde ni événement : à chaque pas, l'utilisateur choisit celle à franchir parmi les transitions
 * proposées.
 */

/** Fin d'une simulation : sortie attendue, sortie en erreur, ou aucune transition à franchir. */
export type SimulationEnd = 'expected' | 'error' | 'blocked';

/** Un pas : l'élément courant (état, ensemble, point d'entrée ou de sortie) et la transition franchie pour y venir. */
export interface SimulationStep {
  elementId: string;
  /** Transition franchie pour arriver ici ; absente au départ et à l'entrée intérieure d'un ensemble. */
  via?: string;
  /**
   * Pas traversé sans choix (ensemble dont on prend l'entrée, entrée à une seule transition) : Retour ne s'y arrête
   * pas.
   */
  passed?: boolean;
}

/** Transition proposée et l'élément où elle mène. */
export interface Proposal {
  edge: EdgeModel;
  target: ShapeModel;
}

export class StateSimulation {
  private history: SimulationStep[] = [];

  /** Simulation partant de `elementId` ; un ensemble est pris par son entrée intérieure (`enter` vrai). */
  constructor(
    readonly page: PageModel,
    elementId: string,
    enter = false,
  ) {
    const start = shapeOf(page, elementId);
    if (!start) throw new Error(`Élément inconnu : ${elementId}`);
    if (enter) this.arrive(start, undefined);
    else this.history.push({ elementId });
  }

  /** Pas de la simulation, du départ au pas courant. */
  get steps(): readonly SimulationStep[] {
    return this.history;
  }

  /** Numéro du pas courant pour l'utilisateur : les pas où l'on choisit, sans ceux traversés sans choix. */
  get stepNumber(): number {
    return this.history.filter((step) => !step.passed).length;
  }

  /** Élément du pas courant. */
  get current(): ShapeModel {
    return shapeOf(this.page, this.history[this.history.length - 1]!.elementId)!;
  }

  /** Ensembles qui contiennent l'élément courant, du plus proche au plus lointain. */
  enclosing(): ShapeModel[] {
    return compositeAncestors(this.page, this.current);
  }

  /**
   * Transitions proposées, numérotées 1…n dans cet ordre : les sortantes de l'élément courant, puis celles de chaque
   * ensemble qui le contient, du plus proche au plus lointain (règle UML : on quitte un ensemble depuis n'importe
   * lequel de ses états) ; chaque groupe dans l'ordre de dessin. Sur un point d'entrée, seulement les siennes (on n'est
   * encore dans aucun état de l'ensemble). Aucune une fois sorti par un point de sortie de premier niveau ou en erreur.
   */
  proposals(): Proposal[] {
    const current = this.current;
    if (isFinal(current) && (isErrorExit(current) || !compositeOf(this.page, current))) return [];
    if (isInitial(current)) return outgoing(this.page, current);
    return [current, ...this.enclosing()].flatMap((source) => outgoing(this.page, source));
  }

  /** La transition `edgeId` est-elle proposée ? */
  proposes(edgeId: string): boolean {
    return this.proposals().some(({ edge }) => edge.id === edgeId);
  }

  /** Fin atteinte au pas courant ; undefined tant qu'il reste une transition à franchir. */
  end(): SimulationEnd | undefined {
    const current = this.current;
    if (isErrorExit(current)) return 'error';
    if (isFinal(current) && !compositeOf(this.page, current)) return 'expected';
    return this.proposals().length === 0 ? 'blocked' : undefined;
  }

  /** Franchit la transition proposée numéro `n` (à partir de 1) ; rend son id, undefined si elle n'existe pas. */
  choose(n: number): string | undefined {
    const proposal = this.proposals()[n - 1];
    return proposal && this.cross(proposal.edge.id) ? proposal.edge.id : undefined;
  }

  /** Suivant possible : une seule transition proposée. */
  canNext(): boolean {
    return this.proposals().length === 1;
  }

  /** Franchit la seule transition proposée ; rend son id, undefined s'il y en a zéro ou plusieurs. */
  next(): string | undefined {
    return this.canNext() ? this.choose(1) : undefined;
  }

  /** Franchit la transition `edgeId`, si elle est proposée. */
  cross(edgeId: string): boolean {
    const proposal = this.proposals().find(({ edge }) => edge.id === edgeId);
    if (!proposal) return false;
    this.arrive(proposal.target, edgeId);
    return true;
  }

  /** Retour possible : un pas où l'on a choisi précède le pas courant. */
  canBack(): boolean {
    return this.previousChoice() >= 0;
  }

  /** Revient au dernier pas où l'on a choisi (les pas traversés sans choix sont sautés) ; faux au départ. */
  back(): boolean {
    const previous = this.previousChoice();
    if (previous < 0) return false;
    this.history = this.history.slice(0, previous + 1);
    return true;
  }

  /** Revient au départ : au premier pas où l'on choisit (un ensemble de départ est traversé jusqu'à son entrée). */
  restart(): boolean {
    const first = this.history.findIndex((step) => !step.passed);
    return this.goTo(first + 1);
  }

  /**
   * Revient au pas `n` (à partir de 1) : les pas suivants sont oubliés. Un pas traversé sans choix mène au premier pas
   * où l'on choisit après lui (on ne s'arrête jamais là où `cross` ne s'arrête pas) ; faux si c'est le pas courant.
   */
  goTo(n: number): boolean {
    const index = Number.isInteger(n) && n >= 1 ? this.choiceFrom(n - 1) : -1;
    if (index < 0 || index >= this.history.length - 1) return false;
    this.history = this.history.slice(0, index + 1);
    return true;
  }

  /** Pas où mène `goTo(n)` (à partir de 1) ; undefined s'il n'y en a pas ou si c'est le pas courant. */
  goToTarget(n: number): number | undefined {
    const index = Number.isInteger(n) && n >= 1 ? this.choiceFrom(n - 1) : -1;
    return index >= 0 && index < this.history.length - 1 ? index + 1 : undefined;
  }

  /**
   * Passages par élément, d'après l'historique ; un pas traversé sans choix (ensemble pris par son entrée) ne compte
   * pas.
   */
  visits(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const { elementId, passed } of this.history) {
      if (!passed) counts.set(elementId, (counts.get(elementId) ?? 0) + 1);
    }
    return counts;
  }

  /** Transitions empruntées, d'après l'historique. */
  taken(): Set<string> {
    return new Set(this.history.flatMap((step) => (step.via ? [step.via] : [])));
  }

  /** Indice du dernier pas où l'on a choisi avant le pas courant ; -1 au départ. */
  private previousChoice(): number {
    for (let i = this.history.length - 2; i >= 0; i--) if (!this.history[i]!.passed) return i;
    return -1;
  }

  /** Indice du premier pas où l'on choisit à partir de l'indice `index` ; -1 hors de l'historique. */
  private choiceFrom(index: number): number {
    for (let i = index; i < this.history.length; i++) if (!this.history[i]!.passed) return i;
    return -1;
  }

  /**
   * Arrivée sur `target` : un ensemble mène à son point d'entrée intérieur (le premier dessiné), puis tout de suite à
   * la cible de sa transition s'il n'en a qu'une ; sans entrée intérieure, l'ensemble est l'état courant. `entered` :
   * ensembles déjà pris dans cette suite de pas sans choix (une entrée qui ramène à son ensemble s'y arrête).
   */
  private arrive(target: ShapeModel, via: string | undefined, entered = new Set<string>()): void {
    const entry = isComposite(target) && !entered.has(target.id) ? innerEntry(this.page, target) : undefined;
    if (!entry) {
      this.history.push({ elementId: target.id, ...(via && { via }) });
      return;
    }
    entered.add(target.id);
    this.history.push({ elementId: target.id, ...(via && { via }), passed: true });
    const next = outgoing(this.page, entry);
    if (next.length !== 1) {
      this.history.push({ elementId: entry.id });
      return;
    }
    this.history.push({ elementId: entry.id, passed: true });
    this.arrive(next[0]!.target, next[0]!.edge.id, entered);
  }
}

/** Départ demandé : une simulation, des points d'entrée à choisir, ou une erreur. */
export type SimulationStart = { simulation: StateSimulation } | { entries: ShapeModel[] } | { error: string };

/**
 * Départ d'une simulation selon la sélection : un état ou un point d'entrée part de lui, un ensemble de son entrée
 * intérieure, une transition de son état de départ ; sinon (rien, plusieurs éléments, autre élément), du point
 * d'entrée de premier niveau de la page, à choisir s'il y en a plusieurs.
 */
export function startSimulation(page: PageModel, selection: readonly string[]): SimulationStart {
  const only = selection.length === 1 ? selection[0]! : undefined;
  const shape = only !== undefined ? shapeOf(page, only) : undefined;
  if (shape && isComposite(shape)) return { simulation: new StateSimulation(page, shape.id, true) };
  if (shape && (isInitial(shape) || isStateLike(shape))) return { simulation: new StateSimulation(page, shape.id) };
  const edge = only !== undefined ? edgeOf(page, only) : undefined;
  const source = edge && transitionEnds(page, edge)?.source;
  if (source) return { simulation: new StateSimulation(page, source.id) };
  const entries = page.shapes.filter((s) => isInitial(s) && !compositeOf(page, s)).sort((a, b) => a.z - b.z);
  if (entries.length === 0) return { error: 'Aucun point d’entrée sur la page' };
  if (entries.length > 1) return { entries };
  return { simulation: new StateSimulation(page, entries[0]!.id) };
}

/** Transitions sortantes de `source`, dans l'ordre de dessin. */
function outgoing(page: PageModel, source: ShapeModel): Proposal[] {
  return outgoingTransitions(page, source).map(({ edge, target }) => ({ edge, target }));
}

/** Premier point d'entrée dessiné directement dans l'ensemble. */
function innerEntry(page: PageModel, composite: ShapeModel): ShapeModel | undefined {
  return page.shapes
    .filter((shape) => isInitial(shape) && compositeOf(page, shape)?.id === composite.id)
    .sort((a, b) => a.z - b.z)[0];
}
