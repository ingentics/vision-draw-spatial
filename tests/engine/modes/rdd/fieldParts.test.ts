import { Object3D } from 'three';
import type { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { definition as rdd } from '../../../../src/engine/modes/rdd';
import { FIELDS, fieldProblems, fieldsOf as rowsOf } from '../../../../src/engine/modes/rdd/tables';
import { setSecondary } from '../../../../src/engine/modes/rdd/operations';
import { fieldParts } from '../../../../src/engine/modes/rdd/fieldParts';
import { approximateMeasure } from '../../../../src/engine/render/richLayout';
import { buildPageScene } from '../../../../src/engine/render/pageScene';
import type { RenderContext, TextSpec } from '../../../../src/engine/render/types';
import { createDefaultRegistry } from '../../../../src/engine/shapes/registry';
import { spatialValue } from '../../../../src/engine/spatial';
import { rowWidth, widthOf, KEY_ROW, setFields, labels, fieldsOf, setup } from './helpers';

describe('mode RDD : champ sélectionné dans sa table (sujet 249)', () => {
  // User : (40, 160), 160 de large ; entête de 26, lignes de 20 (id, email, role).

  it('partie sous un point : le rang du champ ; l’entête, hors de la table ou sous les lignes : la table', () => {
    const { page, shape } = setup();
    const at = (x: number, y: number) => fieldParts.at(page(), shape('user'), { x, y });
    expect([at(60, 160 + 26 + 5), at(60, 160 + 26 + 25), at(190, 160 + 26 + 59)]).toEqual(['0', '1', '2']);
    expect([at(60, 170), at(30, 200), at(60, 160 + 26 + 61)]).toEqual([undefined, undefined, undefined]);
    expect(fieldParts.at(page(), shape('accounts'), { x: 60, y: 200 })).toBeUndefined();
  });

  it('emprise : la ligne entière ; texte : le label, du label au bord droit, à l’échelle de la table', () => {
    const { run, page, shape } = setup();
    expect(fieldParts.bounds(page(), shape('user'), '1')).toEqual({ x: 40, y: 206, width: 160, height: 20 });
    expect(fieldParts.bounds(page(), shape('user'), '3')).toBeUndefined();
    expect(fieldParts.bounds(page(), shape('user'), 'x')).toBeUndefined();
    expect(fieldParts.text!(page(), shape('user'), '1')).toEqual({
      text: 'email',
      zone: { x: 62, y: 206, width: 132, height: 20 },
      fontSize: 11,
      italic: undefined,
    });
    run((edit) => setSecondary(edit, shape('settings'), true));
    const settings = shape('settings');
    const text = fieldParts.text!(page(), settings, '0')!;
    expect([text.text, text.fontSize, text.italic]).toEqual(['theme', 11 * 0.8, true]);
    expect(text.zone.height).toBeCloseTo(16, 5);
  });

  it('label sur place : écrit et la table s’élargit ; vide : refusé', () => {
    const { run, page, shape } = setup();
    const long = 'a_role_identifier_that_is_long';
    run((edit) => fieldParts.setText!(edit, shape('user'), '2', `  ${long} `));
    expect(labels(fieldsOf(shape('user')))).toEqual(['id', 'email', long]);
    expect(shape('user').bounds.width).toBe(widthOf(rowWidth(long, 'Nombre entier')));
    expect(run((edit) => fieldParts.setText!(edit, shape('user'), '2', '  '))).toBe(false);
    expect(fieldParts.text!(page(), shape('user'), '2')!.text).toBe(long);
  });
});

describe('mode RDD : supprimer un champ (sujet 251)', () => {
  it('Suppr retire le champ ; la table rétrécit en hauteur, et en largeur si c’était la plus longue ligne', () => {
    const { run, shape } = setup();
    const long = 'a_very_long_field_name_for_a_table';
    run((edit) => setFields(edit, shape('user'), `email\nrole\n${long}`));
    expect(shape('user').bounds.width).toBe(widthOf(rowWidth(long, 'Phrase')));
    run((edit) => fieldParts.remove!(edit, shape('user'), '3'));
    expect(labels(fieldsOf(shape('user')))).toEqual(['id', 'email', 'role']);
    expect(shape('user').bounds).toEqual({
      x: 40,
      y: 160,
      width: widthOf(KEY_ROW, rowWidth('role', 'Nombre entier')),
      height: 26 + 3 * 20,
    });
    run((edit) => fieldParts.remove!(edit, shape('user'), '1'));
    expect(labels(fieldsOf(shape('user')))).toEqual(['id', 'role']);
  });

  it('la clé primaire ne se supprime pas ; une partie inconnue non plus', () => {
    const { run, shape } = setup();
    expect(run((edit) => fieldParts.remove!(edit, shape('user'), '0'))).toBe(false);
    expect(run((edit) => fieldParts.remove!(edit, shape('user'), '9'))).toBe(false);
    expect(labels(fieldsOf(shape('user')))).toEqual(['id', 'email', 'role']);
  });
});

describe('mode RDD : réordonner les champs au glisser (sujet 252)', () => {
  // User : (40, 160), 160 de large ; lignes id (186), email (206), role (226), fin 246 ; plus Field1 (246), fin 266.
  const setupWithField = () => {
    const context = setup();
    context.run((edit) => setFields(edit, context.shape('user'), 'email\nrole\nField1'));
    return context;
  };

  it('place visée : la ligne survolée, jamais devant la clé primaire ni à la place actuelle', () => {
    const { page, shape } = setupWithField();
    const drop = (part: string, y: number) => fieldParts.dropAt!(page(), shape('user'), part, { x: 100, y });
    // Field1 (rang 3) au-dessus de email (206-226) : à sa place.
    expect(drop('3', 210)).toBe('1');
    // Au-dessus de la clé primaire ou de l'entête : juste après elle.
    expect([drop('3', 190), drop('3', 170)]).toEqual(['1', '1']);
    // email (rang 1) sur Field1 (246-266) : après lui, en fin de liste.
    expect(drop('1', 250)).toBe('4');
    // Sur lui-même : aucune.
    expect(drop('2', 230)).toBeUndefined();
    // Hors de la table, ou la clé primaire : aucune.
    expect(fieldParts.dropAt!(page(), shape('user'), '3', { x: 10, y: 210 })).toBeUndefined();
    expect(drop('3', 300)).toBeUndefined();
    expect(drop('0', 240)).toBeUndefined();
  });

  it('aperçu : la table avec le champ à sa nouvelle place, et ce champ désigné ; rien d’écrit', () => {
    const { page, shape } = setupWithField();
    const preview = fieldParts.preview!(shape('user'), '3', '1')!;
    expect(preview.part).toBe('1');
    expect(labels(fieldsOf(preview.shape))).toEqual(['id', 'Field1', 'email', 'role']);
    expect(fieldParts.bounds(page(), preview.shape, preview.part)).toEqual({
      x: 40,
      y: 206,
      width: shape('user').bounds.width,
      height: 20,
    });
    expect(labels(fieldsOf(shape('user')))).toEqual(['id', 'email', 'role', 'Field1']);
    expect(fieldParts.preview!(shape('user'), '0', '2')).toBeUndefined();
  });

  it('lâcher : le champ change de rang et reste désigné à sa nouvelle place ; une étape d’écriture', () => {
    const { run, shape } = setupWithField();
    let part: string | undefined;
    expect(run((edit) => (part = fieldParts.move!(edit, shape('user'), '3', '1')))).toBe(true);
    expect([part, labels(fieldsOf(shape('user')))]).toEqual(['1', ['id', 'Field1', 'email', 'role']]);
    run((edit) => (part = fieldParts.move!(edit, shape('user'), '1', '4')));
    expect([part, labels(fieldsOf(shape('user')))]).toEqual(['3', ['id', 'email', 'role', 'Field1']]);
    // Jamais devant la clé primaire, et la clé primaire ne bouge pas.
    expect(run((edit) => fieldParts.move!(edit, shape('user'), '2', '0'))).toBe(false);
    expect(run((edit) => fieldParts.move!(edit, shape('user'), '0', '3'))).toBe(false);
  });
});

describe('mode RDD : séparateurs entre les champs (sujet 253)', () => {
  const minus = rdd.keys!['-']!;

  it('« - » sur une ligne sélectionnée : séparateur vide après elle, désigné ensuite ; écrit et relu', () => {
    const { run, page, shape } = setup();
    expect(minus.applies(page(), shape('user'))).toBe(false);
    expect(minus.applies(page(), shape('user'), '1')).toBe(true);
    let part: string | void = undefined;
    run((edit) => (part = minus.run(edit, shape('user'), undefined, '1')));
    expect(part).toBe('2');
    expect(rowsOf(shape('user'))[2]).toEqual({ divider: true, label: '' });
    expect(spatialValue(shape('user'), FIELDS)).toContain('{"divider":true,"label":""}');
    expect(shape('user').bounds.height).toBe(26 + 4 * 20);
    expect(fieldProblems(shape('user'))).toEqual([]);
    // Sur la clé primaire : juste après elle.
    run((edit) => (part = minus.run(edit, shape('user'), undefined, '0')));
    expect([part, labels(rowsOf(shape('user')))]).toEqual(['1', ['id', '', 'email', '', 'role']]);
  });

  it('texte : écrit au milieu, éditeur sans fond ; vidé, le séparateur reste ; la largeur suit un long texte', () => {
    const { run, page, shape } = setup();
    run((edit) => minus.run(edit, shape('user'), undefined, '1'));
    run((edit) => fieldParts.setText!(edit, shape('user'), '2', '  Audit '));
    expect(rowsOf(shape('user'))[2]).toEqual({ divider: true, label: 'Audit' });
    const text = fieldParts.text!(page(), shape('user'), '2')!;
    expect([text.text, text.fontSize, text.center, text.transparent]).toEqual(['Audit', 7, true, true]);
    expect(fieldParts.text!(page(), shape('user'), '1')!.transparent).toBeUndefined();
    const long = 'A very long divider label for the table';
    run((edit) => fieldParts.setText!(edit, shape('user'), '2', long));
    const measure = approximateMeasure(long, { size: 7, bold: false, italic: false });
    expect(shape('user').bounds.width).toBe(
      widthOf(2 * 6 + 2 * 16 + measure + 2 * 4, KEY_ROW, rowWidth('role', 'Nombre entier')),
    );
    // Vidé : le séparateur reste, sans texte (un simple trait).
    run((edit) => fieldParts.setText!(edit, shape('user'), '2', '   '));
    expect(rowsOf(shape('user'))[2]).toEqual({ divider: true, label: '' });
  });

  it('sélection, suppression et glisser comme un champ ; le panneau ne montre que son texte', () => {
    const { run, page, shape } = setup();
    run((edit) => minus.run(edit, shape('user'), undefined, '2'));
    run((edit) => fieldParts.setText!(edit, shape('user'), '3', 'Fin'));
    expect(fieldParts.at(page(), shape('user'), { x: 60, y: 160 + 26 + 65 })).toBe('3');
    const shown = rdd
      .shapeProperties!.filter((p) => p.part && !p.hidden!(page(), shape('user'), '3'))
      .map((p) => [p.label, p.value!(page(), shape('user'), '3')]);
    expect(shown).toEqual([['Séparateur', 'Fin']]);
    let part: string | undefined;
    run((edit) => (part = fieldParts.move!(edit, shape('user'), '3', '1')));
    expect([part, labels(rowsOf(shape('user')))]).toEqual(['1', ['id', 'Fin', 'email', 'role']]);
    run((edit) => fieldParts.remove!(edit, shape('user'), '1'));
    expect(labels(rowsOf(shape('user')))).toEqual(['id', 'email', 'role']);
  });

  it('bouton « Ajouter un séparateur » : après la ligne sélectionnée, sinon en fin ; désigné ensuite', () => {
    const { run, shape } = setup();
    const button = rdd.shapeProperties!.find((p) => p.key === 'rdd.addDivider')!;
    expect([button.type, button.anyPart]).toEqual(['button', true]);
    let part: string | void = undefined;
    run((edit) => (part = button.write!(edit, shape('user'), undefined)));
    expect([part, labels(rowsOf(shape('user')))]).toEqual(['3', ['id', 'email', 'role', '']]);
    run((edit) => (part = button.write!(edit, shape('user'), undefined, '0')));
    expect([part, labels(rowsOf(shape('user')))]).toEqual(['1', ['id', '', 'email', 'role', '']]);
  });

  it('saisie en direct : la table avec le texte tapé, élargie ; rien d’écrit', () => {
    const { run, shape } = setup();
    run((edit) => minus.run(edit, shape('user'), undefined, '2'));
    const long = 'A very long divider label for the table';
    const preview = fieldParts.textPreview!(shape('user'), '3', long, 10);
    expect(rowsOf(preview)[3]).toEqual({ divider: true, label: long });
    expect(preview.bounds.width).toBeGreaterThan(shape('user').bounds.width);
    // Sur la grille, comme la taille écrite ensuite (sujet 263).
    expect(preview.bounds.width % 10).toBe(0);
    expect(rowsOf(shape('user'))[3]).toEqual({ divider: true, label: '' });
  });

  it('rendu : trait gris coupé autour du texte gris, centré, petit', () => {
    const { run, page, shape } = setup();
    run((edit) => minus.run(edit, shape('user'), undefined, '1'));
    run((edit) => fieldParts.setText!(edit, shape('user'), '2', 'Audit'));
    const texts: TextSpec[] = [];
    const ctx: RenderContext = {
      text: {
        create(spec) {
          texts.push(spec);
          return new Object3D();
        },
      },
    };
    const root = buildPageScene(page(), createDefaultRegistry(), ctx, 'flat').root;
    const user = root.children.find((child) => child.userData.elementId === 'user')!;
    expect(user.children.filter((child) => child.name === 'divider')).toHaveLength(2);
    const audit = texts.find((t) => t.text === 'Audit')!;
    // Textes des lignes marqués de leur partie (masqués pendant leur édition sur place).
    const marked = user.children.filter((child) => child.userData.part !== undefined).map((c) => c.userData.part);
    expect(marked).toEqual(['0', '1', '2', '3']);
    const { x, width } = shape('user').bounds;
    expect([audit.x, audit.y, audit.fontSize, audit.anchorX]).toEqual([x + width / 2, 160 + 26 + 50, 7, 'center']);
    expect(`#${(audit.color as Color).getHexString()}`).toBe('#999999');
    // Sans texte : un seul trait.
    run((edit) => fieldParts.setText!(edit, shape('user'), '2', ''));
    const again = buildPageScene(page(), createDefaultRegistry(), ctx, 'flat').root;
    const lines = again.children.find((child) => child.userData.elementId === 'user')!.children;
    expect(lines.filter((child) => child.name === 'divider')).toHaveLength(1);
  });
});

describe('mode RDD : commentaire d’un champ (sujet 262)', () => {
  it('titre et texte d’un champ (vide sans commentaire) ; un séparateur n’en a pas ; écrit par la touche C', () => {
    const { run, shape } = setup();
    expect(fieldParts.comment!(shape('user'), '1')).toEqual({ title: 'email', text: '' });
    run((edit) => fieldParts.setComment!(edit, shape('user'), '1', '  Adresse de contact  '));
    expect(fieldParts.comment!(shape('user'), '1')).toEqual({ title: 'email', text: 'Adresse de contact' });
    expect(fieldsOf(shape('user'))[1]!.comment).toBe('Adresse de contact');
    run((edit) => fieldParts.setComment!(edit, shape('user'), '1', ''));
    expect(fieldsOf(shape('user'))[1]!.comment).toBeUndefined();
    run((edit) => rdd.keys!['-']!.run(edit, shape('user'), undefined, '1'));
    expect(fieldParts.comment!(shape('user'), '2')).toBeUndefined();
    expect(run((edit) => fieldParts.setComment!(edit, shape('user'), '2', 'x'))).toBe(false);
  });
});
