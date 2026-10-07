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
