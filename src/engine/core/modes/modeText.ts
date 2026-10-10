import type { ModeKeys } from './modeKeys';

/**
 * Texte libre multiligne d'une forme, rangé dans une clé de mode (sujet 448 ; corps d'un document RDD, contenu d'un
 * état) : en chaîne JSON (retours à la ligne en `\n`) dont les `;`, séparateurs du style draw.io, sont échappés en
 * `;` : le texte revient tel quel. Seul l'import compte, draw.io ne le dessine pas.
 */
export interface ModeText {
  /** Nom court de la clé (`ModeEdit.setElementAttribute`, propriété du panneau). */
  readonly name: string;
  /** Texte de la forme ; vide s'il n'en a pas. Une valeur qui n'est pas une chaîne JSON (fichier modifié) est lue telle quelle. */
  read(shape: { style: Record<string, string>; attributes: Record<string, string> }): string;
  /** Texte saisi remis en forme : fins de ligne `\n`, tabulations en deux espaces (alignement en chasse fixe). */
  normalize(text: string): string;
  /** Valeur écrite du texte saisi, remis en forme ; undefined (clé retirée) pour un texte vide ou blanc. */
  value(text: string): string | undefined;
  /** Forme portant dans son style le texte saisi (aperçu de la saisie), rien d'écrit. */
  preview<T extends { style: Record<string, string> }>(shape: T, text: string): T;
}

const TAB = '  ';

export function modeText(keys: ModeKeys, name: string): ModeText {
  const normalize = (text: string) => text.replace(/\r\n?/g, '\n').replaceAll('\t', TAB);
  const value = (text: string) => {
    const normalized = normalize(text);
    return normalized.trim() ? JSON.stringify(normalized).replaceAll(';', '\\u003b') : undefined;
  };
  return {
    name,
    read(shape) {
      const raw = keys.value(shape, name);
      if (!raw) return '';
      try {
        const text: unknown = JSON.parse(raw);
        return typeof text === 'string' ? text : raw;
      } catch {
        return raw;
      }
    },
    normalize,
    value,
    preview(shape, text) {
      const { [keys.key(name)]: _previous, ...style } = shape.style;
      const written = value(text);
      return { ...shape, style: written === undefined ? style : { ...style, [keys.key(name)]: written } };
    },
  };
}
