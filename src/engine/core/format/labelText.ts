/**
 * Texte des labels draw.io : entités HTML, champs `%nom%` (texte brut d'un label HTML : `htmlToText`, `richText.ts`).
 * Volontairement sans DOM : le moteur doit tourner hors navigateur.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

/**
 * Texte saisi réduit à des blancs (espaces, lignes vides) : vide. Ses lignes vides ne s'affichent pas ; le label
 * est retiré (texte d'une flèche) ou vidé.
 */
export function emptyIfBlank(text: string): string {
  return text.trim() === '' ? '' : text;
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
