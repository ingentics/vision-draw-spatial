import { describe, expect, it } from 'vitest';
import { definition as rdd } from '../../../../../../src/engine/plugins/modes/rdd';
import { fieldParts } from '../../../../../../src/engine/plugins/modes/rdd/editing/fieldParts';
import { fieldHandles } from '../../../../../../src/engine/plugins/modes/rdd/editing/fieldHandles';
import { BODY_PART, documentBody, setBody } from '../../../../../../src/engine/plugins/modes/rdd/tables/documentBody';
import { setSecondary } from '../../../../../../src/engine/plugins/modes/rdd/tables/operations';
import { tableFields } from '../../../../../../src/engine/plugins/modes/rdd/tables/fieldModel';
import { createDefaultRegistry } from '../../../../../../src/engine/plugins';
import { writeDrawio } from '../../../../../../src/engine/core/format/write';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import { setup } from '../helpers';

/** Corps en texte libre d'un document RDD (sujet 269). Fixture : `settings` (document à clés `theme`, `locale`), `unnamed`. */

const YAML = 'theme: dark # couleurs; contraste\nlocale: fr\nlist:\n  - "a;b"';

describe('mode RDD : corps en texte libre d’un document (sujets 269, 352)', () => {
  it('écrit puis relu tel quel, `;` et retours à la ligne compris, aussi après un enregistrement', () => {
    const { run, shape, tree } = setup();
    run((edit) => setBody(edit, shape('unnamed'), YAML));
    expect(documentBody(shape('unnamed'))).toBe(YAML);
    expect(shape('unnamed').style['spatial.rdd.body']).not.toContain(';');
    const reread = readDrawio(writeDrawio(tree)).document.pages[0]!.shapes.find((s) => s.id === 'unnamed')!;
    expect(documentBody(reread)).toBe(YAML);
    // Vide : l'attribut est retiré.
    run((edit) => setBody(edit, shape('unnamed'), ''));
    expect(shape('unnamed').style['spatial.rdd.body']).toBeUndefined();
  });

  it('tabulations en deux espaces, fins de ligne `\\n` ; rien sur une table qui n’est pas un document', () => {
    const { run, shape } = setup();
    run((edit) => setBody(edit, shape('unnamed'), 'a:\r\n\tb: 1'));
    expect(documentBody(shape('unnamed'))).toBe('a:\n  b: 1');
    expect(run((edit) => setBody(edit, shape('user'), 'a: 1'))).toBe(false);
  });

  it('document à clés (sujet 181) : à l’ouverture, une ligne `clé:` par clé, champs retirés, taille gardée', () => {
    const { run, shape } = setup();
    const bounds = shape('settings').bounds;
    run((edit) => rdd.lifecycle!.opened!(edit));
    expect(documentBody(shape('settings'))).toBe('theme:\nlocale:');
    expect(shape('settings').style['spatial.rdd.fields']).toBeUndefined();
    expect(shape('settings').bounds).toEqual(bounds);
    expect(shape('unnamed').style['spatial.rdd.body']).toBeUndefined();
    // Une seconde ouverture ne change rien.
    expect(run((edit) => rdd.lifecycle!.opened!(edit))).toBe(false);
  });

  it('pas de champs : ni lignes, ni « + », ni parties, ni bouton de séparateur', () => {
    const { page, shape } = setup();
    const settings = shape('settings');
    expect(tableFields(settings)).toEqual([]);
    expect(fieldHandles(settings)).toEqual([]);
    expect(fieldParts.at(page(), settings, { x: 260, y: 336 })).toBeUndefined();
    const divider = rdd.gestures!.properties!.find((p) => p.key === 'rdd.addDivider')!;
    expect([divider.hidden!(page(), settings), divider.hidden!(page(), shape('user'))]).toEqual([true, false]);
  });

  it('double-clic dans le corps : édition multiligne en police à chasse fixe de 7 pt, sous l’entête', () => {
    const { run, page, shape } = setup();
    run((edit) => setBody(edit, shape('settings'), YAML));
    const settings = shape('settings');
    expect(fieldParts.textAt!(page(), settings, { x: 260, y: 340 })).toBe(BODY_PART);
    expect(fieldParts.textAt!(page(), settings, { x: 260, y: 310 })).toBeUndefined();
    expect(fieldParts.textAt!(page(), shape('user'), { x: 60, y: 210 })).toBeUndefined();
    expect(fieldParts.bounds(page(), settings, BODY_PART)).toBeUndefined();
    expect(fieldParts.text!(page(), settings, BODY_PART)).toEqual({
      text: YAML,
      zone: { x: 246, y: 329, width: 148, height: 34 },
      fontSize: 7,
      multiline: true,
      monospace: true,
    });
    run((edit) => fieldParts.setText!(edit, settings, BODY_PART, 'a:\n\tb: 1'));
    expect(documentBody(shape('settings'))).toBe('a:\n  b: 1');
    expect(documentBody(fieldParts.textPreview!(settings, BODY_PART, 'x: 1', 10))).toBe('x: 1');
  });

  it('panneau : « Document body », tout le texte, éditable ; masqué hors d’un document', () => {
    const { run, page, shape } = setup();
    const body = rdd.gestures!.properties!.find((p) => p.key === 'rdd.body')!;
    expect(body.type === 'text' && [body.section, body.multiline, body.monospace]).toEqual([
      'Document body',
      true,
      true,
    ]);
    expect([body.hidden!(page(), shape('settings')), body.hidden!(page(), shape('user'))]).toEqual([false, true]);
    run((edit) => body.write!(edit, shape('settings'), YAML));
    expect(body.value!(page(), shape('settings'))).toBe(YAML);
  });

  it('texte libre : aucun contrôle dans Diagnostics (sujet 352)', () => {
    const { run, page, shape } = setup();
    for (const text of ['a: 1\na: 2', 'a:\n\tb: [1, 2', 'du texte { quelconque']) {
      run((edit) => setBody(edit, shape('settings'), text));
      expect(rdd.lifecycle!.check!(page()).filter((issue) => issue.cellId === 'settings')).toEqual([]);
    }
  });

  it('taille libre : redimensionnable, taille par défaut à la pose, gardée au renommage ; secondaire : × 0,8', () => {
    const { run, shape } = setup();
    const registry = createDefaultRegistry();
    expect(registry.isResizable(shape('settings'))).toBe(true);
    const template = registry.templates().find((t) => t.id === 'rdd-document')!;
    expect([template.width, template.height]).toEqual([200, 120]);
    const bounds = shape('settings').bounds;
    run((edit) => rdd.gestures!.relabeled!(edit, 'settings'));
    expect(shape('settings').bounds).toEqual(bounds);
    run((edit) => setSecondary(edit, shape('settings'), true));
    expect(shape('settings').bounds).toEqual({ ...bounds, width: 128, height: 52.8 });
    run((edit) => setSecondary(edit, shape('settings'), false));
    expect(shape('settings').bounds).toEqual(bounds);
  });
});
