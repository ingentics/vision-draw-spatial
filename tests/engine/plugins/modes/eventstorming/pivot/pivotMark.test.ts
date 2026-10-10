import { describe, expect, it } from 'vitest';
import {
  PIVOT_MARK,
  pivotMark,
  pivotMarkRect,
} from '../../../../../../src/engine/plugins/modes/eventstorming/pivot/pivotMark';
import { labelZone } from '../../../../../../src/engine/plugins/modes/eventstorming/shapes/common/stickyLayout';

describe('mode Event storming : icône du pivot Oui (sujet 516)', () => {
  const bounds = { x: 100, y: 50, width: 160, height: 160 };

  it('20 × 20 à 7 des bords haut et droit', () => {
    expect(pivotMarkRect(bounds)).toEqual({ x: 233, y: 57, width: 20, height: 20 });
  });

  it('le label du type s’arrête avant l’icône', () => {
    const zone = labelZone(bounds, pivotMarkRect(bounds).x - PIVOT_MARK.gap);
    expect(zone.x + zone.width).toBe(230);
    expect(labelZone(bounds).width).toBe(144);
  });

  it('cube dessiné pour Oui', () => {
    const mark = pivotMark(bounds);
    expect(mark.name).toBe('pivot-mark');
    expect(mark.children.length).toBeGreaterThan(0);
  });
});
