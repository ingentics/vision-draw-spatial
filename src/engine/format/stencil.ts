import { decodeDiagram, encodeDiagram } from './decode';

/**
 * Stencils embarqués dans le style (`shape=stencil(…)`) : XML `<shape name="…">` compressé comme le contenu d'une
 * page draw.io (`Graph.compress` : `encodeURIComponent`, deflate raw, base64).
 */

/** Noms déjà décodés : le même stencil revient sur chaque forme qui l'utilise. */
const names = new Map<string, string | undefined>();

/** Nom (`<shape name="…">`) du stencil de `shape=stencil(<description>)` ; `undefined` s'il est illisible. */
export function stencilName(description: string): string | undefined {
  if (names.has(description)) return names.get(description);
  let name: string | undefined;
  try {
    name = /<shape\b[^>]*\bname="([^"]+)"/.exec(decodeDiagram(description))?.[1];
  } catch {
    name = undefined;
  }
  names.set(description, name);
  return name;
}

/** Valeur de `shape=` pour un stencil embarqué : `stencil(<XML compressé>)`. */
export function stencilShape(xml: string): string {
  return `stencil(${encodeDiagram(xml)})`;
}
