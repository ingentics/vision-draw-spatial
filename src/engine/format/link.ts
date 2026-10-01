import type { LinkModel } from '../model/types';

const PAGE_LINK_PREFIX = 'data:page/id,';

/**
 * Interprète l'attribut `link` d'un objet draw.io (SPEC §7.2).
 * Les autres liens `data:` (actions draw.io) ne sont pas des liens navigables : ignorés.
 */
export function parseLink(href: string | null | undefined): LinkModel | undefined {
  const value = href?.trim();
  if (!value) return undefined;
  if (value.startsWith(PAGE_LINK_PREFIX)) {
    const pageId = value.slice(PAGE_LINK_PREFIX.length);
    return pageId ? { type: 'page', pageId } : undefined;
  }
  if (value.startsWith('data:')) return undefined;
  return { type: 'url', href: value };
}
