import { describe, expect, it } from 'vitest';
import { snapMove, snapResize } from '../../../../src/engine/core/edit/edgeSnap';

describe('aimantation bord à bord (sujet 477)', () => {
  const target = { x: 200, y: 0, width: 160, height: 160 };

  it('déplacement : un bord proche du bord opposé d’une cible s’y colle (écart 0), par axe', () => {
    // Bord droit à 195, cible à 200 : +5.
    expect(snapMove([{ x: 35, y: 10, width: 160, height: 160 }], [target], 8)).toEqual({ x: 5, y: 0 });
    // Bord gauche à 366, bord droit de la cible à 360 : -6. Bord haut à 165 sous la cible (bas à 160) : -5.
    expect(snapMove([{ x: 366, y: 0, width: 160, height: 160 }], [target], 8)).toEqual({ x: -6, y: 0 });
    expect(snapMove([{ x: 220, y: 165, width: 160, height: 160 }], [target], 8)).toEqual({ x: 0, y: -5 });
  });

  it('seuil : au-delà, rien ; le plus proche l’emporte', () => {
    expect(snapMove([{ x: 30, y: 0, width: 160, height: 160 }], [target], 8)).toEqual({ x: 0, y: 0 });
    const near = { x: 193, y: 0, width: 10, height: 10 };
    expect(snapMove([{ x: 35, y: 0, width: 160, height: 160 }], [target, near], 8)).toEqual({ x: -2, y: 0 });
  });

  it('sans recouvrement sur l’autre axe (coin seul, à distance), pas d’aimantation', () => {
    expect(snapMove([{ x: 35, y: 165, width: 160, height: 160 }], [target], 8)).toEqual({ x: 0, y: 0 });
    // Bords alignés du même côté (gauche contre gauche) : pas un contact.
    expect(snapMove([{ x: 203, y: 300, width: 160, height: 160 }], [target], 8)).toEqual({ x: 0, y: 0 });
  });

  it('redimensionnement : seuls les côtés tirés se collent, sans passer sous la taille minimale', () => {
    const rect = { x: 0, y: 0, width: 194, height: 160 };
    expect(snapResize(rect, ['e'], [target], 8, 10)).toEqual({ x: 0, y: 0, width: 200, height: 160 });
    expect(snapResize(rect, ['w'], [target], 8, 10)).toEqual(rect);
    const left = { x: 365, y: 0, width: 100, height: 160 };
    expect(snapResize(left, ['w', 'n'], [target], 8, 10)).toEqual({ x: 360, y: 0, width: 105, height: 160 });
    expect(snapResize({ x: 196, y: 0, width: 2, height: 160 }, ['e'], [{ ...target, x: 190 }], 8, 10)).toEqual({
      x: 196,
      y: 0,
      width: 2,
      height: 160,
    });
  });
});
