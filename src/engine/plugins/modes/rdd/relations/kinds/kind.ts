import type { ModeProperty, ShapeModel } from '../../../../../core/plugins';
import type { Field, FieldKind, TableRow } from '../../tables/fieldModel';
import type { TableKindId } from '../../tables/tableKinds';

/**
 * Sorte de relation du mode RDD (sujets 268, 278) : formes de départ et d'arrivée, champ éventuel créé dans la forme
 * d'arrivée, apparence de la flèche et formulaire. Chaque sorte vit dans son fichier ; elles ne s'importent pas entre
 * elles. Une sorte se déclare sans toucher à `syncRelations` ni à `writeRelationEdge`.
 */
export interface RelationKind {
  id: string;
  /** Formes de table d'où la flèche peut partir, et où elle peut arriver. */
  from: readonly TableKindId[];
  to: readonly TableKindId[];
  /** La flèche ne peut pas boucler sur une même forme (source → vue, sujet 272). */
  distinct?: boolean;
  /**
   * L'arrivée est un champ de la forme d'arrivée, permis par cette règle (document → champ dynamique, sujet 269) : la
   * flèche se tire vers la ligne du champ, qui la retient (`Field.incoming`) ; hors d'un tel champ, ce n'est pas une
   * relation.
   */
  toField?(field: Field): boolean;
  /** Champ créé dans la forme d'arrivée, qui suit la flèche ; absent : aucun champ, rien n'est créé ni suivi. */
  field?: RelationField;
  /** Apparence de la flèche, imposée d'après son champ (undefined pour une sorte sans champ) et les réglages de la page. */
  look(field: Field | undefined, settings: RelationSettings): EdgeLook;
  /** Formulaire de la flèche, dans la section « Relation » du panneau ; absent ou vide : pas de réglage de la flèche. */
  properties?: ModeProperty[];
}

/** Champ de relation d'une sorte : créé dans la forme d'arrivée, il retient l'id de sa flèche (sujet 265). */
export interface RelationField {
  /** Kind du champ (son icône) : `fk` entre tables, `embed` depuis un embedded. */
  kind: FieldKind;
  /** Nom d'un champ neuf, libre dans `rows` (lignes de la table d'arrivée). */
  label(rows: readonly TableRow[], source: ShapeModel): string;
  /** Textes du champ (ex. libellé, préfixe), réglés depuis la flèche, rangés dans le champ (sujet 268). */
  texts?: readonly RelationFieldText[];
  /**
   * Le champ n'est que la trace de la relation (embedded) : sélectionné, il montre les textes de sa flèche à la place
   * des réglages d'un champ (type, Optionnel, PostgreSQL, Gouvernance), et reste optionnel.
   */
  ownedByEdge?: boolean;
}

/**
 * Apparence d'une flèche de relation : pointes (`none` : sans pointe), textes de début et de fin (absents : retirés),
 * trait en tirets. Toutes ces clés sont écrites à chaque remise en ordre (`writeEdgeLook`).
 */
export interface EdgeLook {
  startArrow: string;
  endArrow: string;
  startText?: string;
  endText?: string;
  dashed?: boolean;
}

/** Texte d'un champ de relation, réglé depuis sa flèche ou depuis le champ sélectionné (sujet 268). */
export interface RelationFieldText {
  key: 'label' | 'prefix';
  label: string;
  title: string;
}

/** Réglages de la page qui touchent les relations (passés quand l'opération vient de les changer). */
export interface RelationSettings {
  /** Textes des cardinalités affichés (sujet 266). */
  cardinalities: boolean;
}
