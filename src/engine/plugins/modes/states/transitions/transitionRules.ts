import type { EdgeModel, ModeEdit, ModeIssue, ModeProperty, PageModel, ShapeModel } from '../../../../core/plugins';
import { edgeTarget, elementName, shapeOf } from '../../../../core/plugins';
import { isFinal, isInitial, isNode, isStateLike } from '../kinds';

/**
 * Transitions du mode Machine à états (sujet 434) : toute flèche de la page, entre deux formes du mode. Un point
 * d'entrée n'est que départ, un point de sortie qu'arrivée ; une boucle ne va que d'un état (ou d'un ensemble) à
 * lui-même. Texte, Titre et Post-it ne portent pas de transition.
 */

/** Flèche permise de `source` vers `target`. */
export function canConnect(source: ShapeModel, target: ShapeModel): boolean {
  if (!isNode(source) || !isNode(target) || isFinal(source) || isInitial(target)) return false;
  return source.id !== target.id || isStateLike(source);
}

/** Bouts d'une transition, s'ils sont tous deux accrochés à des formes du mode qui peuvent être liées. */
export function transitionEnds(
  page: PageModel,
  edge: EdgeModel,
): { source: ShapeModel; target: ShapeModel } | undefined {
  const source = shapeOf(page, edge.sourceId);
  const target = shapeOf(page, edge.targetId);
  return source && target && canConnect(source, target) ? { source, target } : undefined;
}

/** Transition tirée d'une forme : pointe classique, trait plein. */
export function styleTransition(edit: ModeEdit, edgeId: string): void {
  edit.setElementStyle(edgeId, 'endArrow', 'classic');
  edit.setElementStyle(edgeId, 'dashed', undefined);
}

/** Nom d'un bout, pour les messages. */
function endName(shape: ShapeModel | undefined): string {
  if (!shape) return 'le vide';
  if (isInitial(shape)) return 'point d’entrée';
  if (isFinal(shape)) return 'point de sortie';
  return `« ${elementName(shape)} »`;
}

/**
 * Transitions qu'un geste n'a pas pu faire (collage d'une flèche sans ses formes, fichier modifié) : bout libre, ou
 * bouts qui ne peuvent pas être liés. Elles ne sont pas exportées (sujet 436).
 */
export function transitionIssues(page: PageModel): ModeIssue[] {
  return page.edges.flatMap((edge) => {
    if (transitionEnds(page, edge)) return [];
    const source = shapeOf(page, edge.sourceId);
    const target = shapeOf(page, edge.targetId);
    const name = edge.label.trim() ? `Transition « ${edge.label.trim()} »` : 'Transition';
    const message =
      !source || !target
        ? `${name} : bout libre, elle n'est pas exportée`
        : `${name} de ${endName(source)} vers ${endName(target)} : liaison refusée, elle n'est pas exportée`;
    return [{ cellId: edge.id, message }];
  });
}

/**
 * Section « Transition » en tête du panneau d'une flèche (sujet 434) : ses deux bouts, en lecture seule ; le nom est le
 * texte du milieu, juste en dessous (section Texte des flèches gérées par un mode).
 */
export const TRANSITION_PROPERTIES: ModeProperty[] = [
  {
    type: 'text',
    key: 'transition',
    section: 'Transition',
    label: 'De → vers',
    title: 'État de départ et état d’arrivée de la transition ; son nom est le texte du milieu de la flèche',
    readOnly: true,
    value: (page, target) => {
      const edge = edgeTarget(target);
      return edge && `${endName(shapeOf(page, edge.sourceId))} → ${endName(shapeOf(page, edge.targetId))}`;
    },
  },
];
