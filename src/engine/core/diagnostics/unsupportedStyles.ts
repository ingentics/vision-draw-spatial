import type { DocumentModel } from '../model/types';
import { edgeUnsupported } from '../render/edges/support';
import type { ShapeRegistry } from '../../shapes/registry';

/**
 * Recensement des éléments non supportés d'un document (SPEC §8.4) : formes dessinées en
 * placeholder, styles d'arêtes approchés. Calculé sur tout le document (pas seulement les pages
 * affichées), trié par fréquence : c'est le backlog des formes à implémenter.
 */

export type UnsupportedCategory = 'shape' | 'edgeStyle' | 'startArrow' | 'endArrow';

export interface UnsupportedOccurrence {
  pageId: string;
  pageName: string;
  elementId: string;
  label: string;
}

export interface UnsupportedEntry {
  category: UnsupportedCategory;
  /** Nom de forme ou valeur du style (ex. `cube`, `isometricEdgeStyle`, `ERmandOne`). */
  name: string;
  count: number;
  /** Noms des pages concernées, dans l'ordre du document. */
  pages: string[];
  /** Premières occurrences (au plus `MAX_OCCURRENCES`), pour les retrouver dans le schéma. */
  occurrences: UnsupportedOccurrence[];
  /** Chaîne de style brute d'une occurrence, pour écrire le renderer. */
  sampleStyle: string;
}

export interface UnsupportedReport {
  entries: UnsupportedEntry[];
  /** Nombre total de formes et d'arêtes du document. */
  elementCount: number;
  /** Nombre d'éléments ayant au moins un point non supporté. */
  unsupportedElementCount: number;
}

export const MAX_OCCURRENCES = 50;

export function collectUnsupported(document: DocumentModel, registry: ShapeRegistry): UnsupportedReport {
  const entries = new Map<string, UnsupportedEntry>();
  let elementCount = 0;
  let unsupportedElementCount = 0;

  const record = (
    category: UnsupportedCategory,
    name: string,
    occurrence: UnsupportedOccurrence,
    styleString: string,
  ): void => {
    const key = `${category}:${name}`;
    let entry = entries.get(key);
    if (!entry) {
      entry = { category, name, count: 0, pages: [], occurrences: [], sampleStyle: styleString };
      entries.set(key, entry);
    }
    entry.count++;
    if (!entry.pages.includes(occurrence.pageName)) entry.pages.push(occurrence.pageName);
    if (entry.occurrences.length < MAX_OCCURRENCES) entry.occurrences.push(occurrence);
  };

  for (const page of document.pages) {
    const at = (elementId: string, label: string): UnsupportedOccurrence => ({
      pageId: page.id,
      pageName: page.name,
      elementId,
      label,
    });

    for (const shape of page.shapes) {
      elementCount++;
      if (!registry.resolve(shape).supported) {
        unsupportedElementCount++;
        record('shape', shape.kind, at(shape.id, shape.label), shape.raw.styleString);
      }
    }
    for (const edge of page.edges) {
      elementCount++;
      const problems = edgeUnsupported(edge.style);
      if (problems.length > 0) unsupportedElementCount++;
      for (const { category, name } of problems) record(category, name, at(edge.id, edge.label), edge.raw.styleString);
    }
  }

  const sorted = [...entries.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { entries: sorted, elementCount, unsupportedElementCount };
}
