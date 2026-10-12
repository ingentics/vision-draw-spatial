import { describe, expect, it } from 'vitest';
import { ShapeLibraries } from '../../../../../src/engine/core/domains/document/shapeLibraries';
import type { MissingLibraryShape } from '../../../../../src/engine/core/domains/document/shapeLibraries';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import { createDefaultRegistry } from '../../../../../src/engine/plugins';
import { fixture } from '../../../../helpers';
import { libraryJson } from '../../shapes/library/libraryJson';

/** Domaine sur un cœur réduit : signalements reçus, changements de bibliothèques (scènes, Diagnostics, palette). */
function setup() {
  const missing: MissingLibraryShape[][] = [];
  const changes: string[] = [];
  const core = {
    registry: createDefaultRegistry(),
    file: { shapesChanged: () => changes.push('report') },
    levels: { rebuildScenes: () => changes.push('scenes') },
    events: {
      emit: (event: string, list?: MissingLibraryShape[]) => {
        if (event === 'shapesMissing') missing.push(list!);
        else changes.push(event);
      },
    },
  } as unknown as EngineCore;
  return { libraries: new ShapeLibraries(core), missing, changes };
}

const document = () => readDrawio(fixture('shape-library.drawio')).document;
const demo = () =>
  libraryJson({ id: 'server' }, { library: { id: 'demo', name: 'Démo' }, categories: [{ id: 'compute', name: 'C' }] });

describe('formes de bibliothèque non chargées signalées à l’hôte (sujet 531)', () => {
  it('une liste par document, chaque paire une fois', () => {
    const { libraries, missing } = setup();
    libraries.documentShown(document());
    expect(missing).toEqual([
      [
        { library: 'demo', kind: 'server' },
        { library: 'demo', kind: 'token' },
        { library: 'infra-aws', kind: 'serveur' },
        { library: 'infra-aws', kind: 'base' },
      ],
    ]);
    libraries.documentShown(document());
    expect(missing).toHaveLength(1);
  });

  it('une forme chargée n’est pas signalée, ni ensuite après un retrait ; l’ouverture remet à zéro', () => {
    const { libraries, missing } = setup();
    libraries.register(demo());
    libraries.documentShown(document());
    expect(missing[0]).not.toContainEqual({ library: 'demo', kind: 'server' });
    libraries.unregister('demo');
    libraries.documentShown(document());
    expect(missing).toHaveLength(1);
    libraries.resetDocument();
    libraries.documentShown(document());
    expect(missing[1]).toContainEqual({ library: 'demo', kind: 'server' });
  });

  it('enregistrer, retirer, déclarer introuvable : Diagnostics, scènes et palette suivent', () => {
    const { libraries, changes } = setup();
    expect(libraries.register({})).toMatchObject({ ok: false });
    expect(changes).toEqual([]);
    libraries.register(demo());
    expect(changes).toEqual(['report', 'scenes', 'shapeLibrariesChange']);
    libraries.markUnavailable([{ library: 'infra-aws' }]);
    libraries.markUnavailable([{ library: 'infra-aws' }]);
    expect(libraries.unregister('autre')).toBe(false);
    expect(changes).toHaveLength(6);
    expect(libraries.libraries().map((library) => library.id)).toEqual(['demo']);
  });
});
