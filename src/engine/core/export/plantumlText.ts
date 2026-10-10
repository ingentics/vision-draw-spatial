/**
 * Texte PlantUML commun aux exports des modes (sujet 439) : chaque mode écrit son diagramme, ces briques échappent
 * les textes repris des formes et des flèches.
 */

/** Retours à la ligne en `\n` de PlantUML (le texte tient sur une ligne du diagramme). */
export function plantUmlLine(text: string): string {
  return text.trim().replace(/\r?\n/g, '\\n');
}

/** Nom entre guillemets (un guillemet du texte devient une apostrophe : PlantUML ne les échappe pas). */
export function plantUmlQuoted(text: string): string {
  return `"${plantUmlLine(text).replaceAll('"', "'")}"`;
}
