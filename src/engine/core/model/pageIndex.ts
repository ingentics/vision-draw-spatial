/** Formes d'une page par id : l'index que tout calcul sur les flèches construit pour retrouver leurs extrémités. */
export function shapesById<S extends { id: string }>(page: { readonly shapes: readonly S[] }): Map<string, S> {
  return new Map(page.shapes.map((shape) => [shape.id, shape]));
}

/** Flèches d'une page par id, pour retrouver beaucoup de flèches sans reparcourir la liste à chaque fois. */
export function edgesById<E extends { id: string }>(page: { readonly edges: readonly E[] }): Map<string, E> {
  return new Map(page.edges.map((edge) => [edge.id, edge]));
}

/**
 * Élément d'une liste par id (page d'un document, texte d'une flèche, flux…) ; undefined sans liste, sans id ou s'il
 * n'y est pas. Pour une recherche ponctuelle : un index (`shapesById`) vaut mieux dans une boucle.
 */
export function byId<T extends { readonly id: string }>(
  items: readonly T[] | undefined,
  id: string | undefined,
): T | undefined {
  return id === undefined ? undefined : items?.find((item) => item.id === id);
}

/** Forme d'une page par id ; undefined sans page, sans id ou si ce n'est pas une forme de la page. */
export function shapeOf<S extends { readonly id: string }>(
  page: { readonly shapes: readonly S[] } | undefined,
  id: string | undefined,
): S | undefined {
  return byId(page?.shapes, id);
}

/** Flèche d'une page par id ; undefined sans page, sans id ou si ce n'est pas une flèche de la page. */
export function edgeOf<E extends { readonly id: string }>(
  page: { readonly edges: readonly E[] } | undefined,
  id: string | undefined,
): E | undefined {
  return byId(page?.edges, id);
}

/** Forme ou flèche d'une page par id (les ids d'une page draw.io sont uniques : les formes sont cherchées d'abord). */
export function elementOf<S extends { readonly id: string }, E extends { readonly id: string }>(
  page: { readonly shapes: readonly S[]; readonly edges: readonly E[] } | undefined,
  id: string | undefined,
): S | E | undefined {
  return shapeOf(page, id) ?? edgeOf(page, id);
}

/** Formes aux deux bouts d'une flèche, d'après l'index de la page ; un bout libre ou inconnu est absent. */
export function edgeEnds<S>(
  shapes: ReadonlyMap<string, S>,
  edge: { readonly sourceId?: string; readonly targetId?: string },
): { source?: S; target?: S } {
  const source = edge.sourceId === undefined ? undefined : shapes.get(edge.sourceId);
  const target = edge.targetId === undefined ? undefined : shapes.get(edge.targetId);
  return { ...(source && { source }), ...(target && { target }) };
}
