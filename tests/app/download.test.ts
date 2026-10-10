import { describe, expect, it } from 'vitest';
import { baseName } from '../../src/app/download';

describe('nom de base d’un fichier téléchargé', () => {
  it('sans dossier ni extension', () => {
    expect(baseName('fixtures/simple.drawio')).toBe('simple');
    expect(baseName('a.b.drawio')).toBe('a.b');
    expect(baseName('sans-extension')).toBe('sans-extension');
  });
});
