import { describe, expect, it } from 'vitest';
import { definition as rdd } from '../../../../../../src/engine/plugins/modes/rdd';
import {
  FIELDS,
  fieldProblems,
  tableFields as tableRows,
} from '../../../../../../src/engine/plugins/modes/rdd/tables/fieldModel';
import { spatialValue } from '../../../../../../src/engine/core/spatial';
import { fieldsOf, setup } from '../helpers';
import { createDefaultModeRegistry } from '../../../../../../src/engine/plugins';
import { keys } from '../../../../../../src/engine/plugins/modes/rdd/keys';

describe('mode RDD : champ d’une vue (sujet 272)', () => {
  it('panneau : ni « Optionnel » ni Gouvernance ; les autres tables gardent les leurs', () => {
    const { page, shape } = setup();
    const modes = createDefaultModeRegistry();
    const labels = (id: string) =>
      modes
        .properties(page(), 'shape', '1')
        .filter((property) => !property.hidden?.(page(), shape(id), '1'))
        .map((property) => property.label);
    expect(labels('active')).not.toContain('Optionnel');
    expect(labels('active')).not.toContain('GDPR');
    expect(labels('active')).not.toContain('Donnée personnelle');
    expect(labels('active')).toContain('Nom du champ');
    expect(labels('user')).toContain('Optionnel');
    expect(labels('user')).toContain('GDPR');
  });
});

describe('mode RDD : champ sélectionné dans sa table (sujet 249)', () => {
  it('panneau : avec un champ, ses réglages seulement (kind et nullable masqués pour la clé primaire)', () => {
    const { page, shape } = setup();
    const modes = createDefaultModeRegistry();
    const shown = (part?: string) =>
      modes
        .properties(page(), 'shape', part)
        .filter((property) => !property.hidden?.(page(), shape('user'), part))
        .map((property) => [property.label, property.value?.(page(), shape('user'), part)]);
    // Sujet 260 : plus de « Rôle », « Optionnel » (ancien « Nullable »), « Unique », commentaire ; Couche physique et
    // Gouvernance en sections à part.
    expect(shown('1')).toEqual([
      ['Champ', 'email'],
      ['Type', 'string'],
      ['Optionnel', undefined],
      ['Unique', undefined],
      ['Commentaire', undefined],
      ['Nom du champ', undefined],
      ['Type', undefined],
      ['GDPR', undefined],
      ['Donnée personnelle', undefined],
      ['Ajouter un séparateur', undefined],
    ]);
    const sections = modes
      .properties(page(), 'shape', '1')
      .filter((property) => !property.hidden?.(page(), shape('user'), '1'))
      .map((property) => property.section);
    expect([...new Set(sections)]).toEqual([undefined, 'Couche physique', 'Gouvernance']);
    // Clé primaire : `id` en lecture seule, son type imposé, ni optionnel ni unique.
    expect(shown('0')).toEqual([
      ['Champ', 'id'],
      ['Type', 'Primary key'],
      ['Commentaire', undefined],
      ['Nom du champ', undefined],
      ['Type', undefined],
      ['GDPR', undefined],
      ['Donnée personnelle', undefined],
      ['Ajouter un séparateur', undefined],
    ]);
    const comment = rdd.gestures!.properties!.find((p) => p.key === 'rdd.field.comment')!;
    expect(comment.type === 'text' && comment.multiline).toBe(true);
    const label = rdd.gestures!.properties!.find((p) => p.key === 'rdd.field.label')!;
    expect(
      typeof label.readOnly === 'function' && [
        label.readOnly(page(), shape('user'), '0'),
        label.readOnly(page(), shape('user'), '1'),
      ],
    ).toEqual([true, false]);
    expect(shown().map(([label]) => label)).toEqual([
      'Nom de la table',
      'Taille',
      'Clé primaire',
      'Ajouter un séparateur',
    ]);
  });

  it('réglages du champ écrits par le panneau', () => {
    const { run, shape } = setup();
    const property = (key: string) => rdd.gestures!.properties!.find((p) => p.key === key)!;
    run((edit) => property('rdd.field.nullable').write!(edit, shape('user'), '1', '1'));
    run((edit) => property('rdd.field.label').write!(edit, shape('user'), 'mail', '1'));
    run((edit) => property('rdd.field.unique').write!(edit, shape('user'), '1', '1'));
    run((edit) => property('rdd.field.comment').write!(edit, shape('user'), ' Adresse de contact ', '1'));
    run((edit) => property('rdd.field.dbName').write!(edit, shape('user'), 'email_address', '1'));
    run((edit) => property('rdd.field.dbType').write!(edit, shape('user'), 'varchar(255)', '1'));
    run((edit) => property('rdd.field.gdpr').write!(edit, shape('user'), '1', '1'));
    run((edit) => property('rdd.field.personal').write!(edit, shape('user'), '1', '1'));
    expect(fieldsOf(shape('user'))[1]).toEqual({
      kind: 'property',
      label: 'mail',
      type: 'string',
      nullable: true,
      unique: true,
      comment: 'Adresse de contact',
      dbName: 'email_address',
      dbType: 'varchar(255)',
      gdpr: true,
      personal: true,
    });
    // Écrits dans le fichier, relus ; vidés ou décochés, retirés.
    expect(spatialValue(shape('user'), keys.key(FIELDS))).toContain('"dbType":"varchar(255)"');
    run((edit) => property('rdd.field.comment').write!(edit, shape('user'), undefined, '1'));
    run((edit) => property('rdd.field.gdpr').write!(edit, shape('user'), undefined, '1'));
    expect(fieldsOf(shape('user'))[1]!.comment).toBeUndefined();
    expect(spatialValue(shape('user'), keys.key(FIELDS))).not.toContain('gdpr');
    // La clé primaire : ni renommée ni retypée.
    expect(run((edit) => property('rdd.field.label').write!(edit, shape('user'), 'uuid', '0'))).toBe(false);
    expect(run((edit) => property('rdd.field.type').write!(edit, shape('user'), 'text', '0'))).toBe(false);
  });

  it('clé primaire : id et type imposés par la table (« Primary key », « Mot »), quoi qu’en dise le fichier', () => {
    const { page, shape } = setup();
    expect(tableRows(shape('user'))[0]).toMatchObject({ kind: 'pk', label: 'id', type: 'primary-key' });
    expect(tableRows(shape('role'))[0]).toMatchObject({ kind: 'pk', label: 'id', type: 'word' });
    const odd = {
      ...shape('user'),
      style: { ...shape('user').style, [FIELDS]: '[{"kind":"pk","label":"uuid","type":"text","nullable":false}]' },
    };
    expect(tableRows(odd)[0]).toMatchObject({ label: 'id', type: 'primary-key' });
    expect(fieldProblems(odd)).toEqual([]);
    // « Unique » : entité, énumération, embedded ; pas les autres tables.
    const unique = rdd.gestures!.properties!.find((p) => p.key === 'rdd.field.unique')!;
    expect(
      ['user', 'role', 'address', 'settings', 'active'].map((id) => unique.hidden!(page(), shape(id), '1')),
    ).toEqual([false, false, false, true, true]);
  });
});
