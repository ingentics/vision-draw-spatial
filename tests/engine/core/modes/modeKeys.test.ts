import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { modeKey, modeKeys } from '../../../../src/engine/core/modes/modeKeys';

const OWNER = { namespace: 'seq' };

const XML = `<mxfile><diagram id="p" name="P" spatial.mode="sequences" spatial.seq.flows="[]"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="inStyle" edge="1" parent="1" style="endArrow=classic;spatial.seq.flow=f1;"><mxGeometry relative="1" as="geometry"/></mxCell>
<object id="inObject" label="" spatial.seq.flow="f2"><mxCell edge="1" parent="1" style="endArrow=classic;"><mxGeometry relative="1" as="geometry"/></mxCell></object>
<mxCell id="other" edge="1" parent="1" style="spatial.step=3;"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

describe('clés d’un mode (sujet 301)', () => {
  it('nom court préfixé par l’espace de noms ; nom invalide ou déjà complet refusé', () => {
    expect(modeKey('seq', 'flow')).toBe('spatial.seq.flow');
    expect(modeKey('rdd', 'field.type')).toBe('spatial.rdd.field.type');
    for (const name of ['spatial.flow', 'a;b', 'a=b', 'a b', '', '1a'])
      expect(() => modeKey('seq', name), name).toThrow('clé de mode invalide');
  });

  it('lecture : clé complète dans le style ou l’objet ; une clé hors de l’espace de noms n’est pas lue', () => {
    const page = readDrawio(XML).document.pages[0]!;
    const keys = modeKeys(OWNER);
    const edge = (id: string) => page.edges.find((e) => e.id === id)!;
    expect(keys.value(edge('inStyle'), 'flow')).toBe('f1');
    expect(keys.value(edge('inObject'), 'flow')).toBe('f2');
    expect(keys.value(edge('other'), 'step')).toBeUndefined();
    expect(keys.pageValue(page, 'flows')).toBe('[]');
    expect(keys.flag({ style: { 'spatial.seq.on': '1' }, attributes: {} }, 'on')).toBe(true);
    expect(keys.key('flow')).toBe('spatial.seq.flow');
  });

  it('nombre : fini ou absent ; drapeau de page : défaut éteint (« 1 ») ou allumé (sauf « 0 »)', () => {
    const keys = modeKeys(OWNER);
    const at = (text: string | undefined) => ({
      style: (text === undefined ? {} : { 'spatial.seq.step': text }) as Record<string, string>,
      attributes: {},
    });
    expect(keys.number(at('3'), 'step')).toBe(3);
    expect(keys.number(at('-1.5'), 'step')).toBe(-1.5);
    for (const text of [undefined, '', '  ', 'x', 'Infinity']) expect(keys.number(at(text), 'step')).toBeUndefined();
    const pageWith = (text: string | undefined) => ({
      attributes: (text === undefined ? {} : { 'spatial.seq.shown': text }) as Record<string, string>,
    });
    expect(keys.pageFlag(pageWith(undefined), 'shown')).toBe(false);
    expect(keys.pageFlag(pageWith('1'), 'shown')).toBe(true);
    expect(keys.pageFlag(pageWith('0'), 'shown')).toBe(false);
    expect(keys.pageFlag(pageWith(undefined), 'shown', true)).toBe(true);
    expect(keys.pageFlag(pageWith('1'), 'shown', true)).toBe(true);
    expect(keys.pageFlag(pageWith('0'), 'shown', true)).toBe(false);
  });
});
