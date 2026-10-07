/**
 * Gel en profondeur des objets simples (sujet 303) : objets littéraux et tableaux, pas leurs fonctions ni les objets
 * d'une classe (ex. objets Three.js, fabrique de textes), qui gardent leur état propre. Une écriture lève alors une
 * exception (mode strict des modules).
 */
/**
 * Pages du modèle tenues par le document, gelées en dev et en test (sujet 312) : une écriture d'un plugin, ou du tronc
 * hors d'une copie de travail, y lève une exception. En production, le modèle reste tel quel (coût du gel).
 */
export function freezeModel<T>(value: T): T {
  return import.meta.env.DEV ? freezePlain(value) : value;
}

export function freezePlain<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezePlain(child);
  return value;
}
