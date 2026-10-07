import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../../src/engine/core/format/parse';
import { createEmptyDrawio } from '../../../../src/engine/core/format/skeleton';

describe('createEmptyDrawio', () => {
  it('produit un fichier draw.io valide : une page vide, le calque par défaut', () => {
    const doc = parseDrawio(createEmptyDrawio());
    expect(doc.warnings).toEqual([]);
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0]).toMatchObject({ name: 'Page-1', shapes: [], edges: [], layers: [{ id: '1', visible: true }] });
    expect(doc.pages[0]!.id).toMatch(/^[A-Za-z0-9_-]{20}$/);
  });

  it('échappe le nom de page et génère un id différent à chaque fois', () => {
    expect(parseDrawio(createEmptyDrawio('A & "B"')).pages[0]!.name).toBe('A & "B"');
    expect(parseDrawio(createEmptyDrawio()).pages[0]!.id).not.toBe(parseDrawio(createEmptyDrawio()).pages[0]!.id);
  });
});
