import { describe, expect, it } from 'vitest';
import type { PageEffectDefinition } from '../../../src/engine/core/effects/types';
import {
  createDefaultEffectRegistry,
  createDefaultRegistry,
  PAGE_EFFECT_DEFINITIONS,
  SHAPE_DEFINITIONS,
} from '../../../src/engine/plugins';

/** Registres par défaut, construits pour ces tests (sujet 304 : plus de registres partagés). */
const defaultShapeRegistry = createDefaultRegistry();

/** Dossiers des effets : `plugins/effects/<id>/index.ts`. */
const EFFECTS = Object.entries(
  import.meta.glob<PageEffectDefinition>('../../../src/engine/plugins/effects/*/index.ts', {
    eager: true,
    import: 'definition',
  }),
).map(([path, definition]) => ({ folder: path.split('/').at(-2)!, definition }));

describe('racine de composition des plugins (sujet 286)', () => {
  it('un effet par dossier, id = nom du dossier, enregistré sans liste à tenir', () => {
    expect(EFFECTS.map(({ folder }) => folder)).toContain('forest');
    expect(PAGE_EFFECT_DEFINITIONS).toHaveLength(EFFECTS.length);
    const registry = createDefaultEffectRegistry();
    for (const { folder, definition } of EFFECTS) {
      expect(definition.id).toBe(folder);
      expect(registry.get(folder)).toBe(definition);
    }
  });

  it('les bases des formes (`shapes/generic/`) ne sont pas des formes', () => {
    expect(SHAPE_DEFINITIONS.every((definition) => definition !== undefined)).toBe(true);
    expect(SHAPE_DEFINITIONS.map((definition) => definition.id)).not.toContain('box');
    expect(defaultShapeRegistry.templates().length).toBeGreaterThan(0);
  });
});
