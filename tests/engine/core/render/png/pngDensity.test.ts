import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { pngDensity, withPngDensity } from '../../../../../src/engine/core/render/png/pngDensity';

/** PNG 1 × 1 px transparent, sans bloc pHYs. */
const PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
);

describe('résolution écrite dans le PNG (sujet 431)', () => {
  it('ajoute un bloc pHYs après l’en-tête, sans toucher à l’image', () => {
    expect(pngDensity(PNG)).toBeUndefined();
    const out = withPngDensity(PNG, 192);
    expect(pngDensity(out)).toBe(192);
    expect(String.fromCharCode(...out.subarray(37, 41))).toBe('pHYs');
    expect(out.length).toBe(PNG.length + 21);
    // Données de l'image intactes : le bloc IDAT se décompresse toujours.
    const idat = Buffer.from(out).indexOf('IDAT');
    const length = new DataView(out.buffer).getUint32(idat - 4);
    expect(inflateSync(out.subarray(idat + 4, idat + 4 + length)).length).toBe(5);
  });

  it('remplace une résolution déjà écrite', () => {
    const twice = withPngDensity(withPngDensity(PNG, 96), 144);
    expect(pngDensity(twice)).toBe(144);
    expect(twice.length).toBe(PNG.length + 21);
  });
});
