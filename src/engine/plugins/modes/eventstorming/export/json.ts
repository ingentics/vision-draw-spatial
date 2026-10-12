import type { PageModel, ShapeModel } from '../../../../core/plugins';
import { jsonExporter, oneLine } from '../../../../core/plugins';
import { groupLabel, stickyGroups, writtenLabel } from '../groups/stickyGroups';
import { EVENT, stickyType } from '../kinds';
import { pivotOf } from '../pivot/pivot';
import type { StickyType } from '../kinds';
import { WARNINGS } from '../stickyRules';
import type { WarningCode } from '../stickyRules';
import { byReading } from '../readingOrder';
import { readWall } from './wallRules';
import type { WallLinkType, WallRule } from './wallRules';

/**
 * Export JSON du mur (sujet 518) : groupes, éléments, liens déduits des contacts et avertissements. Les règles sont dans
 * `wallRules.ts` ; ce fichier nomme les éléments (`G2.C3`, concept) et range le tout.
 */

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
  links: { from: string; to: string; type: WallLinkType; rule: WallRule }[];
  warnings: { code: WarningCode; level: 'info' | 'attention'; elements: string[]; message: string }[];
}

/** Texte normalisé d'un concept : minuscules, sans accents, ponctuation remplacée par des espaces. */
export function normalizedText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function exportedPivot(shape: ShapeModel): WallElement['pivot'] {
  const pivot = pivotOf(shape);
  return pivot === 'yes' ? true : pivot === 'no' ? false : (pivot ?? null);
}

/** Modèle exporté de la page. */
export function wallExport(page: PageModel): WallExport {
  const groups = [...stickyGroups(page)].sort(byReading);
  const grouped = new Set(groups.flatMap((group) => group.shapes.map((shape) => shape.id)));
  const isolated = page.shapes.filter((shape) => stickyType(shape) && !grouped.has(shape.id)).sort(byReading);

  const ids = new Map<string, string>();
  const elements: WallElement[] = [];
  const name = (shapes: readonly ShapeModel[], group: string | null) => {
    const ranks = new Map<StickyType, number>();
    for (const shape of shapes) {
      const sticky = stickyType(shape)!;
      const { type, prefix } = sticky.exported;
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
        ...(sticky === EVENT ? { pivot: exportedPivot(shape) } : {}),
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
export const eventStormingExporter = jsonExporter(wallExport);
