import { describe, expect, it } from 'vitest';
import { TABLE_OPTIONS } from '../../../../../../src/engine/plugins/modes/rdd/editing/tableProperties';
import { TABLE_KINDS } from '../../../../../../src/engine/plugins/modes/rdd/tables/tableKinds';

describe('mode RDD : options d’une table déclarées (sujet 277)', () => {
  it('« Table secondaire » : permise sur toutes les formes de table', () => {
    const secondary = TABLE_OPTIONS.find((option) => option.key === 'secondary')!;
    expect(Object.values(TABLE_KINDS).every((table) => secondary.on(table))).toBe(true);
    expect(secondary.on({ look: {}, rules: { fields: true, options: [] } })).toBe(false);
  });

  it('« Matérialisé » (sujet 272) : vue seulement, sous PostgreSQL', () => {
    const materialized = TABLE_OPTIONS.find((option) => option.key === 'materialized')!;
    const allowed = Object.entries(TABLE_KINDS)
      .filter(([, table]) => materialized.on(table))
      .map(([id]) => id);
    expect(allowed).toEqual(['rdd-view']);
    expect(materialized.section).toBe('PostgreSQL');
  });
});
