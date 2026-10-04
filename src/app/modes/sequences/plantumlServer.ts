/**
 * Serveur PlantUML en ligne (sujet 90) : le texte est compressé (deflate brut) puis encodé dans l'alphabet base64 de
 * PlantUML (`0-9A-Za-z-_`), et passe dans l'URL.
 */
export const PLANTUML_SERVER = 'https://www.plantuml.com/plantuml';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

export async function encodePlantUml(source: string): Promise<string> {
  const stream = new Blob([source]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [b1, b2 = 0, b3 = 0] = [bytes[i]!, bytes[i + 1], bytes[i + 2]];
    out +=
      ALPHABET[b1 >> 2]! +
      ALPHABET[((b1 & 0x3) << 4) | (b2 >> 4)]! +
      ALPHABET[((b2 & 0xf) << 2) | (b3 >> 6)]! +
      ALPHABET[b3 & 0x3f]!;
  }
  return out;
}

/** Rendu SVG du texte, et page de l'éditeur en ligne. */
export async function plantUmlUrls(source: string): Promise<{ svg: string; editor: string }> {
  const code = await encodePlantUml(source);
  return { svg: `${PLANTUML_SERVER}/svg/${code}`, editor: `${PLANTUML_SERVER}/uml/${code}` };
}
