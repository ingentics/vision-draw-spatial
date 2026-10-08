import type { FIELD_TYPES } from '../../../tables/fieldModel';
import type { RelationKind } from '../kind';

/** Type d'un champ qui peut recevoir un document. */
const DYNAMIC: keyof typeof FIELD_TYPES = 'dynamic';

/**
 * Relation document → champ dynamique (sujet 269) : « ce champ peut contenir ce document ». Elle part d'un document et
 * arrive sur un champ « Dynamique » d'une entité, d'un embedded ou d'une énumération (le seul bout possible), retenu par
 * le champ (`Field.incoming`) ; aucun champ n'est créé. Flèche en tirets, sans pointe ni texte, sans réglage.
 */
export const documentRelation: RelationKind = {
  id: 'document',
  from: ['rdd-document'],
  to: ['rdd-entity', 'rdd-embedded', 'rdd-enum'],
  toField: (field) => field.type === DYNAMIC,
  look: () => ({ startArrow: 'none', endArrow: 'none', dashed: true }),
};
