import type { EdgeModel } from '../../model/types';
import type { ModeKey, PageModeDefinition } from '../types';
import { FLOW, STEP } from './flows';
import { repairSequences, sequenceState, setEdgeFlow, setEdgeStep } from './steps';

/**
 * Mode « Séquences » (sujet 70) : la page enregistre des flux (`spatial.flows`) et l'ordre des flèches dans
 * chacun (`spatial.flow`, `spatial.step`), de quoi en déduire un diagramme de séquence par flux. Une flèche
 * appartient à un flux au plus ; ses rangs restent consécutifs. Dans draw.io, rien ne change.
 */
export const definition: PageModeDefinition = {
  id: 'sequences',
  name: 'Séquences',
  description: 'Flux ordonnés de flèches : couleur par flux et rang de chaque flèche',
  edgeProperties: [
    {
      type: 'select',
      key: FLOW,
      label: 'Flux',
      title: 'Flux de la flèche (spatial.flow) : elle se met à la fin du flux choisi',
      options: (page) => [
        { value: '', label: 'Aucun' },
        ...sequenceState(page).flows.map((flow) => ({
          value: flow.id,
          label: flow.title || flow.id,
          color: flow.color,
        })),
      ],
      value: (page, target) => sequenceState(page).placement.get(target.id)?.flowId,
      write: (edit, target, value) => setEdgeFlow(edit, target.id, value || undefined),
    },
    {
      type: 'number',
      key: STEP,
      label: 'Rang',
      title: 'Rang de la flèche dans son flux (spatial.step) : échange avec la flèche qui l’occupe',
      value: (page, target) => String(sequenceState(page).placement.get(target.id)?.step ?? ''),
      write: (edit, target, value) => {
        if (value !== undefined) setEdgeStep(edit, target.id, Number(value));
      },
      hidden: (page, target) => !sequenceState(page).placement.has(target.id),
    },
  ],
  dressing(page) {
    const state = sequenceState(page);
    const flowOf = (edge: EdgeModel) => {
      const placed = state.placement.get(edge.id);
      return placed && { placed, flow: state.flows.find((flow) => flow.id === placed.flowId)! };
    };
    return {
      edgeColor: (edge) => {
        const found = flowOf(edge);
        return found?.flow.color;
      },
      edgeBadge: (edge) => {
        const found = flowOf(edge);
        return found && { text: String(found.placed.step), color: found.flow.color };
      },
    };
  },
  // Flux courant : le premier flux par défaut, celui d'une flèche cliquée ; les nouvelles flèches y vont.
  current: {
    initial: (page) => sequenceState(page).flows[0]?.id,
    valid: (page, value) => sequenceState(page).members.has(value),
    pick: (page, target) => sequenceState(page).placement.get(target.id)?.flowId,
    color: (page, value) => sequenceState(page).flows.find((flow) => flow.id === value)?.color,
    label: (page, value) => {
      const flow = sequenceState(page).flows.find((f) => f.id === value);
      return flow?.title || value;
    },
    values: (page) => sequenceState(page).flows.map((flow) => flow.id),
  },
  edgeCreated: (edit, edgeId, current) => {
    if (current !== undefined) setEdgeFlow(edit, edgeId, current);
  },
  keys: {
    '+': stepKey(+1),
    '-': stepKey(-1),
  },
  check: (page) => sequenceState(page).issues,
  repair: repairSequences,
  pasteKeys: [FLOW, STEP],
};

/** « + » / « - » : rang suivant / précédent de la flèche sélectionnée (échange avec la voisine). */
function stepKey(delta: 1 | -1): ModeKey {
  return {
    label: 'Rang',
    applies: (page, target) => sequenceState(page).placement.has(target.id),
    run: (edit, target) => {
      const placed = sequenceState(edit.page).placement.get(target.id);
      if (placed) setEdgeStep(edit, target.id, placed.step + delta);
    },
  };
}
