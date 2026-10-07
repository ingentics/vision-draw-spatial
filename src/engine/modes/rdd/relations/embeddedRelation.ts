import { newFieldLabel } from '../fieldModel';
import type { RelationKind } from './kind';

/**
 * Relation embedded (sujets 265, 268) : d'un embedded vers une entité ou une énumération ; champ au nom de l'embedded
 * (`Address`, puis `Address1`, `Address2`… s'il est pris), avec son préfixe en gris ; flèche et champ montrent le
 * même formulaire (libellé, préfixe), rangé dans le champ. Un embedded n'est pas une table :
 * pas de cardinalité, la flèche n'a ni pointe ni texte de bout.
 */
export const embeddedRelation: RelationKind = {
  id: 'embedded',
  from: ['rdd-embedded'],
  to: ['rdd-entity', 'rdd-enum'],
  field: {
    // Losange violet (docs/assets/embed.svg).
    kind: 'embed',
    label: (rows, source) => {
      // Son nom sur une ligne, sinon celui de sa forme.
      const name = source.label.replace(/\s+/g, ' ').trim() || 'Embedded';
      return rows.some((row) => row.label === name) ? newFieldLabel(rows, name) : name;
    },
    // Libellé et préfixe : dans le champ ; la table d'arrivée affiche le préfixe en gris à la place du type.
    texts: [
      { key: 'label', label: 'Champ', title: 'Nom du champ de l’embedded dans la table d’arrivée ; jamais vide' },
      { key: 'prefix', label: 'Préfixe', title: 'Préfixe des champs de l’embedded dans la table d’arrivée (prefix)' },
    ],
    ownedByEdge: true,
  },
  look: () => ({ startArrow: 'none', endArrow: 'none' }),
};
