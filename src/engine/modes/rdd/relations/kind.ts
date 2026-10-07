import type { ShapeModel } from '../../../model/types';
import type { ModeEdit, ModeProperty } from '../../types';
import type { Field, FieldKind, TableRow } from '../tables';

/**
 * Sorte de relation du mode RDD (sujet 268) : tables de départ et d'arrivée, nom du champ de relation, bouts de la flèche
 * et formulaire. Chaque sorte vit dans son fichier ; elles ne s'importent pas entre elles.
 */
export interface RelationKind {
  id: string;
  /** Formes (kinds) d'où la flèche peut partir, et où elle peut arriver. */
  from: readonly string[];
  to: readonly string[];
  /** Kind du champ de relation (son icône) : `fk` entre tables, `embed` depuis un embedded. */
  fieldKind: FieldKind;
  /** Nom d'un champ de relation neuf, libre dans `rows` (lignes de la table d'arrivée). */
  fieldLabel(rows: readonly TableRow[], source: ShapeModel): string;
  /** Bouts de la flèche (pointes, textes), imposés d'après son champ et les réglages de la page. */
  writeEnds(edit: ModeEdit, edgeId: string, field: Field, settings: RelationSettings): void;
  /** Formulaire de la flèche, dans la section « Relation » du panneau : réglages de la flèche… */
  properties: ModeProperty[];
  /** … et textes de son champ de relation (ex. libellé, préfixe), rangés dans le champ, après eux. */
  fieldTexts?: readonly RelationFieldText[];
  /**
   * Le champ n'est que la trace de la relation (embedded) : sélectionné, il montre les textes de champ de la flèche à
   * la place des réglages d'un champ (type, Optionnel, PostgreSQL, Gouvernance), et reste optionnel.
   */
  fieldIsRelation?: boolean;
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
