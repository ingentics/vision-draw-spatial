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

/** Schémas d'URL qu'on accepte d'ouvrir (pas de `javascript:`, `data:`, `file:`…). */
const SAFE_URL = /^(https?:|mailto:)/i;

/**
 * Lien exploitable par le viewer : vers une page, ou vers une URL sûre.
 * Les autres liens restent dans le modèle (fidélité au fichier) mais ne sont ni signalés ni suivis.
 */
export function isNavigableLink(link: LinkModel | undefined): link is LinkModel {
  if (!link) return false;
  return link.type === 'page' || SAFE_URL.test(link.href);
}

/** Attribut `link` draw.io d'un lien du modèle (inverse de `parseLink`). */
export function formatLink(link: LinkModel): string {
  return link.type === 'page' ? `${PAGE_LINK_PREFIX}${link.pageId}` : link.href;
}
