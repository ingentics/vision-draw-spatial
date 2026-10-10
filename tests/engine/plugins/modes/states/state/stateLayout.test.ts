import { describe, expect, it } from 'vitest';
import { approximateMeasure } from '../../../../../../src/engine/core/render/richLayout';
import {
  STATE,
  TITLE_FONT,
  bodyLines,
  bodyZone,
  dividerY,
  fittedHeight,
  titleLines,
  titleZone,
} from '../../../../../../src/engine/plugins/modes/states/state/stateLayout';
import { setup } from '../helpers';

/** Hauteur d'une ligne de contenu. */
const LINE = STATE.bodySize * STATE.lineHeight;

describe('mode Machine à états : mise en page d’un état (sujet 433)', () => {
  it('sans contenu : le titre occupe tout l’état, ni trait ni zone de contenu', () => {
    const { shape } = setup();
    const state = shape('state1');
    expect(dividerY(state)).toBeUndefined();
    expect(bodyZone(state)).toBeUndefined();
    expect(titleZone(state)).toEqual({ x: 126, y: 40, width: 128, height: 60 });
  });

  it('avec contenu : le contenu en bas (une hauteur de ligne par ligne, marges), le titre au-dessus du trait', () => {
    const { shape } = setup();
    const state = shape('state2');
    const height = 2 * LINE + 2 * STATE.padding;
    expect(dividerY(state)).toBeCloseTo(40 + 69 - height);
    expect(bodyZone(state)).toMatchObject({ x: 366, width: 128 });
    expect(bodyZone(state)!.height).toBeCloseTo(2 * LINE);
    expect(titleZone(state).height).toBeCloseTo(69 - height);
  });

  it('lignes du contenu : lignes vides de la fin retirées, celles du milieu gardées', () => {
    expect(bodyLines('a\n\nb\n\n  ')).toEqual(['a', '', 'b']);
    expect(bodyLines('  \n')).toEqual([]);
  });

  it('titre coupé entre les mots à la largeur de sa zone, et à chaque ligne saisie', () => {
    const width = approximateMeasure('Accumulate Enough', TITLE_FONT);
    expect(titleLines('Accumulate Enough Data', width, approximateMeasure)).toEqual(['Accumulate Enough', 'Data']);
    expect(titleLines('A\nB', 500, approximateMeasure)).toEqual(['A', 'B']);
    // Un mot plus large que la zone reste seul sur sa ligne.
    expect(titleLines('Anticonstitutionnellement x', 10, approximateMeasure)).toEqual([
      'Anticonstitutionnellement',
      'x',
    ]);
  });

  it('hauteur ajustée : au moins 60 sans contenu, titre (au moins 30) plus contenu sinon', () => {
    const { shape } = setup();
    expect(fittedHeight(shape('state1'), '', approximateMeasure)).toBe(60);
    expect(fittedHeight(shape('state1'), 'a\nb', approximateMeasure)).toBe(
      Math.ceil(30 + 2 * LINE + 2 * STATE.padding),
    );
    // Titre de deux lignes saisies : plus haut que le minimum de 30.
    const title = 2 * STATE.titleSize * STATE.lineHeight + 2 * STATE.padding;
    expect(fittedHeight(shape('s4'), 'x', approximateMeasure)).toBe(Math.ceil(title + LINE + 2 * STATE.padding));
  });
});
