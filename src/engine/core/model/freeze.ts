/**
 * Gel en profondeur des objets simples (sujet 303) : objets littéraux et tableaux, pas leurs fonctions ni les objets
 * d'une classe (ex. objets Three.js, fabrique de textes), qui gardent leur état propre. Une écriture lève alors une
 * exception (mode strict des modules).
 */
export function freezePlain<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezePlain(child);
  return value;
}
