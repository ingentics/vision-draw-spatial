import { unionOf } from '../../../../core/plugins';
import type { PageModel, Rect, ShapeModel } from '../../../../core/plugins';
import { contacts } from '../contacts/contacts';
import { GROUP, keys } from '../keys';
import { isSticky } from '../kinds';

/**
 * Groupes de post-it (sujet 514) : post-it reliés de proche en proche par des contacts bord à bord (un chevauchement
 * ne relie pas). Un groupe compte au moins deux post-it ; il porte un titre au-dessus de lui, aligné sur son bord
 * gauche, dont le libellé est enregistré sur chacun de ses post-it (`spatial.es.group`).
 */

/** Libellé d'un groupe sans libellé écrit. */
export const DEFAULT_GROUP_LABEL = 'Group label';

/** Titre : texte gras, sur une ligne, à `gap` au-dessus du post-it le plus haut. */
export const GROUP_TITLE = { fontSize: 22, lineHeight: 1.2, gap: 12, color: '#757575' } as const;

export interface StickyGroup {
  /** Post-it du groupe, du plus haut au plus bas, puis de gauche à droite : le premier tient le titre. */
  shapes: ShapeModel[];
  bounds: Rect;
  /** Zone du titre : sur la largeur du groupe, au-dessus de lui. */
  title: Rect;
}

const byPlace = (a: ShapeModel, b: ShapeModel) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x;

/** Composantes reliées des post-it de la page, par union des contacts. */
function components(page: PageModel): ShapeModel[][] {
  const stickies = page.shapes.filter(isSticky);
  const parent = new Map(stickies.map((shape) => [shape.id, shape.id]));
  const root = (id: string): string => {
    const up = parent.get(id)!;
    return up === id ? id : root(up);
  };
  for (const { a, b } of contacts(page).contacts) parent.set(root(a.shapeId), root(b.shapeId));
  const byRoot = new Map<string, ShapeModel[]>();
  for (const shape of stickies) byRoot.set(root(shape.id), [...(byRoot.get(root(shape.id)) ?? []), shape]);
  return [...byRoot.values()];
}

/** Groupes calculés une fois par page (modèle relu à chaque modification). */
const CACHE = new WeakMap<PageModel, StickyGroup[]>();

/** Groupes de la page (deux post-it au moins). */
export function stickyGroups(page: PageModel): StickyGroup[] {
  const cached = CACHE.get(page);
  if (cached) return cached;
  const height = GROUP_TITLE.fontSize * GROUP_TITLE.lineHeight;
  const groups = components(page)
    .filter((shapes) => shapes.length > 1)
    .map((shapes) => {
      const sorted = [...shapes].sort(byPlace);
      const bounds = unionOf(sorted.map((shape) => shape.bounds))!;
      const title = { x: bounds.x, y: bounds.y - GROUP_TITLE.gap - height, width: bounds.width, height };
      return { shapes: sorted, bounds, title };
    });
  CACHE.set(page, groups);
  return groups;
}

/** Groupe du post-it `shapeId`, s'il en a un. */
export const groupOf = (page: PageModel, shapeId: string): StickyGroup | undefined =>
  stickyGroups(page).find((group) => group.shapes.some((shape) => shape.id === shapeId));

/** Libellé écrit sur ce post-it (vide = aucun). */
export const writtenLabel = (shape: ShapeModel): string | undefined => keys.value(shape, GROUP)?.trim() || undefined;

/** Libellé du groupe : le premier écrit sur ses post-it (dans l'ordre du groupe), sinon celui par défaut. */
export function groupLabel(group: StickyGroup): string {
  for (const shape of group.shapes) {
    const label = writtenLabel(shape);
    if (label) return label;
  }
  return DEFAULT_GROUP_LABEL;
}
