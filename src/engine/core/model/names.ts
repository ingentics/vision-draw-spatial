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
