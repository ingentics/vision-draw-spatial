import { describe, expect, it } from 'vitest';
import { definition as rdd } from '../../../../../../src/engine/plugins/modes/rdd';
import { readableOn } from '../../../../../../src/engine/core/render/styleColors';
import { DRAWIO_STYLES } from '../../../../../../src/engine/core/edit/stylePresets';
import {
  DEFAULT_REGION_STYLE,
  REGION_STYLES,
  setRegionStyle,
} from '../../../../../../src/engine/plugins/modes/rdd/regions/regionLayout';
import { setup } from '../helpers';

describe('mode RDD : région (sujet 182)', () => {
  it('aucun réglage du mode sur une région : sa couleur est dans la section Style (sujet 345)', () => {
    const { page, shape } = setup();
    expect(rdd.gestures!.properties!.filter((p) => !p.part).every((p) => p.hidden!(page(), shape('accounts')))).toBe(
      true,
    );
  });

  it('styles des régions : ceux de l’appli à partir de Bleu, en boucle (sujet 345)', () => {
    expect(REGION_STYLES.map((s) => s.name)).toEqual([
      'Bleu',
      'Vert',
      'Orange',
      'Jaune',
      'Rouge',
      'Violet',
      'Par défaut',
      'Gris',
    ]);
    expect(DEFAULT_REGION_STYLE).toBe(DRAWIO_STYLES[2]);
  });

  it('style écrit : fond, bordure et cadre du nom du style ; fond opaque', () => {
    const { run, shape } = setup();
    const green = REGION_STYLES[1]!;
    run((edit) => setRegionStyle(edit, shape('accounts'), green));
    expect(shape('accounts').style).toMatchObject({
      fillColor: '#d5e8d4',
      strokeColor: '#82b366',
      labelBorderColor: '#82b366',
      fontColor: '#000000',
    });
    expect(shape('accounts').style.labelBackgroundColor).toBeUndefined();
    // Couleur du texte du style s'il en a une (Gris) ; un ancien fillOpacity est retiré (sujet 232).
    run((edit) => edit.setElementStyle('accounts', 'fillOpacity', '10'));
    run((edit) => setRegionStyle(edit, shape('accounts'), REGION_STYLES[7]!));
    expect(shape('accounts').style.fontColor).toBe('#333333');
    expect(shape('accounts').style.fillOpacity).toBeUndefined();
    // Sur un fond léger (fichier d'avant), le texte se lit sur le fond posé sur du blanc.
    expect(readableOn('#1f3a5f', 0.1)).toBe('#000000');
  });
});
