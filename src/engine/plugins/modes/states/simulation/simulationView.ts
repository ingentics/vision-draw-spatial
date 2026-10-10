import type { EdgeModel, PageModel, ShapeModel } from '../../../../core/plugins';
import { edgeOf, elementName, shapeOf } from '../../../../core/plugins';
import { ERROR_COLOR, isErrorExit } from '../exits/exitKind';
import { isFinal, isInitial, isState } from '../kinds';
import type { SimulationEnd, StateSimulation } from './stateSimulation';

/**
 * Ce que l'appli montre d'une simulation de machine à états (sujets 462, 463) : contenu du pas courant pour la couche,
 * noms des pas, fin, trace.
 */

/** Ce que la couche montre d'un pas : ids de la page simulée. */
export interface StepLook {
  current: string;
  /** Ensembles qui contiennent l'élément courant : encadrés. */
  frames: string[];
  /** États visités et leurs passages : teintés, compteur dès 2. */
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
      return shape !== undefined && isState(shape);
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

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Bandeau de fin : texte et couleur. */
export const END_LABELS: Record<SimulationEnd, { text: string; color: string }> = {
  expected: { text: 'Terminé : sortie attendue', color: '#2e7d32' },
  error: { text: 'Terminé en erreur', color: ERROR_COLOR },
  blocked: { text: 'Bloqué : aucune transition sortante', color: '#ef6c00' },
};

/** Point d'entrée à choisir au départ, nommé par l'état où mène sa première transition. */
export function entryName(page: PageModel, entry: ShapeModel): string {
  const edge = [...page.edges].sort((a, b) => a.z - b.z).find((e) => e.sourceId === entry.id);
  const target = edge && shapeOf(page, edge.targetId);
  return target ? `Entrée vers « ${stepName(target)} »` : `Entrée ${entry.id}`;
}

/** Ligne de la trace : un pas (`step`, à partir de 1) ou la transition franchie pour y venir. */
export type TraceLine =
  | { kind: 'step'; step: number; text: string; count: number; current: boolean }
  | { kind: 'transition'; step: number; text: string };

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
    if (step.via !== undefined) {
      const label = transitionName(edgeOf(sim.page, step.via));
      lines.push({ kind: 'transition', step: i + 1, text: label ? `—[${label}]→` : '—→' });
    }
    const text = isInitial(shape) ? `● ${name}` : `→ ${name}`;
    lines.push({ kind: 'step', step: i + 1, text, count, current: i + 1 === last });
    return lines;
  });
}
