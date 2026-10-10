import { describe, expect, it } from 'vitest';
import { LiveEdit } from '../../../../../../src/engine/core/domains/edit/drag/liveEdit';
import type { EngineCore } from '../../../../../../src/engine/core/domains/EngineCore';

/** Fin d'un glisser sur une page dont le mode habille (`dressing`) ou non les formes ; ce que le moteur a fait. */
function drop(dressed: boolean) {
  const done: string[] = [];
  const page = { id: 'p' };
  const core = {
    pages: { pageById: () => page },
    modes: { modeOf: () => (dressed ? { dressing: () => ({}) } : {}) },
    arrangement: { distributes: () => false },
    file: {
      xmlTree: undefined,
      documentChanged: (ids: string[]) => done.push(`relu ${ids.join()}`),
      liveWritten: () => done.push('écrit en direct'),
    },
    scenes: { invalidate: () => done.push('autres rendus invalidés') },
    graph: { invalidateWithScenes: () => undefined },
    highlight: { clearVeil: () => undefined, update: () => undefined },
    minimap: { invalidate: () => undefined },
    rendering: { requestRender: () => undefined },
  } as unknown as EngineCore;
  new LiveEdit(core).afterGeometryWrite('p');
  return done;
}

describe('fin d’un glisser (sujet 519)', () => {
  it('page habillée par son mode : modèle relu et scène reconstruite (habillage des voisines à jour)', () => {
    expect(drop(true)).toEqual(['relu p']);
  });

  it('sans habillage : la scène du glisser est gardée', () => {
    expect(drop(false)).toEqual(['autres rendus invalidés', 'écrit en direct']);
  });
});
