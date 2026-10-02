/**
 * Squelette draw.io vide et valide (SPEC §6 « Nouveau fichier ») : une page, le calque par défaut.
 * Il s'ouvre tel quel dans draw.io.
 */
export function createEmptyDrawio(pageName = 'Page-1', pageId = randomId()): string {
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return [
    '<mxfile host="drawio-spatial">',
    `  <diagram id="${escape(pageId)}" name="${escape(pageName)}">`,
    '    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">',
    '      <root>',
    '        <mxCell id="0" />',
    '        <mxCell id="1" parent="0" />',
    '      </root>',
    '    </mxGraphModel>',
    '  </diagram>',
    '</mxfile>',
    '',
  ].join('\n');
}

/** Identifiant au format de draw.io (20 caractères alphanumériques, `-` et `_`). */
export function randomId(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const bytes = new Uint8Array(20);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
