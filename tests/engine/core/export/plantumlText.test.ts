import { describe, expect, it } from 'vitest';
import { plantUmlLine, plantUmlQuoted } from '../../../../src/engine/core/export/plantumlText';

describe('texte PlantUML commun aux modes (sujet 439)', () => {
  it('plantUmlLine : retours à la ligne en \\n, espaces des bords retirés', () => {
    expect(plantUmlLine('  Accumulate Enough Data\nLong State Name\r\nfin ')).toBe(
      'Accumulate Enough Data\\nLong State Name\\nfin',
    );
  });

  it('plantUmlQuoted : entre guillemets, guillemet du texte remplacé par une apostrophe', () => {
    expect(plantUmlQuoted('Le "client"\nweb')).toBe('"Le \'client\'\\nweb"');
  });
});
