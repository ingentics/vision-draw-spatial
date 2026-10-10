/**
 * Ancrage des flèches d'une page (SPEC §14.1), un dossier par type : `manual/` (on choisit le point d'attache),
 * `auto/` (on choisit le côté, les flèches y sont réparties et tracées en contournant formes et flèches), `pcb/`
 * (Typon : comme l'automatique, tracé octilinéaire comme les pistes d'un circuit imprimé).
 */
export type Anchoring = 'manual' | 'auto' | 'pcb';

export const ANCHORINGS: readonly Anchoring[] = ['manual', 'auto', 'pcb'];

export function isAnchoring(value: string | undefined): value is Anchoring {
  return (ANCHORINGS as readonly (string | undefined)[]).includes(value);
}

/** Vrai pour les ancrages où l'on ne choisit que le côté, les flèches y étant réparties (automatique, Typon). */
export function distributes(anchoring: Anchoring): boolean {
  return anchoring !== 'manual';
}

/** Tracé d'une flèche : droite, angles droits, coudes arrondis, ou courbe. */
export type EdgeLine = 'straight' | 'sharp' | 'rounded' | 'curved';

export const EDGE_LINES: readonly EdgeLine[] = ['straight', 'sharp', 'rounded', 'curved'];

export function isEdgeLine(value: string | undefined): value is EdgeLine {
  return (EDGE_LINES as readonly (string | undefined)[]).includes(value);
}

/**
 * Tracés permis par un ancrage, le premier par défaut : tous en manuel et en automatique ; en Typon, la droite seule
 * (il trace lui-même ses pistes à 45°, sans coins arrondis ni courbe).
 */
export function edgeLinesOf(anchoring: Anchoring): readonly EdgeLine[] {
  return anchoring === 'pcb' ? ['straight'] : EDGE_LINES;
}
