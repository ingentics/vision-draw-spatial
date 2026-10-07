import { describe, expect, it } from 'vitest';
import { migrate } from '../../src/app/settingsStore';

describe('paramètres enregistrés : migrations', () => {
  it('version 3 : la touche ⌘ pour suivre un lien (ancien défaut) passe à Espace (ticket 121)', () => {
    expect(migrate({ version: 2, controls: { followLinkKey: 'meta' } }).controls?.followLinkKey).toBe('space');
    expect(migrate({ version: 2, controls: { followLinkKey: 'ctrl' } }).controls?.followLinkKey).toBe('ctrl');
    expect(migrate({ version: 3, controls: { followLinkKey: 'meta' } }).controls?.followLinkKey).toBe('meta');
  });

  it('version 4 : les tirets du contour à 12 px/s (ancien défaut) passent à 4 (ticket 257)', () => {
    expect(migrate({ version: 3, selection: { speed: 12 } }).selection?.speed).toBe(4);
    expect(migrate({ version: 3, selection: { speed: 30 } }).selection?.speed).toBe(30);
    expect(migrate({ version: 4, selection: { speed: 12 } }).selection?.speed).toBe(12);
  });

  it('version 5 : les réglages de modes changés passent de `shapes` à `modes.<id>` (ticket 283)', () => {
    const stored = { version: 4, shapes: { modeObstacleGap: 30, modeDimOpacity: 0.3, edgeBadgeBold: true } };
    // L'écart et le gras avaient changé ; l'opacité est au défaut : rien à reprendre.
    expect(migrate(stored as never).modes).toEqual({ rdd: { obstacleGap: 30 }, sequences: { badgeBold: true } });
    expect(migrate({ version: 4, shapes: {} }).modes).toBeUndefined();
    expect(migrate({ version: 5, shapes: { modeObstacleGap: 30 } } as never).modes).toBeUndefined();
  });
});
