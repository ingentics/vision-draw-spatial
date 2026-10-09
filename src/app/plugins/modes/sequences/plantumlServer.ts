/**
 * PlantUML en ligne (sujet 90) : le texte est compressé (deflate brut) puis encodé dans l'alphabet base64 de PlantUML
 * (`0-9A-Za-z-_`), et passe dans l'URL. Le rendu passe par le moteur choisi dans les paramètres (sujet 100) : kroki.io
 * par défaut (sujet 98 : la version bêta de plantuml.com mesure par moments le texte à zéro), plantuml.com, ou un
 * serveur PlantUML local (même API que plantuml.com). L'éditeur en ligne reste celui de plantuml.com.
 */
const PLANTUML_SERVER = 'https://www.plantuml.com/plantuml';

/** Moteur de rendu et serveur local (réglages du mode Séquences, `plantumlRenderer` et `plantumlUrl`, sujet 306). */
export interface PlantUmlSettings {
  renderer: string;
  localUrl: string;
}
const KROKI_SERVER = 'https://kroki.io';

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

/** Rendu SVG du texte par le moteur choisi (défaut : kroki.io), et page de l'éditeur en ligne (plantuml.com). */
export async function plantUmlUrls(
  source: string,
  settings: PlantUmlSettings = { renderer: 'kroki', localUrl: '' },
): Promise<{ svg: string; editor: string }> {
  const code = await encodePlantUml(source);
  const svg =
    settings.renderer === 'plantuml'
      ? `${PLANTUML_SERVER}/svg/${code}`
      : settings.renderer === 'local'
        ? `${settings.localUrl}/svg/${code}`
        : `${KROKI_SERVER}/plantuml/svg/${code}`;
  return { svg, editor: `${PLANTUML_SERVER}/uml/${code}` };
}
