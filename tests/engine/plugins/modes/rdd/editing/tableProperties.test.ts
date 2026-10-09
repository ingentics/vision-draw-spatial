import { describe, expect, it } from 'vitest';
import { definition as rdd } from '../../../../../../src/engine/plugins/modes/rdd';
import {
  TABLE_OPTIONS,
  TABLE_PROPERTIES,
} from '../../../../../../src/engine/plugins/modes/rdd/editing/tableProperties';
import { TABLE_KINDS } from '../../../../../../src/engine/plugins/modes/rdd/tables/tableKinds';
import { choiceDisplay } from '../../../../../../src/engine/core/fields/fieldSchema';
import { fieldsOf as rowsOf, setup } from '../helpers';
import { tableLevel } from '../../../../../../src/engine/plugins/modes/rdd/tables/tableLayout';
import { REGION_KIND } from '../../../../../../src/engine/plugins/modes/rdd/regions/regionLayout';

describe('mode RDD : options d’une table déclarées (sujet 277)', () => {
  it('« Taille » (sujet 430) : boutons L, M, S (icônes), sur toute table', () => {
    const size = TABLE_PROPERTIES.find((property) => property.key === 'size')!;
    expect(size.type).toBe('choice');
    const options = size.type === 'choice' ? size.options(setup().page(), []) : [];
    expect(options.map((option) => option.value)).toEqual(['L', 'M', 'S']);
    expect(choiceDisplay(options)).toBe('buttons');
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

describe('mode RDD : touches « + » / « - » de la taille (sujet 430)', () => {
  const plus = rdd.keys!['+']!;
  const minus = rdd.keys!['-']!;

  it('sur la table : un cran plus petite jusqu’à S, plus grande jusqu’à L ; « - » sur une ligne : un séparateur', () => {
    const { run, page, shape } = setup();
    expect([plus.applies(page(), shape('user')), minus.applies(page(), shape('user'))]).toEqual([true, true]);
    expect(plus.applies(page(), shape('user'), '1')).toBe(false);
    const step = (key: typeof plus) => {
      run((edit) => key.run(edit, shape('user'), undefined));
      return tableLevel(shape('user'));
    };
    expect([step(minus), step(minus), step(minus)]).toEqual(['M', 'S', 'S']);
    expect([step(plus), step(plus), step(plus)]).toEqual(['M', 'L', 'L']);
    run((edit) => minus.run(edit, shape('user'), undefined, '1'));
    expect([tableLevel(shape('user')), rowsOf(shape('user'))[2]]).toEqual(['L', { divider: true, label: '' }]);
  });
});
