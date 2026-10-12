import type { EdgeModel, PageModel, ShapeModel } from '../../../../core/plugins';
import { edgeOf, elementName, oneLine, shapeOf } from '../../../../core/plugins';
import { ERROR_COLOR, isErrorExit } from '../exits/exitKind';
import { isFinal, isInitial, isStateLike } from '../kinds';
import { businessRules } from '../transitions/businessRules';
import { outgoingTransitions } from '../transitions/transitionRules';
import type { SimulationEnd, StateSimulation } from './stateSimulation';

/**
 * Ce que l'appli montre d'une simulation de machine à états (sujets 462, 463, 527, 528) : contenu du pas courant pour
 * la couche, suite à cadrer, noms des pas, fin, trace, règles de gestion des transitions proposées.
 */

/** Ce que la couche montre d'un pas : ids de la page simulée. */
export interface StepLook {
  current: string;
  /** Ensembles qui contiennent l'élément courant : encadrés. */
  frames: string[];
  /** États (et ensembles où l'on s'est arrêté) visités et leurs passages : teintés, compteur dès 2. */
  visits: Array<{ id: string; count: number }>;
  /** Transitions proposées et leur pastille (numéro du choix). */
  proposed: Array<{ id: string; badge: string }>;
  taken: string[];
}

/** Pas courant vu par la couche : état courant, ensembles parents, états visités, transitions proposées et empruntées. */
export function stepLook(sim: StateSimulation): StepLook {
  const visits = [...sim.visits()]
    .filter(([id]) => {
      const shape = shapeOf(sim.page, id);
      return shape !== undefined && isStateLike(shape);
    })
    .map(([id, count]) => ({ id, count }));
  return {
    current: sim.current.id,
    frames: sim.enclosing().map((shape) => shape.id),
    visits,
    proposed: sim.proposals().map(({ edge }, i) => ({ id: edge.id, badge: String(i + 1) })),
    taken: [...sim.taken()],
  };
}

/** Règles de gestion d'une transition proposée (sujet 528) : numéro de sa pastille, nom (vide sans nom), règles. */
export interface ProposedRules {
  badge: string;
  name: string;
  rules: string[];
}

/** Règles de gestion des transitions proposées, dans l'ordre des pastilles ; sans celles qui n'en ont pas. */
export function proposedRules(sim: StateSimulation): ProposedRules[] {
  return sim.proposals().flatMap(({ edge }, i) => {
    const rules = businessRules(edge);
    return rules.length === 0 ? [] : [{ badge: String(i + 1), name: transitionName(edge), rules }];
  });
}

/** Profondeur de la suite cadrée avec l'élément courant (sujet 527) : en nombre de transitions. */
const UPCOMING_DEPTH = 2;

/**
 * Suite du pas courant, cadrée avec lui (sujet 527) : éléments où mènent les transitions proposées, puis les transitions
 * qui en partent, jusqu'à `UPCOMING_DEPTH` transitions ; sans l'élément courant ni doublon.
 */
export function upcoming(sim: StateSimulation): string[] {
  const found = new Set<string>([sim.current.id]);
  let level = sim.proposals().map(({ target }) => target);
  for (let depth = 1; depth <= UPCOMING_DEPTH && level.length > 0; depth++) {
    const next: ShapeModel[] = [];
    for (const shape of level) {
      if (found.has(shape.id)) continue;
      found.add(shape.id);
      if (depth < UPCOMING_DEPTH) next.push(...outgoingTransitions(sim.page, shape).map(({ target }) => target));
    }
    level = next;
  }
  found.delete(sim.current.id);
  return [...found];
}

/** Nom d'un élément dans la barre et la trace : « Entrée », « Sortie », ou le titre de l'état sur une ligne. */
export function stepName(shape: ShapeModel): string {
  if (isInitial(shape)) return 'Entrée';
  if (isFinal(shape)) return isErrorExit(shape) ? 'Sortie en erreur' : 'Sortie';
  return oneLine(elementName(shape));
}

/** Nom d'une transition : son texte du milieu sur une ligne, vide sans nom. */
function transitionName(edge: EdgeModel | undefined): string {
  return edge ? oneLine(edge.label) : '';
}

/** Bandeau de fin : texte, couleur (fond du bandeau, texte de la trace) et couleur du texte sur ce fond. */
export const END_LABELS: Record<SimulationEnd, { text: string; color: string; textColor: string }> = {
  expected: { text: 'Terminé : sortie attendue', color: '#2e7d32', textColor: '#ffffff' },
  error: { text: 'Terminé en erreur', color: ERROR_COLOR, textColor: '#ffffff' },
  blocked: { text: 'Bloqué : aucune transition sortante', color: '#ef6c00', textColor: '#ffffff' },
};

/** Point d'entrée à choisir au départ, nommé par l'état où mène sa première transition. */
export function entryName(page: PageModel, entry: ShapeModel): string {
  const target = outgoingTransitions(page, entry)[0]?.target;
  return target ? `Entrée vers « ${stepName(target)} »` : `Entrée ${entry.id}`;
}

/**
 * Ligne de la trace : un pas ou la transition franchie pour y venir. `target` : pas où mène un clic (`goTo`, à partir de
 * 1), le premier où l'on choisit à partir de cette ligne ; absent si la ligne ne mène nulle part (pas courant, pas
 * traversé sans choix).
 */
export type TraceLine =
  | { kind: 'step'; text: string; count: number; current: boolean; target?: number }
  | { kind: 'transition'; text: string; target?: number };

/**
 * Trace de la simulation, une ligne par pas : « ● Entrée », « → <état> » (avec son passage, compté dès le 2e), et entre
 * deux pas la transition franchie « —[<nom>]→ » (« —→ » sans nom).
 */
export function simulationTrace(sim: StateSimulation): TraceLine[] {
  const seen = new Map<string, number>();
  const last = sim.steps.length;
  return sim.steps.flatMap((step, i): TraceLine[] => {
    const shape = shapeOf(sim.page, step.elementId)!;
    const count = (seen.get(shape.id) ?? 0) + 1;
    seen.set(shape.id, count);
    const name = stepName(shape);
    const lines: TraceLine[] = [];
    const target = sim.goToTarget(i + 1);
    if (step.via !== undefined) {
      const label = transitionName(edgeOf(sim.page, step.via));
      lines.push({ kind: 'transition', text: label ? `—[${label}]→` : '—→', ...(target !== undefined && { target }) });
    }
    const text = isInitial(shape) ? `● ${name}` : `→ ${name}`;
    const current = i + 1 === last;
    lines.push({ kind: 'step', text, count, current, ...(target !== undefined && !step.passed && { target }) });
    return lines;
  });
}
