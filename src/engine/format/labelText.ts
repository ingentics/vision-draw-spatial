/**
 * Conversion des labels HTML draw.io (`html=1`) en texte brut (SPEC §7.1, suffisant en M1).
 * Volontairement sans DOM : le moteur doit tourner hors navigateur.
 */

const BLOCK_TAGS = 'div|p|li|ul|ol|tr|table|h[1-6]|blockquote|pre';
const BLOCK_RE = new RegExp(`</?(?:${BLOCK_TAGS})\\b[^>]*>`, 'gi');
const BREAK = '\u0000';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

export function htmlToText(html: string): string {
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(BLOCK_RE, BREAK)
    .replace(/<[^>]*>/g, '')
    // Plusieurs frontières de blocs consécutives ne valent qu'un saut de ligne.
    .replace(new RegExp(`(?:[ \\t]*${BREAK}[ \\t]*)+`, 'g'), BREAK)
    .replace(new RegExp(`^${BREAK}|${BREAK}$`, 'g'), '')
    .replaceAll(BREAK, '\n');
  return decodeEntities(text)
    .replace(/\u00a0/g, ' ')
    .trim();
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Remplace les `%nom%` d'un label par les attributs de l'objet (`placeholders=1`).
 * `%%` produit un `%` littéral ; un nom inconnu est laissé tel quel.
 */
export function resolvePlaceholders(label: string, attributes: Record<string, string>): string {
  return label.replace(/%([^%\s]*)%/g, (match, name: string) => {
    if (name === '') return '%';
    return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name]! : match;
  });
}
