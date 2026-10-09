import { describe, expect, it } from 'vitest';
import { definition as rdd } from '../../../../../../src/engine/plugins/modes/rdd';
import { TABLE_PROPERTIES } from '../../../../../../src/engine/plugins/modes/rdd/editing/tableProperties';
import {
  LAYER_CURRENT,
  LOGICAL,
  PHYSICAL,
  layerFieldTexts,
  layerStyle,
  layerTitle,
  physicalShown,
} from '../../../../../../src/engine/plugins/modes/rdd/tables/physicalLayer';
import type { Field } from '../../../../../../src/engine/plugins/modes/rdd/tables/fieldModel';
import { fitTable, setField } from '../../../../../../src/engine/plugins/modes/rdd/tables/operations';
import { keys } from '../../../../../../src/engine/plugins/modes/rdd/keys';
import { modeHost } from '../../../../modeHost';
import { fieldParts } from '../../../../../../src/engine/plugins/modes/rdd/editing/fieldParts';
import { approximateMeasure } from '../../../../../../src/engine/core/render/richLayout';
import { setup } from '../helpers';

const field = (patch: Partial<Field> = {}): Field => ({
  kind: 'property',
  label: 'email',
  type: 'string',
  nullable: false,
  ...patch,
});

describe('mode RDD : couches logique et physique (sujet 414)', () => {
  it('courant : couche logique au départ, Tab passe à l’autre, barre colorée et nommée', () => {
    const { page } = setup();
    expect(rdd.current).toBe(LAYER_CURRENT);
    expect(LAYER_CURRENT.initial(page())).toBe(LOGICAL);
    expect(LAYER_CURRENT.values!(page())).toEqual([LOGICAL, PHYSICAL]);
    expect(LAYER_CURRENT.valid(page(), 'autre')).toBe(false);
    expect(LAYER_CURRENT.redraws).toBe(true);
    expect([LAYER_CURRENT.label!(page(), PHYSICAL), LAYER_CURRENT.color!(page(), PHYSICAL)]).toEqual([
      'Couche physique',
      '#d5e8d4',
    ]);
    // Tab : celui du moteur, courant suivant de la barre (sujet 418).
    expect(rdd.pageKeys).toBeUndefined();
  });

  it('couche physique : tables sans couche physique estompées, rien en logique', () => {
    const { page } = setup();
    expect(LAYER_CURRENT.focus!(page(), LOGICAL)).toBeUndefined();
    const kept = LAYER_CURRENT.focus!(page(), PHYSICAL)!;
    // Le fragment (embedded) est dessiné dans la couche physique ; le modèle abstrait et le document, estompés.
    expect(kept).toEqual(expect.arrayContaining(['user', 'role', 'active', 'address', 'accounts']));
    for (const id of ['model', 'settings']) expect(kept).not.toContain(id);
  });

  it('habillage : les tables qui ont une couche physique, en couche physique seulement ; la région garde le sien', () => {
    const { shape, page } = setup();
    expect(layerStyle(shape('user'), PHYSICAL)).toEqual({ [keys.key('layer')]: PHYSICAL });
    expect(layerStyle(shape('user'), LOGICAL)).toBeUndefined();
    expect(layerStyle(shape('address'), PHYSICAL)).toEqual({ [keys.key('layer')]: PHYSICAL });
    expect(layerStyle(shape('settings'), PHYSICAL)).toBeUndefined();
    const dressing = modeHost(undefined, undefined, PHYSICAL).host.dressing(page())!;
    const user = shape('user');
    expect(physicalShown({ ...user, style: { ...user.style, ...dressing.shapeStyle!(user) } })).toBe(true);
    expect(dressing.shapeStyle!(shape('accounts'))?.fillColor).toBeDefined();
    expect(physicalShown(user)).toBe(false);
  });

  it('textes affichés : valeurs physiques, sinon les logiques marquées manquantes', () => {
    const { shape, run } = setup();
    expect(layerTitle(shape('user'), true)).toEqual({ text: 'User', missing: true });
    expect(layerTitle(shape('user'), false)).toEqual({ text: 'User', missing: false });
    // Fragment : pas de nom en base, son titre reste son nom, sans être manquant.
    expect(layerTitle(shape('address'), true)).toEqual({ text: 'Address', missing: false });
    const name = TABLE_PROPERTIES.find((property) => property.key === 'dbName')!;
    run((edit) => void name.write!(edit, shape('user'), 'app_users'));
    expect(layerTitle(shape('user'), true)).toEqual({ text: 'app_users', missing: false });
    expect(layerFieldTexts(field({ dbName: 'email_address', dbType: 'varchar(255)' }), true)).toEqual({
      label: { text: 'email_address', missing: false },
      note: { text: 'varchar(255)', missing: false },
    });
    expect(layerFieldTexts(field(), true)).toEqual({
      label: { text: 'email', missing: true },
      note: { text: 'Phrase', missing: true },
    });
    expect(layerFieldTexts(field({ dbName: 'x' }), false).label).toEqual({ text: 'email', missing: false });
  });

  it('taille : la place des deux couches ; nom en base changé au panneau, la table suit', () => {
    const { shape, run } = setup();
    // Table de la fixture d'abord à la taille de son contenu.
    run((edit) => fitTable(edit, shape('user')));
    const before = shape('user').bounds.width;
    const name = TABLE_PROPERTIES.find((property) => property.key === 'dbName')!;
    run((edit) => void name.write!(edit, shape('user'), 'application_users_with_a_very_long_name'));
    expect(keys.value(shape('user'), 'dbName')).toBe('application_users_with_a_very_long_name');
    expect(shape('user').bounds.width).toBeGreaterThan(before);
    run((edit) => void name.write!(edit, shape('user'), ''));
    expect(keys.value(shape('user'), 'dbName')).toBeUndefined();
    expect(shape('user').bounds.width).toBe(before);
    // Champ au nom en base plus long : la table s'élargit aussi.
    run((edit) => setField(edit, shape('user'), 1, { dbName: 'electronic_mail_address_of_the_user' }));
    expect(shape('user').bounds.width).toBeGreaterThan(before);
  });

  it('édition en couche physique : titre et champs écrivent dbName, les noms logiques restent', () => {
    const { shape, run, page } = setup();
    const parts = fieldParts;
    expect(parts.labelPart!(page(), shape('user'), PHYSICAL)).toBe('name');
    expect(parts.labelPart!(page(), shape('user'), LOGICAL)).toBeUndefined();
    // Fragment : son titre s'édite comme en logique, ses champs en noms en base.
    expect(parts.labelPart!(page(), shape('address'), PHYSICAL)).toBeUndefined();
    expect(parts.text!(page(), shape('address'), 'name', PHYSICAL)).toBeUndefined();
    expect(parts.text!(page(), shape('address'), '0', PHYSICAL)?.text).toBe('');
    expect(parts.text!(page(), shape('user'), 'name', PHYSICAL)?.text).toBe('');
    expect(parts.text!(page(), shape('user'), 'name', LOGICAL)).toBeUndefined();
    // Clé primaire : son nom en base s'édite en couche physique, pas son label.
    expect(parts.text!(page(), shape('user'), '0', LOGICAL)).toBeUndefined();
    expect(parts.text!(page(), shape('user'), '0', PHYSICAL)?.text).toBe('');
    const preview = parts.textPreview!(
      shape('user'),
      'name',
      'app_users',
      { gridSize: 10, measureText: approximateMeasure },
      PHYSICAL,
    );
    expect(keys.value(preview, 'dbName')).toBe('app_users');
    run((edit) => parts.setText!(edit, shape('user'), 'name', ' app_users ', PHYSICAL));
    run((edit) => parts.setText!(edit, shape('user'), '1', 'email_address', PHYSICAL));
    expect([shape('user').label, keys.value(shape('user'), 'dbName')]).toEqual(['User', 'app_users']);
    expect(parts.text!(page(), shape('user'), '1', PHYSICAL)?.text).toBe('email_address');
    expect(parts.text!(page(), shape('user'), '1', LOGICAL)?.text).toBe('email');
    // Vide : le nom en base est retiré.
    run((edit) => parts.setText!(edit, shape('user'), '1', '', PHYSICAL));
    expect(parts.text!(page(), shape('user'), '1', PHYSICAL)?.text).toBe('');
  });
});
