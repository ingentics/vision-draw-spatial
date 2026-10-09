import type { EdgeModel, ModeKey, PageModeDefinition } from '../../../core/plugins';
import { byId, numberValue } from '../../../core/plugins';
import { FLOW, PARTICIPANT, STEP, flowLabel } from './flows';
import { SEQUENCES_KEYS } from './keys';
import { badgeStyle, currentLook, SEQUENCES_SETTINGS } from './settings';
import { renameFlow, repairSequences, sequenceState, setEdgeFlow, setEdgeStep } from './steps';

/** Icônes des types de participant (sujet 319), au style de celle du mode. */
const PARTICIPANT_ICONS = {
  // Boîte du participant et sa ligne de vie.
  none: { fill: 'M4.5 1.5h7a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z', line: 'M8 8V15.5' },
  // Barre du bus, branchements de part et d'autre.
  bus: { fill: 'M1 6.5h14v3H1z', accent: 'M4 6.5V3M8 6.5V3M12 6.5V3M4 9.5V13M8 9.5V13M12 9.5V13' },
  // Messages en file dans un tuyau, sortie à droite.
  queue: {
    fill: 'M2.5 6h2.5v4H2.5zM6.5 6h2.5v4H6.5zM10.5 6h2.5v4h-2.5z',
    line: 'M1 4.5h12.5M1 11.5h12.5',
    accent: 'M13.5 8h2M14.5 7l1 1-1 1',
  },
};

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
        type: 'choice',
        key: FLOW,
        label: 'Flux',
        title: 'Flux de la flèche (spatial.seq.flow) : elle se met à la fin du flux choisi',
        options: (page) => [
          { value: '', label: 'Aucun' },
          ...sequenceState(page).flows.map((flow) => ({
            value: flow.id,
            label: flowLabel(flow),
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
        type: 'choice',
        key: PARTICIPANT,
        label: 'Type',
        title:
          'Type de la forme dans les séquences (spatial.seq.participant) : un bus ou une queue est le point de départ d’un flux dont la première flèche va vers lui',
        options: () => [
          {
            value: '',
            label: '—',
            title: '— : participant ordinaire, une boîte et sa ligne de vie (rien n’est écrit)',
            icon: PARTICIPANT_ICONS.none,
          },
          {
            value: 'bus',
            label: 'Bus',
            title: 'Bus : bus d’événements, point de départ du flux dont la première flèche va vers lui (bus)',
            icon: PARTICIPANT_ICONS.bus,
          },
          {
            value: 'queue',
            label: 'Queue',
            title: 'Queue : file de messages, point de départ du flux dont la première flèche va vers elle (queue)',
            icon: PARTICIPANT_ICONS.queue,
          },
        ],
      },
    ],
  },
  settings: SEQUENCES_SETTINGS,
  dressing(page, values) {
    const state = sequenceState(page);
    const flowOf = (edge: EdgeModel) => {
      const placed = state.placement.get(edge.id);
      return placed && { placed, flow: byId(state.flows, placed.flowId)! };
    };
    return {
      edgeDarken: numberValue(values, 'edgeDarken'),
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
    color: (page, value) => byId(sequenceState(page).flows, value)?.color,
    label: (page, value) => {
      const flow = byId(sequenceState(page).flows, value);
      return flow ? flowLabel(flow) : value;
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
