import type { PageModel } from '../../../../core/plugins';
import { edgeOf, jsonExporter, oneLine, shapeOf } from '../../../../core/plugins';
import { storyState } from '../stories';

/**
 * Export JSON des histoires (sujet 474) : dans l'ordre des numéros, chacune avec ses étapes dans l'ordre de la suite ;
 * `label` = texte de la flèche, `from` / `to` = texte des formes reliées (`null` pour un bout libre).
 */

export interface StoryStep {
  label: string;
  from: string | null;
  to: string | null;
}

export interface StoriesExport {
  stories: { number: number; title: string; steps: StoryStep[] }[];
}

/** Modèle exporté de la page. */
export function storiesExport(page: PageModel): StoriesExport {
  const shapeLabel = (id: string | undefined) => {
    const shape = id === undefined ? undefined : shapeOf(page, id);
    return shape ? oneLine(shape.label) : null;
  };
  return {
    stories: storyState(page).stories.map((story) => ({
      number: story.number,
      title: story.title,
      steps: story.edges.map((id) => {
        const edge = edgeOf(page, id)!;
        return { label: oneLine(edge.label), from: shapeLabel(edge.sourceId), to: shapeLabel(edge.targetId) };
      }),
    })),
  };
}

/** Export JSON de la page, pour la fenêtre d'export commune de l'appli (format et texte). */
export const storiesExporter = jsonExporter(storiesExport);
