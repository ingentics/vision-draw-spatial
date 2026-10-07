import { describe, expect, it } from 'vitest';
import { definition as rdd } from '../../../../src/engine/modes/rdd';
import { fitTable, setSecondary } from '../../../../src/engine/modes/rdd/operations';
import { setCellLabel } from '../../../../src/engine/format/cellEdits';
import { approximateMeasure } from '../../../../src/engine/render/richLayout';
import { rowWidth, onGrid, contentWidth, widthOf, KEY_ROW, setFields, setup } from './helpers';

describe('mode RDD : taille calculée (sujet 247)', () => {
  /** Largeur approchée d'un texte (celle des tests, sans polices). */
  const measure = (text: string, size: number, bold = false) => approximateMeasure(text, { size, bold, italic: false });

  it('largeur : au moins 120, sinon le plus long champ, marges comprises ; la table rétrécit aussi', () => {
    const { run, shape } = setup();
    const long = 'a_very_long_field_name_for_a_table';
    run((edit) => setFields(edit, shape('user'), `email\n${long}`));
    expect(shape('user').bounds.width).toBe(widthOf(rowWidth(long, 'Phrase')));
    expect(shape('user').bounds.width).toBeGreaterThan(KEY_ROW);
    run((edit) => setFields(edit, shape('user'), 'email'));
    expect(shape('user').bounds).toEqual({ x: 40, y: 160, width: widthOf(KEY_ROW), height: 26 + 2 * 20 });
    // Le minimum, sans champ plus large.
    run((edit) => setFields(edit, shape('model'), ''));
    expect(shape('model').bounds.width).toBe(120);
    // Table secondaire : le minimum et le reste × 0,8.
    run((edit) => setSecondary(edit, shape('model'), true));
    expect(shape('model').bounds.width).toBe(100);
    run((edit) => setFields(edit, shape('user'), long));
    run((edit) => setSecondary(edit, shape('user'), true));
    expect(shape('user').bounds.width).toBe(onGrid(Math.ceil(rowWidth(long, 'Phrase')) * 0.8));
  });

  it('largeur : le nom, gras, avec la place de l’icône d’entête de chaque côté', () => {
    const { run, shape, tree } = setup();
    const name = 'ActiveUsersOfTheWholePlatform';
    // Le renommage écrit le texte de la forme, puis le moteur appelle `relabeled` du mode.
    setCellLabel(tree.pages[0]!, 'role', name);
    run((edit) => rdd.relabeled!(edit, 'role'));
    expect(shape('role').bounds.width).toBe(onGrid(Math.ceil(measure(name, 12, true) + 2 * (6 + 7 + 14 * 1.5 + 4))));
    // Un nom court : la largeur des champs.
    setCellLabel(tree.pages[0]!, 'role', 'Role');
    run((edit) => rdd.relabeled!(edit, 'role'));
    expect(shape('role').bounds.width).toBe(widthOf(KEY_ROW));
  });
});

describe('mode RDD : taille sur la grille (sujet 263)', () => {
  it('la table s’étend à droite jusqu’au pas de grille, sa hauteur reste celle des lignes (sujet 264) ; sans grille, au pixel près', () => {
    const { run, shape, tree } = setup();
    const content = contentWidth(KEY_ROW, rowWidth('role', 'Nombre entier'));
    run((edit) => fitTable(edit, shape('user')));
    expect(shape('user').bounds).toEqual({ x: 40, y: 160, width: Math.ceil(content / 10) * 10, height: 26 + 3 * 20 });
    tree.pages[0]!.model!.setAttribute('gridSize', '20');
    run((edit) => fitTable(edit, shape('user')));
    expect(shape('user').bounds).toEqual({ x: 40, y: 160, width: Math.ceil(content / 20) * 20, height: 26 + 3 * 20 });
    tree.pages[0]!.model!.setAttribute('grid', '0');
    run((edit) => fitTable(edit, shape('user')));
    expect(shape('user').bounds).toEqual({ x: 40, y: 160, width: content, height: 26 + 3 * 20 });
  });
});
