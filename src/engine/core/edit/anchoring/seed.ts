/**
 * Graine d'agencement (ancrage automatique, touche F) : valeur pseudo-aléatoire stable dans [0, 1) pour une graine et
 * une clé (FNV-1a), qui départage ce qui est à égalité. La graine 0 ne départage rien : l'agencement par défaut.
 */
export function seededUnit(seed: number, key: string): number {
  let hash = 0x811c9dc5;
  const text = `${seed}:${key}`;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x100000000;
}
