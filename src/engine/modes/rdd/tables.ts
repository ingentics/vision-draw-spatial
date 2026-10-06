import type { ShapeModel } from '../../model/types';
import { spatialValue } from '../../spatial';

/**
 * Données des tables du mode RDD (sujets 179, 180) : attributs `spatial.*`, formes de table, tailles, champs. Le rendu
 * et la fabrique des formes sont dans `shapes/common/table.ts`, les opérations dans `operations.ts`.
 */

/** Champs d'une table : liste JSON de noms (`["name","created_at"]`). */
export const FIELDS = 'spatial.fields';
/** Table secondaire (`1`) : rendu 20 % plus petit. */
export const SECONDARY = 'spatial.secondary';
/** Échelle d'une table secondaire. */
export const SECONDARY_SCALE = 0.8;

/** Tailles d'une table principale, en pixels de page (× `SECONDARY_SCALE` pour une table secondaire). */
export const TABLE = {
  /** Entête : nom seul. */
  header: 26,
  /** Bande de la mention (`«abstract»`) au-dessus du nom. */
  stereotype: 12,
  row: 20,
  nameSize: 12,
  stereotypeSize: 9,
  fieldSize: 11,
  /** Marge des champs à gauche. */
  padding: 6,
  /** Écart du second trait d'un entête à cadre double. */
  doubleGap: 3,
  width: 160,
} as const;

/** Couleur d'entête par défaut (premier fond de `modePalette`). */
export const DEFAULT_HEADER_COLOR = '#dae8fc';

/**
 * Forme de table : mention au-dessus du nom (ex. `abstract`), nom en italique, clé primaire `id` toujours en tête des
 * champs (sujet 180).
 */
export interface TableKind {
  stereotype?: string;
  italic?: boolean;
  primaryKey?: boolean;
  /** Cadre double autour de l'entête (sujet 215). */
  doubleHeader?: boolean;
}

/** Clé primaire des tables qui en ont une : premier champ, souligné, ni retiré ni déplacé. */
export const PRIMARY_KEY = 'id';

/**
 * Tables du mode, par id de forme : le rendu et les opérations du mode (hauteur, échelle) en dépendent. Le modèle
 * abstrait est la base des autres : jamais posé depuis la palette (sujet 180), il reste dessiné s'il est dans un
 * fichier.
 */
export const TABLE_KINDS: Record<string, TableKind> = {
  'rdd-model': { stereotype: 'abstract', italic: true },
  'rdd-entity': { primaryKey: true },
  'rdd-enum': { primaryKey: true, doubleHeader: true },
};

/** Forme de table d'une forme du mode ; undefined pour une autre forme. */
export const tableKindOf = (shape: ShapeModel): TableKind | undefined => TABLE_KINDS[shape.kind];

/** Champs de la table (`spatial.fields`) ; une valeur illisible ou absente = aucun. */
export function fieldsOf(shape: ShapeModel): string[] {
  try {
    const value: unknown = JSON.parse(spatialValue(shape, FIELDS) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Champs affichés : ceux du fichier, la clé primaire ramenée en tête (ajoutée si elle manque) pour une table qui en a
 * une.
 */
export function tableFields(shape: ShapeModel): string[] {
  const fields = fieldsOf(shape);
  return tableKindOf(shape)?.primaryKey ? [PRIMARY_KEY, ...fields.filter((f) => f !== PRIMARY_KEY)] : fields;
}

/** La clé primaire manque ou n'est pas en tête dans le fichier (fichier modifié à la main ou dans draw.io) ? */
export const misplacedPrimaryKey = (shape: ShapeModel) =>
  tableKindOf(shape)?.primaryKey === true && fieldsOf(shape)[0] !== PRIMARY_KEY;

export const isSecondary = (shape: ShapeModel) => spatialValue(shape, SECONDARY) === '1';

/** Hauteur de l'entête (nom et mention), à l'échelle de la table. */
export function headerHeight(kind: TableKind, secondary: boolean): number {
  return (TABLE.header + (kind.stereotype ? TABLE.stereotype : 0)) * (secondary ? SECONDARY_SCALE : 1);
}

/** Hauteur de la table pour `count` champs : entête et une ligne par champ (au moins une ligne vide). */
export function tableHeight(kind: TableKind, secondary: boolean, count: number): number {
  return headerHeight(kind, secondary) + Math.max(1, count) * TABLE.row * (secondary ? SECONDARY_SCALE : 1);
}
