import type { PageModel, ShapeModel } from '../../../../core/plugins';
import { groupLabel, stickyGroups, writtenLabel } from '../groups/stickyGroups';
import { keys, PIVOT } from '../keys';
import { ACTOR, COMMAND, CONSTRAINT, EVENT, HOTSPOT, POLICY, QUERY, stickyType, SYSTEM } from '../kinds';
import type { StickyType } from '../kinds';
import { WARNINGS } from '../stickyRules';
import type { WarningCode } from '../stickyRules';
import { byReading, readWall } from './wallRules';
import type { WallRule } from './wallRules';

/**
 * Export JSON du mur (sujet 518) : groupes, éléments, liens déduits des contacts et avertissements. Les règles sont dans
 * `wallRules.ts` ; ce fichier nomme les éléments (`G2.C3`, concept) et range le tout.
 */

/** Type exporté et préfixe d'id de chaque post-it. */
const EXPORTED = new Map<StickyType, { type: string; prefix: string }>([
  [ACTOR, { type: 'actor', prefix: 'A' }],
  [COMMAND, { type: 'command', prefix: 'C' }],
  [EVENT, { type: 'event', prefix: 'E' }],
  [POLICY, { type: 'policy', prefix: 'P' }],
  [SYSTEM, { type: 'system', prefix: 'S' }],
  [QUERY, { type: 'read_model', prefix: 'R' }],
  [HOTSPOT, { type: 'hotspot', prefix: 'H' }],
  [CONSTRAINT, { type: 'constraint', prefix: 'K' }],
]);

export interface WallElement {
  id: string;
  type: string;
  label: string;
  group: string | null;
  concept: string;
  /** Domain Event seulement (sujet 517) : `unknown` pour « Je ne sais pas », `null` sans réponse. */
  pivot?: boolean | 'unknown' | null;
}

export interface WallExport {
  groups: { id: string; label: string | null }[];
  elements: WallElement[];
  links: { from: string; to: string; type: string; rule: WallRule }[];
  warnings: { code: WarningCode; level: 'info' | 'attention'; elements: string[]; message: string }[];
}

/** Texte sur une ligne : retours à la ligne remplacés par un espace. */
const oneLine = (text: string) => text.replace(/\s*\n\s*/g, ' ').trim();

/** Texte normalisé d'un concept : minuscules, sans accents, ponctuation remplacée par des espaces. */
export function normalizedText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function pivotOf(shape: ShapeModel): WallElement['pivot'] {
  const value = keys.value(shape, PIVOT);
  return value === '1' ? true : value === '0' ? false : value === 'unknown' ? 'unknown' : null;
}

/** Modèle exporté de la page. */
export function wallExport(page: PageModel): WallExport {
  const groups = [...stickyGroups(page)].sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x);
  const grouped = new Set(groups.flatMap((group) => group.shapes.map((shape) => shape.id)));
  const isolated = page.shapes.filter((shape) => stickyType(shape) && !grouped.has(shape.id)).sort(byReading);

  const ids = new Map<string, string>();
  const elements: WallElement[] = [];
  const name = (shapes: readonly ShapeModel[], group: string | null) => {
    const ranks = new Map<StickyType, number>();
    for (const shape of shapes) {
      const sticky = stickyType(shape)!;
      const { type, prefix } = EXPORTED.get(sticky)!;
      const rank = (ranks.get(sticky) ?? 0) + 1;
      ranks.set(sticky, rank);
      const id = `${group ? `${group}.` : ''}${prefix}${rank}`;
      const label = oneLine(shape.label);
      ids.set(shape.id, id);
      elements.push({
        id,
        type,
        label,
        group,
        concept: `${type}:${normalizedText(label)}`,
        ...(sticky === EVENT ? { pivot: pivotOf(shape) } : {}),
      });
    }
  };
  groups.forEach((group, index) => name(group.shapes, `G${index + 1}`));
  name(isolated, null);

  const order = new Map(elements.map((element, index) => [element.id, index]));
  const rank = (shapeId: string) => order.get(ids.get(shapeId)!)!;
  const { links, warnings } = readWall(page);
  return {
    groups: groups.map((group, index) => ({
      id: `G${index + 1}`,
      label: group.shapes.some((shape) => writtenLabel(shape)) ? groupLabel(group) : null,
    })),
    elements,
    links: [...links]
      .sort((a, b) => rank(a.from) - rank(b.from) || rank(a.to) - rank(b.to))
      .map(({ from, to, type, rule }) => ({ from: ids.get(from)!, to: ids.get(to)!, type, rule })),
    warnings: [...warnings]
      .map((warning) => ({ ...warning, shapeIds: [...warning.shapeIds].sort((a, b) => rank(a) - rank(b)) }))
      .sort((a, b) => a.code.localeCompare(b.code) || rank(a.shapeIds[0]!) - rank(b.shapeIds[0]!))
      .map(({ code, shapeIds }) => ({
        code,
        level: WARNINGS[code].level,
        elements: shapeIds.map((id) => ids.get(id)!),
        message: WARNINGS[code].message,
      })),
  };
}

/** Export JSON de la page, pour la fenêtre d'export commune de l'appli (format et texte). */
export const eventStormingExporter = {
  id: 'json',
  name: 'JSON',
  export: (page: PageModel) => `${JSON.stringify(wallExport(page), null, 2)}\n`,
};
