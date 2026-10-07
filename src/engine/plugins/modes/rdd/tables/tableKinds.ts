import type { ShapeModel } from '../../../../core/plugins';
import type { KeyType } from './fieldModel';

/** Formes de table du mode RDD (sujets 179 à 181, 215 à 223) : ce qui distingue une entité d'un document, d'une vue… */

/** Icône d'entête : jumelles (vue), liste (énumération), prise électrique (embedded, sujet 223). */
export type HeaderMark = 'binoculars' | 'list' | 'plug';

/** Apparence d'une forme de table : ce que le rendu (et le style écrit pour draw.io) en tire. */
export interface TableLook {
  italic?: boolean;
  /** Cadre double autour de l'entête (sujet 215). */
  doubleHeader?: boolean;
  /** Champs en italique : indicatifs, sans contrainte (document JSONB, sujet 181). */
  italicFields?: boolean;
  /** Coin plié en haut à droite (document, sujet 218). */
  folded?: boolean;
  /** Bas ondulé (embedded, sujet 219). */
  wavy?: boolean;
  /** Icône en haut à droite de l'entête (sujets 220, 222). */
  mark?: HeaderMark;
  /** Clés du style draw.io d'une table neuve (ex. `rounded=1;`) : le rendu les suit, draw.io aussi. */
  style?: string;
}

/** Option d'une table (`TABLE_OPTIONS`) : table secondaire (sujet 179). */
export type TableOptionKey = 'secondary';

/** Règles d'une forme de table : ce que ses champs et ses réglages peuvent être. */
export interface TableRules {
  /** Clé primaire `id` en tête, et son type imposé (sujet 260) : « Primary key » (entité) ou « Mot » (énumération). */
  primaryKey?: KeyType;
  /** Champs qui peuvent être déclarés uniques (sujet 260 : entité, énumération, embedded). */
  uniqueFields?: boolean;
  /** Nom obligatoire : affiché à la place d'un nom vide, qui est signalé (document JSONB, sujet 181). */
  requiredName?: string;
  /** La table a des champs (lignes, « + » d'ajout) ; vrai pour toutes les formes pour l'instant. */
  fields: boolean;
  /** Options de table permises (`TABLE_OPTIONS`). */
  options: readonly TableOptionKey[];
}

/**
 * Forme de table, reconnue à sa marque propre (sans mention au-dessus du nom, sujet 218) : son apparence (nom en
 * italique, coin plié…) et ses règles (clé primaire `id` toujours en tête des champs, sujet 180…).
 */
export interface TableKind {
  look: TableLook;
  rules: TableRules;
}

export type TableKindId = 'rdd-model' | 'rdd-entity' | 'rdd-enum' | 'rdd-embedded' | 'rdd-document' | 'rdd-view';

/** Règles d'une table sans contrainte particulière. */
const PLAIN: TableRules = { fields: true, options: ['secondary'] };

/**
 * Tables du mode, par id de forme : le rendu et les opérations du mode (hauteur, échelle) en dépendent. Le modèle
 * abstrait est la base des autres : jamais posé depuis la palette (sujet 180), il reste dessiné s'il est dans un
 * fichier.
 */
export const TABLE_KINDS: Record<TableKindId, TableKind> = {
  'rdd-model': { look: { italic: true }, rules: PLAIN },
  'rdd-entity': { look: {}, rules: { ...PLAIN, primaryKey: 'primary-key', uniqueFields: true } },
  'rdd-enum': {
    look: { doubleHeader: true, mark: 'list' },
    rules: { ...PLAIN, primaryKey: 'word', uniqueFields: true },
  },
  // Sujet 181 : objet incorporé (bas ondulé, sujet 219), document JSONB (clés indicatives), vue (coins arrondis).
  'rdd-embedded': { look: { wavy: true, mark: 'plug' }, rules: { ...PLAIN, uniqueFields: true } },
  'rdd-document': { look: { italicFields: true, folded: true }, rules: { ...PLAIN, requiredName: 'Document' } },
  'rdd-view': { look: { style: 'rounded=1;absoluteArcSize=1;arcSize=16;', mark: 'binoculars' }, rules: PLAIN },
};

/** Id de forme d'une table du mode ? */
export const isTableKindId = (kind: string): kind is TableKindId =>
  Object.prototype.hasOwnProperty.call(TABLE_KINDS, kind);

/** Forme de table d'une forme du mode ; undefined pour une autre forme. */
export const tableKindOf = (shape: ShapeModel): TableKind | undefined =>
  isTableKindId(shape.kind) ? TABLE_KINDS[shape.kind] : undefined;

/** Nom obligatoire de la table s'il manque (document JSONB sans nom) ; undefined si elle est nommée ou peut ne pas l'être. */
export function missingRequiredName(shape: ShapeModel): string | undefined {
  const required = tableKindOf(shape)?.rules.requiredName;
  return required !== undefined && shape.label.trim() === '' ? required : undefined;
}

/** Nom vide d'une table au nom obligatoire (document JSONB) ? */
export const missingName = (shape: ShapeModel) => missingRequiredName(shape) !== undefined;

/** Nom affiché d'une table : son label, ou le nom obligatoire de sa forme s'il est vide (« Document »). */
export const tableName = (shape: ShapeModel): string => missingRequiredName(shape) ?? shape.label;

/** Icône d'entête : celle de la forme de table, toujours affichée (sujet 260 ; `spatial.icon=0` est ignoré). */
export const shownMark = (shape: ShapeModel): HeaderMark | undefined => tableKindOf(shape)?.look.mark;
