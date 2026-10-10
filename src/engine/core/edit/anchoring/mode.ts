import { setStyleKey } from '../../format/style';
import type { PageModel } from '../../model/types';
import { SPATIAL } from '../../spatial';

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

/** Ancrage de la page : le sien (`spatial.anchoring`), sinon `fallback` (paramètre `shapes.edgeAnchoring`). */
export function pageAnchoring(page: PageModel, fallback: Anchoring): Anchoring {
  const own = page.attributes[SPATIAL.anchoring];
  return isAnchoring(own) ? own : fallback;
}

/** Tracé d'une flèche : droite, angles droits, coudes arrondis, ou courbe. */
export type EdgeLine = 'straight' | 'sharp' | 'rounded' | 'curved';

export const EDGE_LINES: readonly EdgeLine[] = ['straight', 'sharp', 'rounded', 'curved'];

export function isEdgeLine(value: string | undefined): value is EdgeLine {
  return (EDGE_LINES as readonly (string | undefined)[]).includes(value);
}

/**
 * Clés de style de chaque tracé (sujet 447), seule source pour la création d'une flèche, les routeurs des ancrages
 * répartis (`Router.edgeStyle`) et le panneau : la droite retire le routeur, les autres posent l'orthogonal ; une clé
 * à `undefined` est retirée.
 */
export const EDGE_LINE_STYLES: Readonly<Record<EdgeLine, Readonly<Record<string, string | undefined>>>> = {
  straight: { edgeStyle: undefined, noEdgeStyle: undefined, rounded: undefined, curved: undefined },
  sharp: { edgeStyle: 'orthogonalEdgeStyle', noEdgeStyle: undefined, rounded: '0', curved: undefined },
  rounded: { edgeStyle: 'orthogonalEdgeStyle', noEdgeStyle: undefined, rounded: '1', curved: undefined },
  curved: { edgeStyle: 'orthogonalEdgeStyle', noEdgeStyle: undefined, rounded: '0', curved: '1' },
};

/** Style `style` avec le tracé `line` (flèche créée). */
export function withEdgeLine(style: string, line: EdgeLine): string {
  return Object.entries(EDGE_LINE_STYLES[line]).reduce((text, [key, value]) => setStyleKey(text, key, value), style);
}

/**
 * Clés à écrire pour donner le tracé `line` à une flèche existante : une flèche à coudes garde son routeur (`straight` :
 * elle n'en a pas, elle prend l'orthogonal).
 */
export function edgeLinePatch(line: EdgeLine, straight: boolean): Record<string, string | undefined> {
  const { edgeStyle, noEdgeStyle, ...shape } = EDGE_LINE_STYLES[line];
  return line === 'straight' || straight ? { edgeStyle, noEdgeStyle, ...shape } : shape;
}

const EDGE_LINES_BY_ANCHORING: Record<Anchoring, readonly EdgeLine[]> = {
  manual: EDGE_LINES,
  auto: ['rounded'],
  pcb: ['straight'],
};

/**
 * Tracés permis par un ancrage, le premier par défaut : tous en manuel ; en automatique, l'arrondi seul (sujet 443) ;
 * en Typon, la droite seule (il trace lui-même ses pistes à 45°, sans coins arrondis ni courbe). Les flèches réparties
 * en prennent le style (`Router.edgeStyle`).
 */
export function edgeLinesOf(anchoring: Anchoring): readonly EdgeLine[] {
  return EDGE_LINES_BY_ANCHORING[anchoring];
}

/**
 * Tracé des flèches créées sur la page : le sien (`spatial.edgeLine`), sinon `fallback` (paramètre
 * `shapes.edgeLineStyle`), s'il est permis par son ancrage ; sinon le premier permis.
 */
export function pageEdgeLine(page: PageModel, anchoring: Anchoring, fallback: EdgeLine): EdgeLine {
  const allowed = edgeLinesOf(anchoring);
  const own = page.attributes[SPATIAL.edgeLine];
  const wanted = isEdgeLine(own) ? own : fallback;
  return allowed.includes(wanted) ? wanted : allowed[0]!;
}
