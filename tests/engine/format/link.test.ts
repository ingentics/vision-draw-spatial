import { describe, expect, it } from 'vitest';
import { parseLink } from '../../../src/engine/format/link';

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
