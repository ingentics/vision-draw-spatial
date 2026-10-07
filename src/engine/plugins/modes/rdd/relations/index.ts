/**
 * Relations entre formes du mode RDD (sujets 265, 268, 278) : point d'entrée du dossier. Une flèche permise (d'une sorte
 * de `kinds/`) prend l'apparence de sa sorte ; si la sorte a un champ, il est ajouté dans la forme d'arrivée et suit la
 * flèche (`relationFields.ts`). Formulaires dans `relationProperties.ts`, écriture de la flèche dans `edgeLook.ts`.
 */

export { syncRelations } from './relationFields';
export { RELATION_FIELD_PROPERTIES, RELATION_PROPERTIES, edgeOwnedField } from './relationProperties';
export { canLink, forbiddenLinks, isLinkable, isRelationEdge } from './relationKinds';
export { CARDINALITIES, cardinalitiesShown } from './kinds/table/cardinalities';
