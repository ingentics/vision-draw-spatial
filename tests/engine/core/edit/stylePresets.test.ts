import { describe, expect, it } from 'vitest';
import {
  applyStylePreset,
  deriveStroke,
  drawioStyle,
  DRAWIO_STYLES,
  matchesPreset,
  PASTEL_STYLES,
  stylePresetChanges,
} from '../../../../src/engine/core/edit/stylePresets';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../src/engine/core/format/write';
import { fixture } from '../../../helpers';

const KNOWN = [...DRAWIO_STYLES, ...PASTEL_STYLES];
const style = (name: string) => DRAWIO_STYLES.find((p) => p.name === name)!;

describe('styles de forme', () => {
  it('palettes : 8 styles de base draw.io, 12 pastels au contour dérivé', () => {
    expect(DRAWIO_STYLES).toHaveLength(8);
    expect(style('Bleu')).toEqual({ name: 'Bleu', fillColor: '#dae8fc', strokeColor: '#6c8ebf' });
    expect(PASTEL_STYLES).toHaveLength(12);
    for (const preset of PASTEL_STYLES) expect(preset.strokeColor).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('contour dérivé : même teinte, plus sombre ; un gris donne un gris', () => {
    expect(deriveStroke('#f2f2f2')).toBe('#737373');
    const stroke = deriveStroke('#d8e4f0');
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(stroke.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(g!);
    expect(g).toBeGreaterThan(r!);
    expect(b).toBeLessThan(0xd8);
  });

  it('seules les clés qui changent ; fontColor du style, ou retirée si posée par la palette', () => {
    expect(stylePresetChanges({ fillColor: '#DAE8FC', strokeColor: '#6c8ebf' }, style('Bleu'), KNOWN)).toEqual({});
    expect(stylePresetChanges({}, style('Gris'), KNOWN)).toEqual({
      fillColor: '#f5f5f5',
      strokeColor: '#666666',
      fontColor: '#333333',
    });
    expect(stylePresetChanges({ fontColor: '#333333' }, style('Vert'), KNOWN)).toMatchObject({ fontColor: undefined });
    expect(stylePresetChanges({ fontColor: '#ff0000' }, style('Vert'), KNOWN)).not.toHaveProperty('fontColor');
  });

  it('cadre du nom de la couleur de la bordure : suit la nouvelle bordure ; autre couleur ou absent : intact (sujet 347)', () => {
    const region = { fillColor: '#dae8fc', strokeColor: '#6C8EBF', labelBorderColor: '#6c8ebf' };
    expect(stylePresetChanges(region, style('Vert'), KNOWN)).toMatchObject({ labelBorderColor: '#82b366' });
    expect(stylePresetChanges({ labelBorderColor: '#000000' }, style('Vert'), KNOWN)).toMatchObject({
      labelBorderColor: '#82b366',
    });
    expect(stylePresetChanges({ ...region, labelBorderColor: '#ff0000' }, style('Vert'), KNOWN)).not.toHaveProperty(
      'labelBorderColor',
    );
    expect(stylePresetChanges({ strokeColor: '#6c8ebf' }, style('Vert'), KNOWN)).not.toHaveProperty('labelBorderColor');
  });

  it('style courant : couleurs implicites de draw.io (blanc, noir) comprises', () => {
    expect(matchesPreset({}, style('Par défaut'))).toBe(true);
    expect(matchesPreset({ fillColor: '#F8CECC', strokeColor: '#b85450' }, style('Rouge'))).toBe(true);
    expect(matchesPreset({ fillColor: '#f8cecc' }, style('Rouge'))).toBe(false);
  });

  it('appliquer un style réécrit seulement fillColor / strokeColor / fontColor, le reste intact', () => {
    const tree = readDrawio(fixture('three-rectangles.drawio')).tree;
    const page = tree.pages[0]!;
    const before = page.cells.get('a')!.cell!.getAttribute('style')!;
    const shape = readDrawio(writeDrawio(tree)).document.pages[0]!.shapes.find((s) => s.id === 'a')!;
    expect(applyStylePreset(page, 'a', shape.style, style('Gris'), KNOWN)).toBe(true);
    const after = page.cells.get('a')!.cell!.getAttribute('style')!;
    const reread = readDrawio(writeDrawio(tree)).document.pages[0]!.shapes.find((s) => s.id === 'a')!;
    expect(reread.style).toMatchObject({ fillColor: '#f5f5f5', strokeColor: '#666666', fontColor: '#333333' });
    const untouched = (s: string) => s.split(';').filter((t) => t && !/^(fillColor|strokeColor|fontColor)=/.test(t));
    expect(untouched(after)).toEqual(untouched(before));
    expect(applyStylePreset(page, 'a', reread.style, style('Gris'), KNOWN)).toBe(false);
  });
});

describe('style de base par son nom (sujet 325)', () => {
  it('Gris : fond, contour et texte du préset', () => {
    expect(drawioStyle('Gris')).toEqual({
      name: 'Gris',
      fillColor: '#f5f5f5',
      strokeColor: '#666666',
      fontColor: '#333333',
    });
    expect(() => drawioStyle('Inconnu')).toThrow('style draw.io inconnu');
  });
});
