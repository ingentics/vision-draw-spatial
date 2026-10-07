import { ellipsePath } from '../../../../../core/render/geometry/paths';
import type { ShapeDefinition } from '../../../../../core/shapes/types';
import { actorDefinition } from '../common/definition';
import { actorBody } from '../common/figure';
import type { ActorFigure } from '../common/figure';

/** Tête : assez de côtés pour rester ronde au zoom. */
const HEAD_SEGMENTS = 48;

/** Bonhomme de draw.io (`UmlActorShape.paintBackground`) : tête ronde sur le quart du haut. */
export function humanFigure(w: number, h: number): ActorFigure {
  const head = { x: w / 4, y: 0, width: w / 2, height: h / 4 };
  return { head, parts: [ellipsePath(head, HEAD_SEGMENTS)], strokes: actorBody(w, h) };
}

/** Actor (`shape=umlActor`) : le bonhomme de draw.io, acteur humain (`../common/definition.ts`). */
export const definition: ShapeDefinition = {
  id: 'actor',
  kinds: ['umlActor'],
  ...actorDefinition(humanFigure),
  swatch: () => '<circle cx="20" cy="7" r="3.5"/><path d="M20 10.5v7M14 13h12M15 25l5-7.5l5 7.5"/>',
  palette: {
    name: 'Acteur',
    category: 'general',
    order: 110,
    keywords: ['actor', 'acteur', 'utilisateur', 'user', 'personne', 'person', 'bonhomme', 'uml'],
    style: 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;',
    value: 'Actor',
    width: 30,
    height: 60,
    icon: '<circle cx="20" cy="5" r="3.5"/><path d="M20 8.5v9M13 12h14M14 26l6-8.5l6 8.5"/>',
  },
};
