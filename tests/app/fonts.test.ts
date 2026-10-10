import { describe, expect, it } from 'vitest';
import { FONTS } from '../../src/app/fonts';
import { createDefaultModeRegistry } from '../../src/engine/plugins';

describe('polices de l’appli (sujet 510)', () => {
  it('l’appli fournit toutes les polices nommées que demandent les modes', () => {
    const wanted = createDefaultModeRegistry()
      .list()
      .flatMap((mode) => mode.fonts ?? []);
    expect(wanted.length).toBeGreaterThan(0);
    for (const font of wanted) expect(Object.keys(FONTS.families ?? {})).toContain(font);
  });
});
