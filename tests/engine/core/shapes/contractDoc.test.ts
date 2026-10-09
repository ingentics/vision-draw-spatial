import { describe, expect, it } from 'vitest';
import { interfaceMembers, readRepo, tableKeys } from '../../../docHelpers';

/**
 * Contrat des formes documenté (sujet 390) : chaque membre de `ShapeDefinition` a sa ligne dans le tableau de
 * `docs/AJOUTER_UNE_FORME.md` (section 2), et le tableau ne cite que des membres du contrat.
 */
describe('contrat des formes et son guide (sujet 390)', () => {
  it('chaque membre de ShapeDefinition a sa ligne, et le tableau ne cite que des membres', () => {
    const members = interfaceMembers(readRepo('src/engine/core/shapes/types.ts'), 'ShapeDefinition');
    const documented = tableKeys(readRepo('docs/AJOUTER_UNE_FORME.md'), '| Champ | Rôle |');
    expect(members.length).toBeGreaterThan(20);
    expect([...documented].sort()).toEqual([...members].sort());
  });
});
