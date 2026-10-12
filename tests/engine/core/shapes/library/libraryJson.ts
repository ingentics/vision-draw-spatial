/** Bibliothèque minimale valide ; `patch` remplace des champs de la racine, `shape` ceux de la forme. */
export function libraryJson(shape: Record<string, unknown> = {}, patch: Record<string, unknown> = {}) {
  return {
    format: 'drawio-spatial/shapes',
    formatVersion: 1,
    library: { id: 'infra', name: 'Infrastructure' },
    categories: [{ id: 'compute', name: 'Calcul', order: 100 }],
    shapes: [
      {
        id: 'server',
        category: 'compute',
        name: 'Serveur',
        size: { width: 80, height: 60 },
        render: {
          outline: [
            [0, 0],
            [1, 0],
            [0.5, 1],
          ],
        },
        ...shape,
      },
    ],
    ...patch,
  };
}
