import { describe, expect, it } from 'vitest';
import { migrate } from '../../src/app/settingsStore';

describe('paramètres enregistrés : migrations', () => {
  it('version 3 : la touche ⌘ pour suivre un lien (ancien défaut) passe à Espace (ticket 121)', () => {
    expect(migrate({ version: 2, controls: { followLinkKey: 'meta' } }).controls?.followLinkKey).toBe('space');
    expect(migrate({ version: 2, controls: { followLinkKey: 'ctrl' } }).controls?.followLinkKey).toBe('ctrl');
    expect(migrate({ version: 3, controls: { followLinkKey: 'meta' } }).controls?.followLinkKey).toBe('meta');
  });
});
