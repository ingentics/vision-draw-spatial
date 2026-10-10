import { describe, expect, it } from 'vitest';
import { approximateMeasure } from '../../../../../../src/engine/core/render/richLayout';
import { definition as states } from '../../../../../../src/engine/plugins/modes/states';
import { BODY_PART, stateBody } from '../../../../../../src/engine/plugins/modes/states/state/bodyText';
import { setBody, withBody } from '../../../../../../src/engine/plugins/modes/states/state/stateBody';
import { STATE } from '../../../../../../src/engine/plugins/modes/states/state/stateLayout';
import { setup } from '../helpers';

const LINE = STATE.bodySize * STATE.lineHeight;
const sizing = { gridSize: 10, measureText: approximateMeasure };

describe('mode Machine à états : contenu d’un état (sujet 433)', () => {
  it('lu de spatial.sm.body (chaîne JSON) ; une valeur qui n’en est pas une est lue telle quelle', () => {
    const { shape } = setup();
    expect(stateBody(shape('state2'))).toBe('entry / ouvrir\nexit / fermer');
    expect(stateBody(shape('state1'))).toBe('');
    expect(stateBody({ ...shape('state1'), style: { 'spatial.sm.body': 'brut' } })).toBe('brut');
  });

  it('écrit : le texte revient tel quel (« ; » compris) et l’état grandit ; vide, l’attribut est retiré', () => {
    const { run, shape } = setup();
    run((edit) => setBody(edit, shape('state1'), 'a; b\nc'));
    expect(stateBody(shape('state1'))).toBe('a; b\nc');
    expect(shape('state1').bounds.height).toBe(Math.ceil(30 + 2 * LINE + 2 * STATE.padding));
    run((edit) => setBody(edit, shape('state1'), '  '));
    expect(shape('state1').style['spatial.sm.body']).toBeUndefined();
    expect(shape('state1').bounds.height).toBe(60);
  });

  it('aperçu de la saisie : l’état avec ce contenu et sa hauteur, rien d’écrit', () => {
    const { shape } = setup();
    const preview = withBody(shape('state1'), 'x\ny\nz', sizing);
    expect(stateBody(preview)).toBe('x\ny\nz');
    expect(preview.bounds.height).toBe(Math.ceil(30 + 3 * LINE + 2 * STATE.padding));
    expect(shape('state1').bounds.height).toBe(60);
  });

  it('double-clic dans la zone du contenu : son texte sur place, en plusieurs lignes ; ailleurs, le titre', () => {
    const { page, shape } = setup();
    const parts = states.parts!;
    const state = shape('state2');
    expect(parts.textAt!(page(), state, { x: 400, y: 100 })).toBe(BODY_PART);
    expect(parts.textAt!(page(), state, { x: 400, y: 50 })).toBeUndefined();
    expect(parts.textAt!(page(), shape('state1'), { x: 150, y: 90 })).toBeUndefined();
    expect(parts.text!(page(), state, BODY_PART)).toMatchObject({
      text: 'entry / ouvrir\nexit / fermer',
      multiline: true,
      fontSize: STATE.bodySize,
    });
  });

  it('champ « Contenu » du panneau : seulement sur un état, écrit par l’opération du mode', () => {
    const { run, page, shape } = setup();
    const field = states.gestures!.properties!.find((property) => property.key === 'body')!;
    expect(field.hidden!(page(), shape('state1'))).toBe(false);
    expect(field.hidden!(page(), shape('state3'))).toBe(true);
    expect(field.hidden!(page(), shape('init1'))).toBe(true);
    expect(field.value!(page(), shape('state2'))).toBe('entry / ouvrir\nexit / fermer');
    run((edit) => void field.write!(edit, shape('state1'), 'nouveau'));
    expect(stateBody(shape('state1'))).toBe('nouveau');
  });
});
