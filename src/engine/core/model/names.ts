/**
 * Premier nom numéroté libre (sujet 307) : `prefix` suivi du plus petit numéro à partir de `start` qui n'est pas dans
 * `used` (ex. `Page-4`, `f2`, `Field1`).
 */
export function firstFreeName(prefix: string, used: Iterable<string>, start = 1): string {
  const taken = new Set(used);
  let n = start;
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/**
 * Texte sur une ligne (nom dans un message, une liste, un export) : blancs et retours à la ligne réduits à une espace,
 * bouts retirés.
 */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Nom d'un élément dans un message ou une liste : son label, sinon son id. */
export function elementName(element: { readonly label: string; readonly id: string }): string {
  return element.label || element.id;
}
