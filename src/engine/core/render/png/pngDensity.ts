/**
 * Résolution écrite dans un PNG (bloc `pHYs`, sujet 431) : une image 4K s'affiche à la même taille qu'en HD dans les
 * logiciels qui la lisent (traitement de texte, présentation), plus nette.
 */

/** Résolution d'un écran à densité 1 (référence CSS). */
export const BASE_DPI = 96;
const INCH = 0.0254;
const SIGNATURE_LENGTH = 8;

/** Copie du PNG avec un bloc `pHYs` à `dpi` (en pixels par mètre) juste après l'en-tête, remplaçant un éventuel ancien. */
export function withPngDensity(png: Uint8Array, dpi: number): Uint8Array {
  const chunks = pngChunks(png).filter((chunk) => chunk.type !== 'pHYs');
  const header = chunks.findIndex((chunk) => chunk.type === 'IHDR');
  if (header < 0) return png;
  const perMeter = Math.round(dpi / INCH);
  const data = new Uint8Array(9);
  const view = new DataView(data.buffer);
  view.setUint32(0, perMeter);
  view.setUint32(4, perMeter);
  data[8] = 1; // Unité : le mètre.
  const physical = chunk('pHYs', data);
  const parts = [png.subarray(0, SIGNATURE_LENGTH)];
  chunks.forEach((part, index) => {
    parts.push(png.subarray(part.start, part.end));
    if (index === header) parts.push(physical);
  });
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Blocs d'un PNG : type et étendue (longueur, type, données, CRC). */
function pngChunks(png: Uint8Array): Array<{ type: string; start: number; end: number }> {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks = [];
  for (let start = SIGNATURE_LENGTH; start + 12 <= png.length;) {
    const end = start + 12 + view.getUint32(start);
    chunks.push({ type: String.fromCharCode(...png.subarray(start + 4, start + 8)), start, end });
    start = end;
  }
  return chunks;
}

/** Bloc PNG complet : longueur, type, données, CRC du type et des données. */
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** CRC-32 du format PNG (polynôme 0xEDB88320). */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
