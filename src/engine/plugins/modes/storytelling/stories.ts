import type { EdgeModel, ModeEdit, ModeIssue, PageModel } from '../../../core/plugins';
import { DEFAULT_MODE_PALETTE, clamp, edgeOf, isHexColor, shapeOf } from '../../../core/plugins';
import { keys } from './keys';

/**
 * Histoires d'une page (sujet 474) : une flèche numérotée (`spatial.story.number`) ouvre une histoire ; la suite est
 * calculée, jamais écrite : depuis la forme d'arrivée, la flèche sans numéro qui en part, et ainsi de suite.
 */

/** Numéro d'une flèche qui ouvre une histoire, à partir de 1. */
export const NUMBER = 'number';
/** Couleur de l'histoire (#rrggbb), choisie à sa création puis enregistrée sur sa flèche. */
export const COLOR = 'color';

export interface Story {
  /** Flèche numérotée qui ouvre l'histoire : identifiant stable (le numéro, lui, change). */
  id: string;
  number: number;
  /** Texte de la flèche sur une ligne, sinon « Histoire N ». */
  title: string;
  color: string;
  /** Flèches de l'histoire dans l'ordre de la suite, la flèche numérotée en tête. */
  edges: string[];
}

/** État remis en ordre au mieux : numéros consécutifs 1…n (trous, doublons, illisibles : triés puis renumérotés). */
export interface StoryState {
  stories: Story[];
  /** Histoires de chaque flèche, par numéro (une flèche sans numéro peut être dans plusieurs). */
  byEdge: Map<string, Story[]>;
  issues: ModeIssue[];
}

/** Texte sur une ligne : retours à la ligne remplacés par un espace. */
export const oneLine = (text: string): string => text.replace(/\s*\n\s*/g, ' ').trim();

const states = new WeakMap<PageModel, StoryState>();

export function storyState(page: PageModel): StoryState {
  let state = states.get(page);
  if (!state) {
    state = computeState(page);
    states.set(page, state);
  }
  return state;
}

/** La flèche porte-t-elle un numéro (même illisible) ? */
const isNumbered = (edge: EdgeModel) => Boolean(keys.value(edge, NUMBER)?.trim());

function computeState(page: PageModel): StoryState {
  const issues: ModeIssue[] = [];
  const starters = page.edges
    .filter(isNumbered)
    .map((edge) => {
      const number = keys.number(edge, NUMBER);
      return { edge, number: number !== undefined && Number.isInteger(number) && number >= 1 ? number : undefined };
    })
    .sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity) || a.edge.z - b.edge.z);
  if (starters.some((starter, i) => starter.number !== i + 1)) {
    issues.push({ message: 'Numéros des histoires remis en ordre (trous, doublons ou illisibles)' });
  }

  // Flèches sans numéro qui partent de chaque forme, dans l'ordre de dessin.
  const outgoing = new Map<string, EdgeModel[]>();
  for (const edge of [...page.edges].sort((a, b) => a.z - b.z)) {
    if (edge.sourceId === undefined || isNumbered(edge)) continue;
    outgoing.set(edge.sourceId, [...(outgoing.get(edge.sourceId) ?? []), edge]);
  }

  const colors: string[] = [];
  const stories = starters.map(({ edge }, i): Story => {
    const written = keys.value(edge, COLOR);
    const color = written && isHexColor(written) ? written.toLowerCase() : nextColor(colors);
    colors.push(color);
    const title = oneLine(edge.label) || `Histoire ${i + 1}`;
    return { id: edge.id, number: i + 1, title, color, edges: [edge.id] };
  });

  for (const story of stories) {
    let shapeId = edgeOf(page, story.id)!.targetId;
    while (shapeId !== undefined) {
      const next = outgoing.get(shapeId) ?? [];
      if (next.length === 0) break;
      if (next.length > 1) {
        const shape = shapeOf(page, shapeId);
        const name = oneLine(shape?.label ?? '') || shapeId;
        issues.push({
          cellId: shapeId,
          message: `Histoire « ${story.title} » : plusieurs flèches partent de « ${name} », seule la première est suivie`,
        });
      }
      const edge = next[0]!;
      // Boucle : on revient sur une flèche déjà dans l'histoire.
      if (story.edges.includes(edge.id)) break;
      story.edges.push(edge.id);
      shapeId = edge.targetId;
    }
  }

  const byEdge = new Map<string, Story[]>();
  for (const story of stories) {
    for (const id of story.edges) byEdge.set(id, [...(byEdge.get(id) ?? []), story]);
  }
  return { stories, byEdge, issues };
}

/** Couleur d'une nouvelle histoire : la première de la suite qui n'est pas prise, sinon la suite reprend. */
function nextColor(used: readonly string[], palette: readonly string[] = DEFAULT_MODE_PALETTE): string {
  const colors = palette.length > 0 ? palette : DEFAULT_MODE_PALETTE;
  return colors.find((color) => !used.includes(color)) ?? colors[used.length % colors.length]!;
}

/** Histoire ouverte par la flèche (elle porte un numéro). */
export const storyOf = (page: PageModel, edgeId: string): Story | undefined =>
  storyState(page).stories.find((story) => story.id === edgeId);

// ---------------------------------------------------------------------------
// Opérations (une étape d'annulation chacune, via `ModeEdit`)

/** Une flèche sans numéro ouvre une nouvelle histoire, à la fin (numéro n + 1), dans la première couleur libre. */
export function startStory(edit: ModeEdit, edgeId: string): void {
  const { stories } = storyState(edit.page);
  const edge = edgeOf(edit.page, edgeId);
  if (!edge || isNumbered(edge)) return;
  const color = nextColor(
    stories.map((story) => story.color),
    edit.palette,
  );
  writeOrder(edit, [...stories, { id: edgeId, color }]);
}

/** La flèche n'ouvre plus d'histoire : numéro et couleur retirés, les suivantes se resserrent. */
export function stopStory(edit: ModeEdit, edgeId: string): void {
  const { stories } = storyState(edit.page);
  if (!stories.some((story) => story.id === edgeId)) return;
  edit.setElementAttribute(edgeId, NUMBER, undefined);
  edit.setElementAttribute(edgeId, COLOR, undefined);
  writeOrder(
    edit,
    stories.filter((story) => story.id !== edgeId),
  );
}

/** Numéro d'une histoire (borné à 1…n) : elle échange sa place avec l'histoire qui l'avait ; couleurs inchangées. */
export function setStoryNumber(edit: ModeEdit, edgeId: string, number: number): void {
  const order = [...storyState(edit.page).stories];
  const from = order.findIndex((story) => story.id === edgeId);
  if (from < 0 || !Number.isFinite(number)) return;
  const to = clamp(Math.round(number), 1, order.length) - 1;
  [order[from], order[to]] = [order[to]!, order[from]!];
  writeOrder(edit, order);
}

/** Écrit l'état remis en ordre (après une suppression, ou un fichier modifié à la main). */
export function repairStories(edit: ModeEdit): void {
  writeOrder(edit, storyState(edit.page).stories);
}

/** Écrit numéro (1…n dans l'ordre donné) et couleur de chaque histoire ; seules les valeurs qui changent. */
function writeOrder(edit: ModeEdit, order: readonly Pick<Story, 'id' | 'color'>[]): void {
  order.forEach(({ id, color }, i) => {
    edit.setElementAttribute(id, NUMBER, String(i + 1));
    edit.setElementAttribute(id, COLOR, color);
  });
}
