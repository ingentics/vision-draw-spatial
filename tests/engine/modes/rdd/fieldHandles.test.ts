import { describe, expect, it } from 'vitest';
import { definition as rdd } from '../../../../src/engine/modes/rdd';
import { fieldProblems, newFieldLabel } from '../../../../src/engine/modes/rdd/fieldModel';
import { addField } from '../../../../src/engine/modes/rdd/operations';
import type { PageModel, ShapeModel } from '../../../../src/engine/model/types';
import { createDefaultRegistry } from '../../../../src/engine/shapes/registry';
import { rowWidth, widthOf, KEY_ROW, labels, fieldsOf, setup } from './helpers';

describe('mode RDD : ajouter un champ (sujet 250)', () => {
  const handle = (page: PageModel, shape: ShapeModel) => rdd.handles!(page, shape)[0]!;

  it('poignée « + » verte au milieu du bas ; plus de poignée de connexion haut et bas', () => {
    const { page, shape } = setup();
    const plus = handle(page(), shape('user'));
    expect([plus.at, plus.offset, plus.color, plus.title]).toEqual([
      { x: 120, y: 246 },
      { x: 0, y: 18 },
      '#2e9e44',
      'Ajouter un champ',
    ]);
    expect(rdd.handles!(page(), shape('accounts'))).toEqual([]);
    expect(createDefaultRegistry().connectSides(shape('user'))).toEqual(['e', 'w']);
    // Une région n'a pas de flèche (sujet 265).
    expect(createDefaultRegistry().connectSides(shape('accounts'))).toEqual([]);
  });

  it('clic : Field1, Field2, Field3 sans type (256) et optionnels (261), en fin de liste ; la table grandit ; la partie ajoutée est rendue', () => {
    const { run, page, shape } = setup();
    const parts: Array<string | undefined> = [];
    for (let i = 0; i < 3; i += 1) run((edit) => parts.push(rdd.handleClicked!(edit, shape('user'), 'rdd.addField')));
    expect(parts).toEqual(['3', '4', '5']);
    expect(fieldsOf(shape('user')).slice(3)).toEqual([
      { kind: 'property', label: 'Field1', type: '', nullable: true },
      { kind: 'property', label: 'Field2', type: '', nullable: true },
      { kind: 'property', label: 'Field3', type: '', nullable: true },
    ]);
    expect(shape('user').bounds.height).toBe(26 + 6 * 20);
    expect(handle(page(), shape('user')).at.y).toBe(160 + 26 + 6 * 20);
    // Sans type : rien de signalé.
    expect(fieldProblems(shape('user'))).toEqual([]);
    // Poignée inconnue : rien.
    expect(run((edit) => rdd.handleClicked!(edit, shape('user'), 'other'))).toBe(false);
  });

  it('type choisi au panneau (256) : un des sept, ou « Aucun » ; la largeur suit', () => {
    const { run, page, shape } = setup();
    const type = rdd.shapeProperties!.find((p) => p.key === 'rdd.field.type')!;
    expect(type.type === 'select' && type.options(page(), []).map((o) => o.label)).toEqual([
      'Aucun',
      'Nombre entier',
      'Nombre réel',
      'Phrase',
      'Texte',
      'Booléen',
      'Dynamique',
      'Money',
    ]);
    run((edit) => rdd.handleClicked!(edit, shape('user'), 'rdd.addField'));
    run((edit) => type.write!(edit, shape('user'), 'money', '3'));
    expect(fieldsOf(shape('user'))[3]!.type).toBe('money');
    run((edit) => type.write!(edit, shape('user'), 'a_very_long_type_name_here_and_there', '3'));
    expect(shape('user').bounds.width).toBeGreaterThan(widthOf(KEY_ROW, rowWidth('role', 'Nombre entier')));
    run((edit) => type.write!(edit, shape('user'), undefined, '3'));
    expect(fieldsOf(shape('user'))[3]!.type).toBe('');
    expect(shape('user').bounds.width).toBe(widthOf(KEY_ROW, rowWidth('role', 'Nombre entier')));
  });

  it('après le champ sélectionné, jamais avant la clé primaire ; premier numéro libre', () => {
    const { run, shape } = setup();
    let part: string | undefined;
    run((edit) => (part = rdd.handleClicked!(edit, shape('user'), 'rdd.addField', '1')));
    expect([part, labels(fieldsOf(shape('user')))]).toEqual(['2', ['id', 'email', 'Field1', 'role']]);
    expect(run((edit) => addField(edit, shape('user'), 'string', -1))).toBe(true);
    expect(labels(fieldsOf(shape('user')))[1]).toBe('Field2');
    expect(newFieldLabel([{ kind: 'property', label: 'Field2', type: '', nullable: false }])).toBe('Field1');
  });
});
