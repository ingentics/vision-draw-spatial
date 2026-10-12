import type { EdgeModel, ModeEdit, ModeIssue, PageModel } from '../../../core/plugins';
import {
  byId,
  clamp,
  DEFAULT_MODE_PALETTE,
  edgeOf,
  isHexColor,
  oneLine,
  pageMemo,
  shapeOf,
} from '../../../core/plugins';
import { keys } from './keys';

/**
 * Histoires d'une page (sujet 474) : une flèche numérotée (`spatial.story.number`) ouvre une histoire ; chaque flèche
 * de la suite porte l'histoire à laquelle elle appartient (`spatial.story.of`, sujet 541) : une flèche n'est que dans
 * une histoire.
 */

/** Numéro d'une flèche qui ouvre une histoire, à partir de 1. */
export const NUMBER = 'number';
/** Couleur de l'histoire (#rrggbb), choisie à sa création puis enregistrée sur sa flèche. */
export const COLOR = 'color';
/** Histoire d'une flèche sans numéro : id de la flèche numérotée qui l'ouvre (sujet 541). */
export const OF = 'of';

export interface Story {
  /** Flèche numérotée qui ouvre l'histoire : identifiant stable (le numéro, lui, change). */
  id: string;
  number: number;
  /**
   * Textes des étapes à la suite (sujet 541) : forme de départ, puis chaque flèche et sa forme d'arrivée, chacun sur une
   * ligne, séparés par une espace, les vides omis ; sans aucun texte : « Histoire N ».
   */
  title: string;
  color: string;
  /** Flèches de l'histoire dans l'ordre de la suite, la flèche numérotée en tête. */
  edges: string[];
}

/** État remis en ordre au mieux : numéros consécutifs 1…n (trous, doublons, illisibles : triés puis renumérotés). */
export interface StoryState {
  stories: Story[];
  /** Histoire de chaque flèche. */
  byEdge: Map<string, Story>;
  issues: ModeIssue[];
}

/** État des histoires, calculé une fois par page (refait à chaque image d'un geste, sujet 552). */
export const storyState = pageMemo(computeState);

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

  const colors: string[] = [];
  const stories = starters.map(({ edge }, i): Story => {
    const written = keys.value(edge, COLOR);
    const color = written && isHexColor(written) ? written.toLowerCase() : nextColor(colors);
    colors.push(color);
    return { id: edge.id, number: i + 1, title: '', color, edges: [edge.id] };
  });

  // Flèches sans numéro de chaque histoire, dans l'ordre de dessin.
  const members = new Map<string, EdgeModel[]>();
  for (const edge of [...page.edges].sort((a, b) => a.z - b.z)) {
    const of = keys.value(edge, OF);
    if (of === undefined || isNumbered(edge)) continue;
    if (!byId(stories, of)) {
      issues.push({ cellId: edge.id, message: `Flèche « ${edgeName(edge)} » : son histoire n’existe plus` });
      continue;
    }
    members.set(of, [...(members.get(of) ?? []), edge]);
  }

  for (const story of stories) {
    const own = members.get(story.id) ?? [];
    // Branches non suivies : déjà signalées par leur forme de départ.
    const branches = new Set<string>();
    // Le fil : depuis la forme d'arrivée, la flèche de l'histoire qui en part, et ainsi de suite.
    let shapeId = edgeOf(page, story.id)!.targetId;
    while (shapeId !== undefined) {
      const next = own.filter((edge) => edge.sourceId === shapeId && !story.edges.includes(edge.id));
      if (next.length === 0) break;
      if (next.length > 1) {
        const name = oneLine(shapeOf(page, shapeId)?.label ?? '') || shapeId;
        issues.push({
          cellId: shapeId,
          message: `Histoire ${story.number} : plusieurs de ses flèches partent de « ${name} », seule la première est suivie`,
        });
        for (const branch of next.slice(1)) branches.add(branch.id);
      }
      const edge = next[0]!;
      story.edges.push(edge.id);
      shapeId = edge.targetId;
    }
    // Flèches de l'histoire hors du fil : à la fin, dans l'ordre de dessin.
    for (const edge of own) {
      if (story.edges.includes(edge.id)) continue;
      story.edges.push(edge.id);
      if (branches.has(edge.id)) continue;
      issues.push({
        cellId: edge.id,
        message: `Histoire ${story.number} : la flèche « ${edgeName(edge)} » ne suit pas les précédentes`,
      });
    }
  }

  for (const story of stories) story.title = storyTitle(page, story);

  const byEdge = new Map<string, Story>();
  for (const story of stories) {
    for (const id of story.edges) byEdge.set(id, story);
  }
  return { stories, byEdge, issues };
}

const edgeName = (edge: EdgeModel) => oneLine(edge.label) || edge.id;

/** Titre d'une histoire : textes de ses étapes à la suite (`Story.title`). */
function storyTitle(page: PageModel, story: Story): string {
  const label = (shapeId: string | undefined) => (shapeId === undefined ? '' : (shapeOf(page, shapeId)?.label ?? ''));
  const edges = story.edges.map((id) => edgeOf(page, id)!);
  const texts = [label(edges[0]!.sourceId), ...edges.flatMap((edge) => [edge.label, label(edge.targetId)])];
  return texts.map(oneLine).filter(Boolean).join(' ') || `Histoire ${story.number}`;
}

/** Couleur d'une nouvelle histoire : la première de la suite qui n'est pas prise, sinon la suite reprend. */
function nextColor(used: readonly string[], palette: readonly string[] = DEFAULT_MODE_PALETTE): string {
  const colors = palette.length > 0 ? palette : DEFAULT_MODE_PALETTE;
  return colors.find((color) => !used.includes(color)) ?? colors[used.length % colors.length]!;
}

/** Histoire ouverte par la flèche (elle porte un numéro). */
export const storyOf = (page: PageModel, edgeId: string): Story | undefined => byId(storyState(page).stories, edgeId);

// ---------------------------------------------------------------------------
// Opérations (une étape d'annulation chacune, via `ModeEdit`)

/** Une flèche sans numéro ouvre une nouvelle histoire, à la fin (numéro n + 1), dans la première couleur libre. */
export function startStory(edit: ModeEdit, edgeId: string): void {
  const { stories } = storyState(edit.page);
  const edge = edgeOf(edit.page, edgeId);
  if (!edge || isNumbered(edge)) return;
  edit.setElementAttribute(edgeId, OF, undefined);
  const color = nextColor(
    stories.map((story) => story.color),
    edit.palette,
  );
  writeOrder(edit, [...stories, { id: edgeId, color }]);
}

/**
 * La flèche n'ouvre plus d'histoire : numéro et couleur retirés, ses flèches n'ont plus d'histoire, les suivantes se
 * resserrent.
 */
export function stopStory(edit: ModeEdit, edgeId: string): void {
  const { stories } = storyState(edit.page);
  const story = byId(stories, edgeId);
  if (!story) return;
  for (const id of story.edges) edit.setElementAttribute(id, OF, undefined);
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

/** Histoire d'une flèche sans numéro (id de sa flèche numérotée) ; undefined : plus d'histoire. */
export function setStoryOf(edit: ModeEdit, edgeId: string, storyId: string | undefined): void {
  const edge = edgeOf(edit.page, edgeId);
  if (!edge || isNumbered(edge)) return;
  if (storyId !== undefined && !byId(storyState(edit.page).stories, storyId)) return;
  edit.setElementAttribute(edgeId, OF, storyId);
}

/**
 * Écrit l'état remis en ordre (après une suppression, ou un fichier modifié à la main) : numéros, couleurs, et plus
 * d'histoire pour une flèche dont l'histoire n'existe plus.
 */
export function repairStories(edit: ModeEdit): void {
  const { stories } = storyState(edit.page);
  for (const edge of edit.page.edges) {
    const of = keys.value(edge, OF);
    if (of !== undefined && (isNumbered(edge) || !byId(stories, of))) edit.setElementAttribute(edge.id, OF, undefined);
  }
  writeOrder(edit, stories);
}

/** Écrit numéro (1…n dans l'ordre donné) et couleur de chaque histoire ; seules les valeurs qui changent. */
function writeOrder(edit: ModeEdit, order: readonly Pick<Story, 'id' | 'color'>[]): void {
  order.forEach(({ id, color }, i) => {
    edit.setElementAttribute(id, NUMBER, String(i + 1));
    edit.setElementAttribute(id, COLOR, color);
  });
}
