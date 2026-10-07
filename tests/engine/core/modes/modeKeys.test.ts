import { describe, expect, it } from 'vitest';
import { documentFromTree, readDrawio } from '../../../../src/engine/core/format/parse';
import { migrateLegacyKeys, modeKey, modeKeys } from '../../../../src/engine/core/modes/modeKeys';

const OWNER = { namespace: 'seq', legacyKeys: ['flows', 'flow'] };

const XML = `<mxfile><diagram id="p" name="P" spatial.mode="sequences" spatial.flows="[]"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="inStyle" edge="1" parent="1" style="endArrow=classic;spatial.flow=f1;"><mxGeometry relative="1" as="geometry"/></mxCell>
<object id="inObject" label="" spatial.flow="f2"><mxCell edge="1" parent="1" style="endArrow=classic;"><mxGeometry relative="1" as="geometry"/></mxCell></object>
<mxCell id="both" edge="1" parent="1" style="spatial.flow=old;spatial.seq.flow=new;"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="other" edge="1" parent="1" style="spatial.step=3;"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

describe('clés d’un mode (sujet 301)', () => {
  it('nom court préfixé par l’espace de noms ; nom invalide ou déjà complet refusé', () => {
    expect(modeKey('seq', 'flow')).toBe('spatial.seq.flow');
    expect(modeKey('rdd', 'field.type')).toBe('spatial.rdd.field.type');
    for (const name of ['spatial.flow', 'a;b', 'a=b', 'a b', '', '1a'])
      expect(() => modeKey('seq', name), name).toThrow('clé de mode invalide');
  });

  it('lecture : la nouvelle clé, sinon l’ancienne pour un nom de `legacyKeys` seulement', () => {
    const page = readDrawio(XML).document.pages[0]!;
    const keys = modeKeys(OWNER);
    const edge = (id: string) => page.edges.find((e) => e.id === id)!;
    expect(keys.value(edge('inStyle'), 'flow')).toBe('f1');
    expect(keys.value(edge('inObject'), 'flow')).toBe('f2');
    expect(keys.value(edge('both'), 'flow')).toBe('new');
    // `step` n'est pas dans `legacyKeys` : l'ancienne clé n'est pas lue.
    expect(keys.value(edge('other'), 'step')).toBeUndefined();
    expect(keys.pageValue(page, 'flows')).toBe('[]');
    expect(keys.flag({ style: { 'spatial.seq.on': '1' }, attributes: {} }, 'on')).toBe(true);
    expect(keys.key('flow')).toBe('spatial.seq.flow');
  });

  it('migration : anciennes clés renommées à la même place, la nouvelle l’emporte, les autres clés intactes', () => {
    const { document, tree } = readDrawio(XML);
    expect(migrateLegacyKeys(document.pages[0]!, tree.pages[0]!, OWNER)).toBe(true);
    const page = documentFromTree(tree).pages[0]!;
    const edge = (id: string) => page.edges.find((e) => e.id === id)!;
    expect(page.attributes).toEqual({ 'spatial.mode': 'sequences', 'spatial.seq.flows': '[]' });
    expect(edge('inStyle').style).toMatchObject({ endArrow: 'classic', 'spatial.seq.flow': 'f1' });
    expect(edge('inStyle').style['spatial.flow']).toBeUndefined();
    expect(edge('inObject').attributes).toMatchObject({ 'spatial.seq.flow': 'f2' });
    expect(edge('inObject').attributes['spatial.flow']).toBeUndefined();
    expect(edge('both').style).toEqual({ 'spatial.seq.flow': 'new' });
    expect(edge('other').style).toEqual({ 'spatial.step': '3' });
    // Plus rien à migrer.
    expect(migrateLegacyKeys(page, tree.pages[0]!, OWNER)).toBe(false);
  });
});
