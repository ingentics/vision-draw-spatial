import { describe, expect, it } from 'vitest';
import { isNavigableLink, parseLink } from '../../../../src/engine/core/format/link';

describe('parseLink', () => {
  it('lien interne de page', () => {
    expect(parseLink('data:page/id,abc-123')).toEqual({ type: 'page', pageId: 'abc-123' });
  });

  it('URL externe', () => {
    expect(parseLink('https://example.com')).toEqual({ type: 'url', href: 'https://example.com' });
  });

  it('ignore vide, actions draw.io et page sans id', () => {
    expect(parseLink(undefined)).toBeUndefined();
    expect(parseLink('  ')).toBeUndefined();
    expect(parseLink('data:action/json,{}')).toBeUndefined();
    expect(parseLink('data:page/id,')).toBeUndefined();
  });
});

describe('isNavigableLink', () => {
  it('pages et URL web / mail uniquement', () => {
    expect(isNavigableLink({ type: 'page', pageId: 'p' })).toBe(true);
    expect(isNavigableLink({ type: 'url', href: 'https://example.com' })).toBe(true);
    expect(isNavigableLink({ type: 'url', href: 'mailto:a@b.c' })).toBe(true);
    expect(isNavigableLink({ type: 'url', href: 'javascript:alert(1)' })).toBe(false);
    expect(isNavigableLink({ type: 'url', href: 'file:///etc/passwd' })).toBe(false);
    expect(isNavigableLink(undefined)).toBe(false);
  });
});
