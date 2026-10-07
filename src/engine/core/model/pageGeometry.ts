import type { PageModel, Rect } from './types';

/**
 * Empreinte de la géométrie d'une page (bornes des formes, bouts et points des flèches), copiée : le moteur modifie
 * le modèle en direct pendant un glisser, l'empreinte garde l'état d'avant l'édition.
 */
export interface PageGeometry {
  shapes: Map<string, Rect>;
  edges: Map<string, { ends: string[]; signature: string }>;
}

export function pageGeometry(page: PageModel): PageGeometry {
  return {
    shapes: new Map(page.shapes.map((s) => [s.id, { ...s.bounds }])),
    edges: new Map(
      page.edges.map((edge) => [
        edge.id,
        {
          ends: [edge.sourceId, edge.targetId].filter((id): id is string => !!id),
          signature: JSON.stringify([
            edge.sourceId,
            edge.targetId,
            edge.points,
            ...['exitX', 'exitY', 'entryX', 'entryY'].map((k) => edge.style[k]),
          ]),
        },
      ]),
    ),
  };
}
