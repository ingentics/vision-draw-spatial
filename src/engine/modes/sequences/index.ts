import type { EdgeModel } from '../../model/types';
import type { ModeKey, PageModeDefinition } from '../types';
import { FLOW, PARTICIPANT, STEP } from './flows';
import { renameFlow, repairSequences, sequenceState, setEdgeFlow, setEdgeStep } from './steps';

/**
 * Mode « Séquences » (sujet 70) : la page enregistre des flux (`spatial.flows`) et l'ordre des flèches dans
 * chacun (`spatial.flow`, `spatial.step`), de quoi en déduire un diagramme de séquence par flux. Une flèche
 * appartient à un flux au plus ; ses rangs restent consécutifs. Dans draw.io, rien ne change.
 */
export const definition: PageModeDefinition = {
  id: 'sequences',
  name: 'Séquences',
  description: 'Flux ordonnés de flèches : couleur par flux et rang de chaque flèche',
  // Acteur et participant, leurs lignes de vie, un message et sa réponse en pointillé (sujet 197).
  icon:
    'M3 1a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM3 3.2v2M1.6 4h2.8M3 5.2 1.9 6.6M3 5.2l1.1 1.4M10.5 1.5h5v3h-5z' +
    'M3 8.2V15M13 6.2V15M3 9.6h10M11.3 8l1.7 1.6-1.7 1.6M13 13h-1.4M10.2 13H8.8M7.4 13H3M4.7 11.4 3 13l1.7 1.6',
  // Diagramme de séquence : lu à plat, en 2D seulement (sujet 193).
  viewModes: ['top'],
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
  shapeProperties: [
    {
      type: 'select',
      key: PARTICIPANT,
      label: 'Type',
      title:
        'Type de la forme dans les séquences (spatial.participant) : un bus ou une queue est le point de départ d’un flux dont la première flèche va vers lui',
      options: () => [
        { value: '', label: '—' },
        { value: 'bus', label: 'Bus' },
        { value: 'queue', label: 'Queue' },
      ],
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
    rename: (edit, value, label) => renameFlow(edit, value, label),
    // Flèches du flux et formes qu'elles relient ; flux sans flèche : rien d'estompé.
    focus: (page, value) => {
      const ids = sequenceState(page).members.get(value) ?? [];
      if (ids.length === 0) return undefined;
      const edges = page.edges.filter((edge) => ids.includes(edge.id));
      const ends = edges.flatMap((edge) => [edge.sourceId, edge.targetId]).filter((id) => id !== undefined);
      return [...new Set([...ids, ...ends])];
    },
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
