import { describe, expect, it } from 'vitest';
import { definition as rdd } from '../../../../../../src/engine/plugins/modes/rdd';
import {
  TABLE_OPTIONS,
  TABLE_PROPERTIES,
} from '../../../../../../src/engine/plugins/modes/rdd/editing/tableProperties';
import { TABLE_KINDS } from '../../../../../../src/engine/plugins/modes/rdd/tables/tableKinds';
import { REGION_KIND } from '../../../../../../src/engine/plugins/modes/rdd/regions/regionLayout';

describe('mode RDD : options d’une table déclarées (sujet 277)', () => {
  it('« Table secondaire » : permise sur toutes les formes de table', () => {
    const secondary = TABLE_OPTIONS.find((option) => option.key === 'secondary')!;
    expect(Object.values(TABLE_KINDS).every((table) => secondary.on(table))).toBe(true);
    expect(secondary.on({ look: {}, rules: { fields: true, options: [] } })).toBe(false);
  });

  it('« Matérialisé » (sujet 272) : vue seulement, sous Couche physique', () => {
    const materialized = TABLE_OPTIONS.find((option) => option.key === 'materialized')!;
    const allowed = Object.entries(TABLE_KINDS)
      .filter(([, table]) => materialized.on(table))
      .map(([id]) => id);
    expect(allowed).toEqual(['rdd-view']);
    expect(materialized.section).toBe('Couche physique');
  });

  it('« Privée » (sujet 342) : vue seulement', () => {
    const option = TABLE_OPTIONS.find((o) => o.key === 'private')!;
    expect(
      Object.entries(TABLE_KINDS)
        .filter(([, table]) => option.on(table))
        .map(([id]) => id),
    ).toEqual(['rdd-view']);
  });

  it('« Nom de la table » (sujet 413) : entité, énumération et vue, sous Couche physique', () => {
    const allowed = Object.entries(TABLE_KINDS)
      .filter(([, table]) => table.rules.physicalName)
      .map(([id]) => id);
    expect(allowed).toEqual(['rdd-entity', 'rdd-enum', 'rdd-view']);
    const name = TABLE_PROPERTIES.find((property) => property.key === 'dbName')!;
    expect([name.section, name.label]).toEqual(['Couche physique', 'Nom de la table']);
  });

  it('« Couche logique » (sujet 413) : section principale de toutes les tables, pas de la région', () => {
    expect(rdd.gestures!.mainSection).toEqual({ title: 'Couche logique', kinds: Object.keys(TABLE_KINDS) });
    expect(rdd.gestures!.mainSection!.kinds).not.toContain(REGION_KIND);
  });
});
