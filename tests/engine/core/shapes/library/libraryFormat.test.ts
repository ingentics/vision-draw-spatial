import { describe, expect, it } from 'vitest';
import { readShapeLibrary } from '../../../../../src/engine/core/shapes/library/libraryFormat';
import { libraryJson } from './libraryJson';

const errorsOf = (json: unknown) => {
  const result = readShapeLibrary(json);
  return result.ok ? [] : result.errors;
};

describe('format des bibliothèques de formes (sujet 529)', () => {
  it('lit une bibliothèque minimale, avec les défauts', () => {
    const result = readShapeLibrary(libraryJson());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { library } = result;
    expect(library).toMatchObject({ id: 'infra', name: 'Infrastructure', tags: [], meta: {} });
    expect(library.categories).toEqual([{ id: 'compute', name: 'Calcul', order: 100 }]);
    expect(library.shapes[0]).toMatchObject({
      id: 'server',
      width: 80,
      height: 60,
      style: 'whiteSpace=wrap;html=1;',
      value: '',
      keywords: [],
      render: {
        outline: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 0.5, y: 1 },
        ],
        details: [],
      },
    });
    expect(Object.isFrozen(library.shapes[0]!.render.outline)).toBe(true);
  });

  it('garde les métadonnées et `meta`, ignore les clés inconnues', () => {
    const result = readShapeLibrary(
      libraryJson(
        { meta: { doc: 'https://exemple.fr' }, futur: 1, modes: ['none', 'states'] },
        {
          library: {
            id: 'infra',
            name: 'Infra',
            author: 'Moi',
            license: 'MIT',
            tags: ['cloud'],
            meta: { a: [1] },
            x: 2,
          },
          inconnu: true,
        },
      ),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.library).toMatchObject({ author: 'Moi', license: 'MIT', tags: ['cloud'], meta: { a: [1] } });
    expect(result.library.shapes[0]).toMatchObject({ meta: { doc: 'https://exemple.fr' }, modes: ['none', 'states'] });
    expect('futur' in result.library.shapes[0]!).toBe(false);
  });

  it('refuse un autre format ou une version inconnue', () => {
    expect(errorsOf(libraryJson({}, { format: 'autre' }))).toEqual(['format : « drawio-spatial/shapes » attendu']);
    expect(errorsOf(libraryJson({}, { formatVersion: 2 }))).toEqual(['formatVersion : version de format 2 non gérée']);
    expect(errorsOf('texte')).toEqual(['bibliothèque : objet JSON attendu']);
  });

  it('donne chaque erreur avec le chemin du champ fautif', () => {
    const errors = errorsOf(
      libraryJson(
        { id: 'Serveur', category: 'autre', size: { width: 0, height: 10 }, render: { outline: [[0, 0]] } },
        { library: { id: 'infra' } },
      ),
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        'library.name : obligatoire',
        'shapes[0].id : « Serveur » invalide (minuscules, chiffres et tirets)',
        'shapes[0].category : « autre » n’est pas une catégorie de la bibliothèque',
        'shapes[0].size.width : nombre positif attendu',
        'shapes[0].render.outline : au moins 3 points',
      ]),
    );
  });

  it('borne les points à la fraction des bornes et refuse les doublons', () => {
    expect(
      errorsOf(
        libraryJson({
          render: {
            outline: [
              [0, 0],
              [2, 0],
              [0, 1],
            ],
          },
        }),
      ),
    ).toEqual(['shapes[0].render.outline[1] : point [x, y] attendu, valeurs de 0 à 1']);
    const json = libraryJson();
    expect(errorsOf({ ...json, shapes: [...json.shapes, ...json.shapes] })).toEqual([
      'shapes[1].id : « server » en double',
    ]);
  });

  it('n’accepte que des données de tracé pour l’icône (injectée dans la palette)', () => {
    expect(errorsOf(libraryJson({ icon: ['M4 4h32v20H4z'] }))).toEqual([]);
    expect(errorsOf(libraryJson({ icon: ['"/><script>alert(1)</script>'] }))).toEqual([
      'shapes[0].icon[0] : données de tracé SVG attendues (commandes et nombres)',
    ]);
  });
});
