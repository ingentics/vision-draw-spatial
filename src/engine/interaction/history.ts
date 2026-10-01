import type { DocumentModel, Rect } from '../model/types';
import type { CameraState } from './camera';

/**
 * Historique de navigation par liens (SPEC §11.3).
 *
 * - Pile : chaque transition par un lien empile d'où l'on vient (page, forme, caméra d'avant).
 * - Pile vide : on remonte vers une page « parente », c'est-à-dire une page qui a un lien vers
 *   la page courante, triées par usage récent des liens.
 */

export interface HistoryEntry {
  /** Page d'origine du lien. */
  pageId: string;
  /** Élément cliqué (forme ou arête). */
  elementId: string;
  /** Emprise de l'élément sur la page d'origine : cadre de la transition inverse. */
  frame?: Rect;
  /** Caméra de la page d'origine juste avant de suivre le lien. */
  camera: CameraState;
  /** Page atteinte par le lien. */
  targetPageId: string;
}

export class NavigationHistory {
  private stack: HistoryEntry[] = [];

  push(entry: HistoryEntry): void {
    this.stack.push(entry);
  }

  pop(): HistoryEntry | undefined {
    return this.stack.pop();
  }

  peek(): HistoryEntry | undefined {
    return this.stack[this.stack.length - 1];
  }

  get size(): number {
    return this.stack.length;
  }

  entries(): HistoryEntry[] {
    return structuredClone(this.stack);
  }

  replace(entries: HistoryEntry[]): void {
    this.stack = structuredClone(entries);
  }

  clear(): void {
    this.stack = [];
  }
}

/** Dernière utilisation de chaque lien entre pages : `from>to` → horodatage (ms). */
export type LinkUsage = Record<string, number>;

export function usageKey(fromPageId: string, toPageId: string): string {
  return `${fromPageId}>${toPageId}`;
}

export interface ParentLink {
  pageId: string;
  pageName: string;
  /** Premier élément de la page parente qui pointe vers la page courante. */
  elementId: string;
  frame?: Rect;
  lastUsedAt?: number;
}

/**
 * Pages ayant au moins un lien vers `pageId` (hors elle-même), la plus récemment utilisée
 * en premier, puis dans l'ordre du document.
 */
export function findParents(document: DocumentModel, pageId: string, usage: LinkUsage = {}): ParentLink[] {
  const parents: ParentLink[] = [];
  document.pages.forEach((page) => {
    if (page.id === pageId) return;
    const shape = page.shapes.find((s) => s.link?.type === 'page' && s.link.pageId === pageId);
    const edge = shape ? undefined : page.edges.find((e) => e.link?.type === 'page' && e.link.pageId === pageId);
    const element = shape ?? edge;
    if (!element) return;
    parents.push({
      pageId: page.id,
      pageName: page.name,
      elementId: element.id,
      frame: shape?.bounds,
      lastUsedAt: usage[usageKey(page.id, pageId)],
    });
  });
  const order = new Map(parents.map((p, i) => [p.pageId, i]));
  return parents.sort(
    (a, b) => (b.lastUsedAt ?? -1) - (a.lastUsedAt ?? -1) || order.get(a.pageId)! - order.get(b.pageId)!,
  );
}
