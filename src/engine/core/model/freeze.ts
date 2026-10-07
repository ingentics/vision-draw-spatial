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

/** Vues déjà rendues, par objet : toujours le même proxy pour le même objet (identité conservée entre deux lectures). */
const views = new WeakMap<object, object>();
const viewed = new WeakSet<object>();

const REFUSED = (action: string, key: PropertyKey) =>
  new TypeError(`${action} ${String(key)} : le modèle est en lecture seule pour un plugin`);

const readonlyHandler: ProxyHandler<object> = {
  get: (target, key) => view(Reflect.get(target, key) as unknown),
  set: (_target, key) => {
    throw REFUSED('Cannot assign to read only property', key);
  },
  deleteProperty: (_target, key) => {
    throw REFUSED('Cannot delete property', key);
  },
  defineProperty: (_target, key) => {
    throw REFUSED('Cannot define property', key);
  },
  setPrototypeOf: () => {
    throw new TypeError('Cannot set prototype : le modèle est en lecture seule pour un plugin');
  },
};

function view<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value) || viewed.has(value)) return value;
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) return value;
  let proxy = views.get(value);
  if (!proxy) {
    proxy = new Proxy(value, readonlyHandler);
    views.set(value, proxy);
    viewed.add(proxy);
  }
  return proxy as T;
}

/**
 * Page, forme ou flèche remise à un point d'entrée de plugin (sujet 315). Hors d'un geste, le modèle est déjà gelé
 * (`freezeModel`) et rendu tel quel ; pendant un geste, la copie de travail est modifiée par le tronc et ne peut pas
 * être gelée : le plugin en reçoit une vue paresseuse dont toute écriture lève une exception (comme sur un objet
 * gelé), sans copie. En production, la valeur elle-même (pas de coût).
 */
export function readonlyModel<T>(value: T): T {
  return import.meta.env.DEV ? view(value) : value;
}
