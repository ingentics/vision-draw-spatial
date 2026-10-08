import type { RelationKind } from '../kind';

/**
 * Relation source → vue (sujet 272) : « la vue est construite sur… ». Elle part d'une entité ou d'une vue et arrive sur
 * une vue ; une vue ne peut donc être liée qu'à une autre vue, jamais à elle-même (`distinct`). Aucun champ n'est
 * créé. Flèche en pointillé (comme toute flèche vers une vue, `writeEdgeLook`, sujet 374), pointe simple côté vue,
 * sans pointe ER, cardinalité ni texte ; sans réglage.
 */
export const viewSourceRelation: RelationKind = {
  id: 'view-source',
  from: ['rdd-entity', 'rdd-view'],
  to: ['rdd-view'],
  distinct: true,
  look: () => ({ startArrow: 'none', endArrow: 'open' }),
};
