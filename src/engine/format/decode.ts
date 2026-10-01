import { deflateRaw, inflateRaw } from 'pako';

/**
 * Contenu compressé d'un `<diagram>` draw.io :
 * XML → encodeURIComponent → deflate raw → base64 (et l'inverse pour lire).
 */

export class DecodeError extends Error {
  override name = 'DecodeError';
}

/** Vrai si le texte ressemble à du XML en clair plutôt qu'à du base64. */
export function isPlainXml(text: string): boolean {
  return text.trimStart().startsWith('<');
}

export function decodeDiagram(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (isPlainXml(trimmed)) return trimmed;

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(trimmed);
  } catch (cause) {
    throw new DecodeError('Contenu de page ni XML ni base64 valide', { cause });
  }

  let inflated: string;
  try {
    inflated = new TextDecoder().decode(inflateRaw(bytes));
  } catch (cause) {
    throw new DecodeError('Décompression (inflate raw) impossible', { cause });
  }
  if (!inflated) throw new DecodeError('Décompression vide');

  // draw.io encode l'URI avant compression ; les anciens fichiers ne le font pas toujours.
  try {
    return decodeURIComponent(inflated);
  } catch {
    return inflated;
  }
}

export function encodeDiagram(xml: string): string {
  const bytes = deflateRaw(new TextEncoder().encode(encodeURIComponent(xml)));
  return bytesToBase64(bytes);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}
