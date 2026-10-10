import { describe, expect, it } from 'vitest';
import { pluginValues } from '../../../../../../src/engine/core/settings/pluginSettings';
import { definition as states } from '../../../../../../src/engine/plugins/modes/states';
import {
  ERROR_COLOR,
  EXIT_PROPERTY,
  isErrorExit,
} from '../../../../../../src/engine/plugins/modes/states/exits/exitKind';
import { setup } from '../helpers';

describe('mode Machine à états : sortie attendue ou en erreur (sujets 433, 434)', () => {
  it('choix montré seulement sur un point de sortie ; « En erreur » écrit le booléen et la couleur pour draw.io', () => {
    const { run, page, shape } = setup();
    expect(EXIT_PROPERTY.hidden!(page(), shape('final1'))).toBe(false);
    expect(EXIT_PROPERTY.hidden!(page(), shape('init1'))).toBe(true);
    expect(EXIT_PROPERTY.hidden!(page(), shape('state1'))).toBe(true);
    expect(EXIT_PROPERTY.value!(page(), shape('final1'))).toBe('');
    run((edit) => void EXIT_PROPERTY.write!(edit, shape('final1'), '1'));
    expect(isErrorExit(shape('final1'))).toBe(true);
    expect(shape('final1').style).toMatchObject({
      'spatial.sm.error': '1',
      fillColor: ERROR_COLOR,
      strokeColor: ERROR_COLOR,
    });
    run((edit) => void EXIT_PROPERTY.write!(edit, shape('final1'), ''));
    expect(shape('final1').style['spatial.sm.error']).toBeUndefined();
    expect(shape('final1').style).toMatchObject({ fillColor: '#000000', strokeColor: '#000000' });
  });

  it('les transitions vers une sortie en erreur sont dessinées en rouge, les autres gardent leur style', () => {
    const { page } = setup();
    const dressing = states.dressing!(page(), pluginValues(states.settings, undefined));
    const color = (id: string) => dressing.edgeColor!(page().edges.find((edge) => edge.id === id)!);
    expect(color('t11')).toBe(ERROR_COLOR);
    expect(color('t10')).toBeUndefined();
    expect(color('t2')).toBeUndefined();
    expect(dressing.edgeDarken).toBe(0);
  });
});
