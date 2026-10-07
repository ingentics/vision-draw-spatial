/** Formes d'une page par id : l'index que tout calcul sur les flèches construit pour retrouver leurs extrémités. */
export function shapesById<S extends { id: string }>(page: { readonly shapes: readonly S[] }): Map<string, S> {
  return new Map(page.shapes.map((shape) => [shape.id, shape]));
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
