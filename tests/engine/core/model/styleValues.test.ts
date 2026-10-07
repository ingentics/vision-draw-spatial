import { describe, expect, it } from 'vitest';
import { isHexColor } from '../../../../src/engine/core/model/styleValues';

describe('isHexColor (sujet 291)', () => {
  it('#rrggbb, casse libre ; ni forme courte, ni nom, ni absent', () => {
    expect(isHexColor('#dae8fc')).toBe(true);
    expect(isHexColor('#DAE8FC')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('#dae8fc ')).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
  });
});
