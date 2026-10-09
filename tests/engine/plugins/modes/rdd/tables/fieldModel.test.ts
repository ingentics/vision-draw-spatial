import { describe, expect, it } from 'vitest';
import {
  FIELDS,
  FIELD_OPTIONS,
  fieldProblems,
  fieldTypeLabel,
  tableFields,
} from '../../../../../../src/engine/plugins/modes/rdd/tables/fieldModel';
import type { Field } from '../../../../../../src/engine/plugins/modes/rdd/tables/fieldModel';
import { TABLE_KINDS } from '../../../../../../src/engine/plugins/modes/rdd/tables/tableKinds';
import type { ShapeModel } from '../../../../../../src/engine/core/model/types';
import { labels, fieldsOf, setup, rowWidth, widthOf, KEY_ROW } from '../helpers';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../../../src/engine/core/format/write';
import { fixture } from '../../../../../helpers';
import { keys } from '../../../../../../src/engine/plugins/modes/rdd/keys';

describe('mode RDD : champs structurés (sujet 246)', () => {
  /** Table du mode avec la valeur brute de `spatial.fields`. */
  const table = (fields: string, kind = 'rdd-entity') =>
    ({
      id: 't',
      kind,
      label: 'T',
      style: { 'spatial.kind': kind, [keys.key(FIELDS)]: fields },
      attributes: {},
    }) as unknown as ShapeModel;

  it('champs lus avec kind, label, type et nullable', () => {
    const { shape } = setup();
    expect(fieldsOf(shape('user'))).toEqual([
      { kind: 'pk', label: 'id', type: 'integer', nullable: false },
      { kind: 'property', label: 'email', type: 'string', nullable: false },
      { kind: 'fk', label: 'role', type: 'integer', nullable: false },
    ]);
    expect(fieldsOf(shape('secondary'))).toEqual([{ kind: 'fk', label: 'author', type: 'integer', nullable: true }]);
    expect(fieldProblems(shape('user'))).toEqual([]);
  });

  it('pas de lecture de l’ancien format ; entrées illisibles ignorées et signalées', () => {
    expect(fieldsOf(table('["id","name"]'))).toEqual([]);
    expect(fieldProblems(table('["id","name"]'))).toEqual(['2 champ(s) illisible(s), ignoré(s)']);
    expect(fieldProblems(table('pas du json'))).toEqual(['champs illisibles, ignorés']);
    const mixed = table('[{"kind":"pk","label":"id","type":"integer"},{"kind":"other","label":"x"},{"kind":"fk"}]');
    expect(labels(fieldsOf(mixed))).toEqual(['id']);
    expect(fieldProblems(mixed)).toEqual(['2 champ(s) illisible(s), ignoré(s)']);
  });

  it('type inconnu signalé ; clé primaire jamais nullable', () => {
    const shape = table(
      '[{"kind":"pk","label":"id","type":"integer","nullable":true},{"kind":"property","label":"at","type":"timestamp","nullable":true}]',
    );
    expect(fieldsOf(shape).map((field) => field.nullable)).toEqual([false, true]);
    expect(fieldProblems(shape)).toEqual([
      'champ at : type « timestamp » inconnu',
      'clé primaire nullable, lue non nullable',
    ]);
  });
});

describe('mode RDD : options d’un champ déclarées (sujet 277)', () => {
  const option = (key: string) => FIELD_OPTIONS.find((o) => o.key === key)!;
  const key: Field = { kind: 'pk', label: 'id', type: 'primary-key', nullable: false };
  const property: Field = { kind: 'property', label: 'email', type: 'string', nullable: false };
  const relation: Field = { kind: 'embed', label: 'Address', type: '', nullable: true, edge: 'e1' };
  const { 'rdd-entity': entity, 'rdd-view': view, 'rdd-document': document } = TABLE_KINDS;

  it('« Optionnel » : tout champ sauf la clé primaire', () => {
    expect([option('nullable').on(entity, property), option('nullable').on(entity, key)]).toEqual([true, false]);
    expect(option('nullable').on(view, property)).toBe(false);
  });

  it('« Unique » : hors clé primaire, sur une table aux champs uniques (entité, énumération, embedded)', () => {
    const unique = option('unique');
    expect([unique.on(entity, property), unique.on(entity, key)]).toEqual([true, false]);
    expect([unique.on(view, property), unique.on(document, property)]).toEqual([false, false]);
    expect(
      (['rdd-entity', 'rdd-enum', 'rdd-embedded', 'rdd-model'] as const).map((id) =>
        unique.on(TABLE_KINDS[id], property),
      ),
    ).toEqual([true, true, true, false]);
  });

  it('commentaire et couche physique : tout champ, clé primaire comprise, sur toute table', () => {
    for (const name of ['comment', 'pgName', 'pgType'])
      expect([option(name).on(view, property), option(name).on(entity, key)], name).toEqual([true, true]);
  });

  it('gouvernance : tout champ, clé primaire comprise, sauf ceux d’une vue (sujet 272)', () => {
    for (const name of ['gdpr', 'personal'])
      expect([option(name).on(view, property), option(name).on(entity, key)], name).toEqual([false, true]);
  });

  it('préfixe : un champ de relation seulement, réglé depuis sa flèche (hors du panneau d’un champ)', () => {
    expect([option('prefix').on(entity, relation), option('prefix').on(entity, property)]).toEqual([true, false]);
    expect(option('prefix').panel).toBe(false);
  });

  it('une option que la table ne permet pas n’est pas lue (« Unique » d’une vue dans le fichier)', () => {
    const shape = (kind: string) =>
      ({
        id: 't',
        kind,
        label: 'T',
        style: { [keys.key(FIELDS)]: '[{"kind":"property","label":"a","type":"","nullable":false,"unique":true}]' },
      }) as unknown as ShapeModel;
    expect((tableFields(shape('rdd-view'))[0] as Field).unique).toBeUndefined();
    expect((tableFields(shape('rdd-embedded'))[0] as Field).unique).toBe(true);
  });
});

describe('mode RDD : types date simple, date et heure (sujet 284)', () => {
  it('fixture : libellés affichés, sans problème ; type relu après enregistrement ; largeur d’après les libellés', () => {
    const { document, tree } = readDrawio(fixture('rdd-types-date.drawio'));
    const event = document.pages[0]!.shapes.find((s) => s.id === 'event')!;
    expect(fieldsOf(event).map((f) => fieldTypeLabel(f.type))).toEqual(['Primary key', 'Date simple', 'Date et heure']);
    expect(fieldProblems(event)).toEqual([]);
    expect(event.bounds.width).toBe(
      widthOf(KEY_ROW, rowWidth('day', 'Date simple'), rowWidth('starts_at', 'Date et heure')),
    );
    const reread = readDrawio(writeDrawio(tree)).document.pages[0]!.shapes.find((s) => s.id === 'event')!;
    expect(fieldsOf(reread).map((f) => f.type)).toEqual(['primary-key', 'date', 'datetime']);
  });
});
