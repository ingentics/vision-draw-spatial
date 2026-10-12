import type { ModeKey, PageModeDefinition } from '../../../core/plugins';
import { edgeOf, isToggled, numberValue, styleNumber, toggleValue } from '../../../core/plugins';
import { STORY_KEYS } from './keys';
import { badgeStyle, currentLook, STORY_SETTINGS } from './settings';
import {
  COLOR,
  NUMBER,
  OF,
  repairStories,
  setStoryNumber,
  setStoryOf,
  startStory,
  stopStory,
  storyOf,
  storyState,
} from './stories';

/**
 * Mode « Story telling » (sujet 474) : une flèche numérotée (`spatial.story.number`) ouvre une histoire, les flèches
 * qui portent son id (`spatial.story.of`, sujet 541) la continuent. Dans draw.io, rien ne change.
 */
export const definition: PageModeDefinition = {
  id: 'storytelling',
  ...STORY_KEYS,
  name: 'Story telling',
  shortName: 'Histoires',
  description:
    'Histoires tracées par des flèches : une flèche numérotée ouvre une histoire, les suivantes la continuent',
  // Un acteur, puis une flèche qui porte une pastille.
  icon: {
    fill: 'M3.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM1.2 6.8a2.3 2.1 0 0 1 4.6 0z',
    line: 'M3.5 8.3V11.5',
    accent: 'M3.5 11.5H14.5M13.3 10.3l1.2 1.2-1.2 1.2M9 5.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z',
  },
  page: {
    // Flèches en ancrage automatique, tracées droites, posés au passage dans le mode.
    defaults: { anchoring: 'auto', edgeLine: 'straight' },
    // Fond uni, sans grille (sujet 537).
    grid: false,
    palette: { shapes: ['actor', 'actor-droid', 'rectangle', 'metamorph'] },
  },
  settings: STORY_SETTINGS,
  edges: {
    properties: [
      {
        type: 'toggle',
        key: 'start',
        label: 'Début d’histoire',
        title:
          'La flèche ouvre une histoire (spatial.story.number) : les flèches sans numéro qui partent de sa forme d’arrivée la continuent',
        value: (page, target) => toggleValue(storyOf(page, target.id) !== undefined),
        write: (edit, target, value) => (isToggled(value) ? startStory(edit, target.id) : stopStory(edit, target.id)),
      },
      {
        type: 'number',
        key: NUMBER,
        label: 'Numéro',
        title: 'Numéro de l’histoire (spatial.story.number) : échange avec l’histoire qui l’avait',
        value: (page, target) => String(storyOf(page, target.id)?.number ?? ''),
        write: (edit, target, value) => {
          if (value !== undefined) setStoryNumber(edit, target.id, Number(value));
        },
        hidden: (page, target) => storyOf(page, target.id) === undefined,
      },
      {
        type: 'choice',
        key: OF,
        label: 'Histoire',
        title: 'Histoire de la flèche (spatial.story.of) : elle la continue depuis la forme d’où elle part',
        options: (page) => [
          { value: '', label: 'Aucune' },
          ...storyState(page).stories.map((story) => ({
            value: story.id,
            label: `${story.number}. ${story.title}`,
            color: story.color,
          })),
        ],
        value: (page, target) => storyState(page).byEdge.get(target.id)?.id ?? '',
        write: (edit, target, value) => setStoryOf(edit, target.id, value || undefined),
        hidden: (page, target) => storyOf(page, target.id) !== undefined,
      },
    ],
    // Une flèche tirée depuis une forme continue l'histoire courante (sujet 541) ; sans histoire courante (Échap, clic
    // sur le fond), elle en ouvre une (sujet 540).
    created: (edit, edgeId, current) => {
      if (current === undefined) startStory(edit, edgeId);
      else setStoryOf(edit, edgeId, current);
    },
    // Flèche d'une histoire sélectionnée seule : ni voile ni contour, sa couleur la montre (comme Séquences).
    selectionStyle: (page, edge, size) => (size === 1 && storyState(page).byEdge.has(edge.id) ? 'none' : undefined),
  },
  dressing(page, values) {
    const { byEdge } = storyState(page);
    const width = numberValue(values, 'edgeWidth');
    return {
      // Toutes les flèches de la page : au moins l'épaisseur du mode, arrêtées à l'écart du mode avant les formes.
      edgeStyle: (edge) =>
        styleNumber(edge.style, 'strokeWidth', 1) < width ? { strokeWidth: String(width) } : undefined,
      edgeInset: numberValue(values, 'edgeGap'),
      edgeDarken: numberValue(values, 'edgeDarken'),
      edgeBadgeStyle: badgeStyle(values),
      edgeColor: (edge) => byEdge.get(edge.id)?.color,
      edgeBadge: (edge) => {
        const story = storyOf(page, edge.id);
        return story && { text: String(story.number), color: story.color };
      },
    };
  },
  // Histoire courante (valeur : sa flèche numérotée) : la première par défaut, celle d'une flèche cliquée, aucune
  // après Échap (sujet 540). Sans `color` : pas de barre en haut de la zone de dessin, Tab passe à l'histoire suivante
  // (`pageKeys`).
  current: {
    initial: (page) => storyState(page).stories[0]?.id,
    valid: (page, value) => storyOf(page, value) !== undefined,
    pick: (page, target) => storyState(page).byEdge.get(target.id)?.id,
    label: (page, value) => storyOf(page, value)?.title ?? value,
    values: (page) => storyState(page).stories.map((story) => story.id),
    look: currentLook,
    clearable: true,
    // Flèches de l'histoire et formes qu'elles relient.
    focus: (page, value) => {
      const story = storyOf(page, value);
      if (!story) return undefined;
      const ends = story.edges.flatMap((id) => {
        const edge = edgeOf(page, id);
        return [edge?.sourceId, edge?.targetId].filter((end) => end !== undefined);
      });
      return [...new Set([...story.edges, ...ends])];
    },
  },
  pageKeys: {
    Tab: {
      label: 'Histoire suivante',
      applies: (page) => storyState(page).stories.length > 1,
      run: (page, current) => {
        const { stories } = storyState(page);
        const index = stories.findIndex((story) => story.id === current);
        return stories[(index + 1) % stories.length]?.id;
      },
    },
  },
  keys: {
    // « + » : une flèche sans numéro ouvre une histoire (à la fin) ; une flèche numérotée passe au numéro suivant.
    '+': {
      label: 'Histoire',
      applies: (page, target) => edgeOf(page, target.id) !== undefined,
      run: (edit, target) => {
        const story = storyOf(edit.page, target.id);
        if (story) setStoryNumber(edit, target.id, story.number + 1);
        else startStory(edit, target.id);
      },
    },
    '-': numberKey(-1),
  },
  lifecycle: {
    check: (page) => storyState(page).issues,
    removed: repairStories,
  },
  pasteKeys: [NUMBER, COLOR, OF],
};

/** Numéro précédent / suivant de l'histoire ouverte par la flèche sélectionnée (échange avec la voisine). */
function numberKey(delta: 1 | -1): ModeKey {
  return {
    label: 'Numéro',
    applies: (page, target) => storyOf(page, target.id) !== undefined,
    run: (edit, target) => {
      const story = storyOf(edit.page, target.id);
      if (story) setStoryNumber(edit, target.id, story.number + delta);
    },
  };
}
