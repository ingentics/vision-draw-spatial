import type { ShapeModel } from '../../model/types';
import type { KeyType } from './fieldModel';

/** Formes de table du mode RDD (sujets 179 à 181, 215 à 223) : ce qui distingue une entité d'un document, d'une vue… */

/** Icône d'entête : jumelles (vue), liste (énumération), prise électrique (embedded, sujet 223). */
export type HeaderMark = 'binoculars' | 'list' | 'plug';

/**
 * Forme de table, reconnue à sa marque propre (sans mention au-dessus du nom, sujet 218) : nom en italique, clé
 * primaire `id` toujours en tête des champs (sujet 180)…
 */
export interface TableKind {
  italic?: boolean;
  /** Clé primaire `id` en tête, et son type imposé (sujet 260) : « Primary key » (entité) ou « Mot » (énumération). */
  primaryKey?: KeyType;
  /** Champs qui peuvent être déclarés uniques (sujet 260 : entité, énumération, embedded). */
  uniqueFields?: boolean;
  /** Cadre double autour de l'entête (sujet 215). */
  doubleHeader?: boolean;
  /** Champs en italique : indicatifs, sans contrainte (document JSONB, sujet 181). */
  italicFields?: boolean;
  /** Nom obligatoire : affiché à la place d'un nom vide, qui est signalé (document JSONB, sujet 181). */
  requiredName?: string;
  /** Coin plié en haut à droite (document, sujet 218). */
  folded?: boolean;
  /** Bas ondulé (embedded, sujet 219). */
  wavy?: boolean;
  /** Icône en haut à droite de l'entête (sujets 220, 222). */
  mark?: HeaderMark;
  /** Clés du style draw.io d'une table neuve (ex. `rounded=1;`) : le rendu les suit, draw.io aussi. */
  style?: string;
}

/**
 * Tables du mode, par id de forme : le rendu et les opérations du mode (hauteur, échelle) en dépendent. Le modèle
 * abstrait est la base des autres : jamais posé depuis la palette (sujet 180), il reste dessiné s'il est dans un
 * fichier.
 */
export const TABLE_KINDS: Record<string, TableKind> = {
  'rdd-model': { italic: true },
  'rdd-entity': { primaryKey: 'primary-key', uniqueFields: true },
  'rdd-enum': { primaryKey: 'word', uniqueFields: true, doubleHeader: true, mark: 'list' },
  // Sujet 181 : objet incorporé (bas ondulé, sujet 219), document JSONB (clés indicatives), vue (coins arrondis).
  'rdd-embedded': { wavy: true, mark: 'plug', uniqueFields: true },
  'rdd-document': { italicFields: true, requiredName: 'Document', folded: true },
  'rdd-view': { style: 'rounded=1;absoluteArcSize=1;arcSize=16;', mark: 'binoculars' },
};

/** Forme de table d'une forme du mode ; undefined pour une autre forme. */
export const tableKindOf = (shape: ShapeModel): TableKind | undefined => TABLE_KINDS[shape.kind];

/** Nom obligatoire de la table s'il manque (document JSONB sans nom) ; undefined si elle est nommée ou peut ne pas l'être. */
export function missingRequiredName(shape: ShapeModel): string | undefined {
  const required = tableKindOf(shape)?.requiredName;
  return required !== undefined && shape.label.trim() === '' ? required : undefined;
}

/** Nom vide d'une table au nom obligatoire (document JSONB) ? */
export const missingName = (shape: ShapeModel) => missingRequiredName(shape) !== undefined;

/** Nom affiché d'une table : son label, ou le nom obligatoire de sa forme s'il est vide (« Document »). */
export const tableName = (shape: ShapeModel): string => missingRequiredName(shape) ?? shape.label;

/** Icône d'entête : celle de la forme de table, toujours affichée (sujet 260 ; `spatial.icon=0` est ignoré). */
export const shownMark = (shape: ShapeModel): HeaderMark | undefined => tableKindOf(shape)?.mark;
