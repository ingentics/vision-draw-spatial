import { describe, expect, it } from 'vitest';
import { interfaceMembers, readRepo, tableKeys } from '../../../docHelpers';

/**
 * Contrat des effets documenté (sujet 390) : chaque membre de `PageEffectDefinition` a sa ligne dans le tableau de
 * `docs/AJOUTER_UN_EFFET.md` (section 2), et le tableau ne cite que des membres du contrat.
 */
describe('contrat des effets et son guide (sujet 390)', () => {
  it('chaque membre de PageEffectDefinition a sa ligne, et le tableau ne cite que des membres', () => {
    const members = interfaceMembers(readRepo('src/engine/core/effects/types.ts'), 'PageEffectDefinition');
    const documented = tableKeys(readRepo('docs/AJOUTER_UN_EFFET.md'), '| Champ | Rôle |');
    expect(members).toContain('volume');
    expect([...documented].sort()).toEqual([...members].sort());
  });
});
