import { describe, expect, it } from 'vitest';
import { stencilShape } from '../../../../src/engine/core/format/stencil';
import { parseStyle, resolveShapeKind } from '../../../../src/engine/core/format/style';
import { PLUG_SHAPE } from '../../../../src/engine/plugins/shapes/architecture/plug';

describe('parseStyle', () => {
  it('sépare noms et paires clé=valeur', () => {
    expect(parseStyle('ellipse;whiteSpace=wrap;html=1;')).toEqual({
      names: ['ellipse'],
      values: { whiteSpace: 'wrap', html: '1' },
    });
  });

  it('tolère chaîne vide, null, tokens vides et espaces', () => {
    expect(parseStyle('')).toEqual({ names: [], values: {} });
    expect(parseStyle(null)).toEqual({ names: [], values: {} });
    expect(parseStyle(' ;; fillColor = #fff ;')).toEqual({ names: [], values: { fillColor: ' #fff' } });
  });

  it('ne coupe que sur le premier "="', () => {
    expect(parseStyle('image=data:image/svg+xml,PHN2Zz0=;').values.image).toBe('data:image/svg+xml,PHN2Zz0=');
  });

  it('garde la dernière valeur en cas de doublon', () => {
    expect(parseStyle('a=1;a=2').values.a).toBe('2');
  });
});

describe('resolveShapeKind', () => {
  const kind = (s: string) => resolveShapeKind(parseStyle(s));

  it('rectangle par défaut', () => {
    expect(kind('')).toBe('rectangle');
    expect(kind('rounded=1;whiteSpace=wrap;')).toBe('rectangle');
  });

  it('premier nom de style', () => {
    expect(kind('ellipse;html=1')).toBe('ellipse');
    expect(kind('text;html=1')).toBe('text');
    expect(kind('group')).toBe('group');
    expect(kind('rhombus;whiteSpace=wrap')).toBe('rhombus');
  });

  it('shape= explicite prioritaire, avec alias', () => {
    expect(kind('ellipse;shape=doubleEllipse')).toBe('doubleEllipse');
    expect(kind('shape=cylinder3;html=1')).toBe('cylinder3');
    expect(kind('shape=rect')).toBe('rectangle');
    expect(kind('shape=mxgraph.aws4.lambda')).toBe('mxgraph.aws4.lambda');
  });

  it('stencil embarqué : nom de son XML, valeur brute s’il est illisible', () => {
    const shape = stencilShape('<shape name="plug" w="10" h="10"><foreground><fillstroke/></foreground></shape>');
    expect(kind(`shape=${shape};whiteSpace=wrap;html=1;`)).toBe('stencil:plug');
    expect(kind(`shape=${PLUG_SHAPE};`)).toBe('stencil:plug');
    expect(kind('shape=stencil(pas-du-base64);')).toBe('stencil(pas-du-base64)');
  });
});
