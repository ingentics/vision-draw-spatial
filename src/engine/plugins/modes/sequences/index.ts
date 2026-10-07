import type { EdgeModel, ModeKey, PageModeDefinition } from '../../../core/plugins';
import { FLOW, PARTICIPANT, SEQUENCES_KEYS, STEP } from './flows';
import { badgeStyle, currentLook, SEQUENCES_SETTINGS } from './settings';
import { renameFlow, repairSequences, sequenceState, setEdgeFlow, setEdgeStep } from './steps';

/**
 * Mode « Séquences » (sujet 70) : la page enregistre des flux (`spatial.seq.flows`) et l'ordre des flèches dans
 * chacun (`spatial.seq.flow`, `spatial.seq.step`), de quoi en déduire un diagramme de séquence par flux. Une flèche
 * appartient à un flux au plus ; ses rangs restent consécutifs. Dans draw.io, rien ne change.
 */
export const definition: PageModeDefinition = {
  id: 'sequences',
  ...SEQUENCES_KEYS,
  name: 'Séquences',
  description: 'Flux ordonnés de flèches : couleur par flux et rang de chaque flèche',
  // Acteur et participant pleins, lignes de vie en pointillé, message et réponse en accent, fins et à distance des
  // lignes de vie (sujets 197 à 199).
  icon: {
    fill:
      'M3.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM1.2 6.8a2.3 2.1 0 0 1 4.6 0z' +
      'M10.5 2.2h4a1 1 0 0 1 1 1v2.6a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V3.2a1 1 0 0 1 1-1z',
    line: 'M3.5 8.3V15.5M12.5 8.3V15.5',
    accent: 'M4.7 10h6.6M10.2 8.9l1.1 1.1-1.1 1.1M11.3 13.5h-1M9.3 13.5h-1M7.3 13.5H4.7M5.8 12.4l-1.1 1.1 1.1 1.1',
  },
  // Diagramme de séquence : lu à plat, en 2D seulement (sujet 193).
  page: { viewModes: ['top'] },
  edges: {
    properties: [
      {
        type: 'select',
        key: FLOW,
        label: 'Flux',
        title: 'Flux de la flèche (spatial.seq.flow) : elle se met à la fin du flux choisi',
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
        title: 'Rang de la flèche dans son flux (spatial.seq.step) : échange avec la flèche qui l’occupe',
        value: (page, target) => String(sequenceState(page).placement.get(target.id)?.step ?? ''),
        write: (edit, target, value) => {
          if (value !== undefined) setEdgeStep(edit, target.id, Number(value));
        },
        hidden: (page, target) => !sequenceState(page).placement.has(target.id),
      },
    ],
    // Une flèche tirée depuis une forme va dans le flux courant.
    created: (edit, edgeId, current) => {
      if (current !== undefined) setEdgeFlow(edit, edgeId, current);
    },
  },
  gestures: {
    properties: [
      {
        type: 'select',
        key: PARTICIPANT,
        label: 'Type',
        title:
          'Type de la forme dans les séquences (spatial.seq.participant) : un bus ou une queue est le point de départ d’un flux dont la première flèche va vers lui',
        options: () => [
          { value: '', label: '—' },
          { value: 'bus', label: 'Bus' },
          { value: 'queue', label: 'Queue' },
        ],
      },
    ],
  },
  settings: SEQUENCES_SETTINGS,
  dressing(page, values) {
    const state = sequenceState(page);
    const flowOf = (edge: EdgeModel) => {
      const placed = state.placement.get(edge.id);
      return placed && { placed, flow: state.flows.find((flow) => flow.id === placed.flowId)! };
    };
    return {
      edgeDarken: values.edgeDarken as number,
      edgeBadgeStyle: badgeStyle(values),
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
    look: currentLook,
    // Flèches du flux et formes qu'elles relient ; flux sans flèche : rien d'estompé.
    focus: (page, value) => {
      const ids = sequenceState(page).members.get(value) ?? [];
      if (ids.length === 0) return undefined;
      const edges = page.edges.filter((edge) => ids.includes(edge.id));
      const ends = edges.flatMap((edge) => [edge.sourceId, edge.targetId]).filter((id) => id !== undefined);
      return [...new Set([...ids, ...ends])];
    },
  },
  keys: {
    '+': stepKey(+1),
    '-': stepKey(-1),
  },
  lifecycle: {
    check: (page) => sequenceState(page).issues,
    removed: repairSequences,
  },
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
