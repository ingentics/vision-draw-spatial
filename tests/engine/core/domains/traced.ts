/**
 * Domaine voisin traçant (sujet 385) : chaque appel est noté dans `log` (`domaine.méthode`), dans l'ordre ; `values` :
 * propriétés lues (valeurs) ou méthodes qui rendent quelque chose (notées aussi). Une méthode absente ne rend rien.
 */
export function traced(log: string[], name: string, values: Record<string, unknown> = {}): unknown {
  return new Proxy(values, {
    get: (target, prop) => {
      if (typeof prop !== 'string') return undefined;
      const value = target[prop];
      if (prop in target && typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        log.push(`${name}.${prop}`);
        return typeof value === 'function' ? (value as (...a: unknown[]) => unknown)(...args) : undefined;
      };
    },
  });
}
