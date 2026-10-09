import { describe, expect, it } from 'vitest';
import { FIELDS } from '../../../../../../src/engine/plugins/modes/rdd/tables/fieldModel';
import { SIZE } from '../../../../../../src/engine/plugins/modes/rdd/tables/tableLayout';
import { setField, setTableLevel } from '../../../../../../src/engine/plugins/modes/rdd/tables/operations';
import { spatialValue } from '../../../../../../src/engine/core/spatial';
import { rowWidth, onGrid, contentWidth, widthOf, setFields, labels, fieldsOf, setup } from '../helpers';
import { RDD_KEYS, keys } from '../../../../../../src/engine/plugins/modes/rdd/keys';
import { applyModeEdit, DEFAULT_MODE_EDIT_CONTEXT } from '../../../../../../src/engine/core/modes/modeEditWriter';
import type { ModeEdit } from '../../../../../../src/engine/core/modes/modeEdit';
import { documentFromTree } from '../../../../../../src/engine/core/format/parse';

describe('mode RDD : opérations sur une table', () => {
  it('champs : un par ligne, la table prend la hauteur de ses champs (au moins une ligne)', () => {
    const { run, shape } = setup();
    expect(run((edit) => setFields(edit, shape('model'), 'id\n\n  name  \ncreated_at'))).toBe(true);
    expect(labels(fieldsOf(shape('model')))).toEqual(['id', 'name', 'created_at']);
    expect(shape('model').bounds).toEqual({
      x: 40,
      y: 40,
      width: widthOf(rowWidth('created_at', 'Phrase')),
      height: 26 + 3 * 20,
    });
    run((edit) => setFields(edit, shape('model'), ''));
    expect(spatialValue(shape('model'), keys.key(FIELDS))).toBeUndefined();
    expect(shape('model').bounds.height).toBe(46);
  });

  it('tailles M et S : taille du contenu × 0,8 puis × 0,64 depuis le coin haut-gauche, puis L ; entête et texte suivent', () => {
    const { run, shape } = setup();
    const content = contentWidth(rowWidth('created_at', 'Phrase'), rowWidth('updated_at', 'Phrase'));
    run((edit) => setTableLevel(edit, shape('timestamped'), 'M'));
    const small = shape('timestamped');
    expect(spatialValue(small, keys.key(SIZE))).toBe('M');
    expect(small.bounds).toEqual({ x: 240, y: 40, width: onGrid(content * 0.8), height: 52.8 });
    expect([small.style.startSize, small.style.fontSize]).toEqual(['20.8', '9.6']);
    // Un champ de plus : lignes à l'échelle de la taille M.
    run((edit) => setFields(edit, shape('timestamped'), 'created_at\nupdated_at\ndeleted_at'));
    expect(shape('timestamped').bounds.height).toBe(68.8);
    // S : encore 20 % plus petite (× 0,64).
    run((edit) => setTableLevel(edit, shape('timestamped'), 'S'));
    const smaller = shape('timestamped');
    expect(spatialValue(smaller, keys.key(SIZE))).toBe('S');
    expect(smaller.bounds.height).toBe(55.04);
    expect([smaller.style.startSize, smaller.style.fontSize]).toEqual(['16.64', '7.68']);
    run((edit) => setTableLevel(edit, shape('timestamped'), 'L'));
    const back = shape('timestamped');
    expect(spatialValue(back, keys.key(SIZE))).toBeUndefined();
    expect(back.bounds).toEqual({ x: 240, y: 40, width: onGrid(content), height: 86 });
    expect([back.style.startSize, back.style.fontSize]).toEqual(['26', '12']);
    expect(run((edit) => setTableLevel(edit, shape('timestamped'), 'L'))).toBe(false);
  });
});

describe('mode RDD : champ sélectionné dans sa table (sujet 249)', () => {
  it('kind et nullable ; la clé primaire garde les siens et aucun champ ne le devient', () => {
    const { run, shape } = setup();
    run((edit) => setField(edit, shape('user'), 1, { kind: 'external-fk', nullable: true }));
    expect(fieldsOf(shape('user'))[1]).toEqual({ kind: 'external-fk', label: 'email', type: 'string', nullable: true });
    expect(run((edit) => setField(edit, shape('user'), 0, { kind: 'fk', nullable: true }))).toBe(false);
    expect(run((edit) => setField(edit, shape('user'), 1, { kind: 'pk' }))).toBe(false);
    expect(fieldsOf(shape('user')).map((field) => field.kind)).toEqual(['pk', 'external-fk', 'fk']);
  });
});

describe('mode RDD : entités (sujet 180)', () => {
  it('clé primaire toujours en tête ; un fichier sans elle la retrouve à la première écriture', () => {
    const { run, shape } = setup();
    run((edit) => setField(edit, shape('orphan'), 1, { nullable: true }));
    expect(labels(fieldsOf(shape('orphan')))).toEqual(['id', 'name']);
    expect(fieldsOf(shape('orphan'))[0]!.kind).toBe('pk');
  });

  it('taille M, comme sur le modèle', () => {
    const { run, shape } = setup();
    run((edit) => setTableLevel(edit, shape('role'), 'M'));
    expect(shape('role').bounds.height).toBe(68.8);
  });
});

describe('mode RDD : options d’un champ selon la table (sujet 277)', () => {
  it('« Unique » refusé par setField sur une vue ; accepté sur une entité', () => {
    const { run, shape } = setup();
    expect(run((edit) => setField(edit, shape('active'), 0, { unique: true }))).toBe(false);
    expect(fieldsOf(shape('active'))[0]!.unique).toBeUndefined();
    run((edit) => setField(edit, shape('user'), 1, { unique: true }));
    expect(fieldsOf(shape('user'))[1]!.unique).toBe(true);
  });

  it('largeur mesurée par la mesure du moteur qui opère (sujet 377) : deux moteurs ne se gênent pas', () => {
    const widthWith = (measureText: (text: string) => number) => {
      const { tree, page } = setup();
      const operation = (edit: ModeEdit) =>
        setFields(
          edit,
          edit.page.shapes.find((s) => s.id === 'model')!,
          'name',
        );
      applyModeEdit(page(), tree.pages[0]!, RDD_KEYS, operation, { ...DEFAULT_MODE_EDIT_CONTEXT, measureText });
      return documentFromTree(tree).pages[0]!.shapes.find((s) => s.id === 'model')!.bounds.width;
    };
    // Label et type mesurés chacun 200 (puis 300) : la ligne du champ fait la largeur.
    expect(widthWith(() => 200)).toBe(onGrid(6 + 12 + 4 + 200 + 6 + 200 + 6));
    expect(widthWith(() => 300)).toBe(onGrid(6 + 12 + 4 + 300 + 6 + 300 + 6));
  });
});
