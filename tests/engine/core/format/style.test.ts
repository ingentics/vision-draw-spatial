import { describe, expect, it } from 'vitest';
import { stencilShape } from '../../../../src/engine/core/format/stencil';
import { parseStyle, resolveShapeKind, setStyleKey, withStyleDefault } from '../../../../src/engine/core/format/style';
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

describe('écriture d’une clé dans une chaîne de style (sujet 383)', () => {
  it('en place : la clé garde sa position, sinon ajoutée à la fin, avec le « ; » final d’origine', () => {
    expect(setStyleKey('rounded=0;fillColor=#fff;html=1;', 'fillColor', '#000')).toBe(
      'rounded=0;fillColor=#000;html=1;',
    );
    expect(setStyleKey('text;html=1;', 'fontSize', '12')).toBe('text;html=1;fontSize=12;');
    expect(setStyleKey('text;html=1', 'fontSize', '12')).toBe('text;html=1;fontSize=12');
    expect(setStyleKey('', 'fontSize', '12')).toBe('fontSize=12;');
  });

  it('undefined retire la clé (toutes ses occurrences) ; rien à changer : la chaîne d’origine à l’identique', () => {
    expect(setStyleKey('a=1;b=2;a=3;', 'a', undefined)).toBe('b=2;');
    expect(setStyleKey('a=1;', 'a', undefined)).toBe('');
    const style = 'a=1;;b=2';
    expect(setStyleKey(style, 'zz', undefined)).toBe(style);
    expect(setStyleKey(style, 'a', '1')).toBe(style);
  });

  it('défaut d’un élément créé : ajouté seulement si la clé manque, « ; » final comme draw.io', () => {
    expect(withStyleDefault('text;fontSize=20;', 'fontSize', '12')).toBe('text;fontSize=20;');
    expect(withStyleDefault('shape=mxgraph.basic.pentagon', 'fontSize', '12')).toBe(
      'shape=mxgraph.basic.pentagon;fontSize=12;',
    );
    expect(withStyleDefault('', 'fontSize', '12')).toBe('fontSize=12;');
  });
});
