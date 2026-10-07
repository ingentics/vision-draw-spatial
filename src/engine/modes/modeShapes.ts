import type { ShapeDefinition } from '../shapes/types';

/**
 * Formes propres aux modes (sujet 178), rangées par mode d'après le chemin `<id>/shapes/<forme>/index.ts` d'un
 * `import.meta.glob` (qui importe `definition`).
 */
export function shapesByMode(modules: Record<string, ShapeDefinition>): Map<string, ShapeDefinition[]> {
  const byMode = new Map<string, ShapeDefinition[]>();
  for (const [path, definition] of Object.entries(modules)) {
    const parts = path.split('/');
    const modeId = parts.at(-4)!;
    byMode.set(modeId, [...(byMode.get(modeId) ?? []), definition]);
  }
  return byMode;
}

/**
 * Formes des modes : une par dossier `modes/<id>/shapes/<forme>/index.ts`, collectées toutes seules. Le registre des
 * formes les enregistre (elles se dessinent sur toute page) ; le registre des modes les réserve à la palette du mode.
 */
export const MODE_SHAPE_DEFINITIONS: Map<string, ShapeDefinition[]> = shapesByMode(
  import.meta.glob<ShapeDefinition>('./*/shapes/*/index.ts', { eager: true, import: 'definition' }),
);
