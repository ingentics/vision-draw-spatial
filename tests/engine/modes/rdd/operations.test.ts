import { describe, expect, it } from 'vitest';
import { FIELDS, SECONDARY } from '../../../../src/engine/modes/rdd/tables';
import { setField, setSecondary } from '../../../../src/engine/modes/rdd/operations';
import { spatialValue } from '../../../../src/engine/spatial';
import { rowWidth, onGrid, contentWidth, widthOf, setFields, labels, fieldsOf, setup } from './helpers';

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
    expect(spatialValue(shape('model'), FIELDS)).toBeUndefined();
    expect(shape('model').bounds.height).toBe(46);
  });

  it('table secondaire : taille du contenu × 0,8 depuis le coin haut-gauche, puis ÷ 0,8 ; entête et texte suivent', () => {
    const { run, shape } = setup();
    const content = contentWidth(rowWidth('created_at', 'Phrase'), rowWidth('updated_at', 'Phrase'));
    const width = onGrid(content);
    run((edit) => setSecondary(edit, shape('timestamped'), true));
    const small = shape('timestamped');
    expect(spatialValue(small, SECONDARY)).toBe('1');
    expect(small.bounds).toEqual({ x: 240, y: 40, width: onGrid(content * 0.8), height: 52.8 });
    expect([small.style.startSize, small.style.fontSize]).toEqual(['20.8', '9.6']);
    // Un champ de plus : lignes à l'échelle de la table secondaire.
    run((edit) => setFields(edit, shape('timestamped'), 'created_at\nupdated_at\ndeleted_at'));
    expect(shape('timestamped').bounds.height).toBe(68.8);
    run((edit) => setSecondary(edit, shape('timestamped'), false));
    const back = shape('timestamped');
    expect(spatialValue(back, SECONDARY)).toBeUndefined();
    expect(back.bounds).toEqual({ x: 240, y: 40, width, height: 86 });
    expect([back.style.startSize, back.style.fontSize]).toEqual(['26', '12']);
    expect(run((edit) => setSecondary(edit, shape('timestamped'), false))).toBe(false);
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

  it('table secondaire, comme sur le modèle', () => {
    const { run, shape } = setup();
    run((edit) => setSecondary(edit, shape('role'), true));
    expect(shape('role').bounds.height).toBe(68.8);
  });
});
