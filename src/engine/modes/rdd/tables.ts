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
/** Icône d'entête masquée (`0`) ; absent = affichée, pour une table qui en a une (sujet 222). */
export const ICON = 'spatial.icon';
/** Échelle d'une table secondaire. */
export const SECONDARY_SCALE = 0.8;

/** Tailles d'une table principale, en pixels de page (× `SECONDARY_SCALE` pour une table secondaire). */
export const TABLE = {
  /** Entête : le nom. */
  header: 26,
  row: 20,
  nameSize: 12,
  fieldSize: 11,
  /** Marge des champs à gauche. */
  padding: 6,
  /** Écart du second trait d'un entête à cadre double. */
  doubleGap: 3,
  /** Côté du coin plié d'un document. */
  fold: 10,
  /**
   * Icône d'entête : cadre de dessin (14 × 9), agrandi `zoom` fois à l'affichage (21 × 13,5 px), écart au bord droit
   * de l'entête.
   */
  mark: { width: 14, height: 9, zoom: 1.5, margin: 7 },
  /** Amplitude du bas ondulé d'un embedded ; la table a deux amplitudes de plus en bas. */
  wave: 2,
  width: 160,
} as const;

/** Couleur d'entête par défaut (premier fond de `modePalette`). */
export const DEFAULT_HEADER_COLOR = '#dae8fc';

/** Icône d'entête : jumelles (vue), liste (énumération), prise électrique (embedded, sujet 223). */
export type HeaderMark = 'binoculars' | 'list' | 'plug';

/**
 * Forme de table, reconnue à sa marque propre (sans mention au-dessus du nom, sujet 218) : nom en italique, clé
 * primaire `id` toujours en tête des champs (sujet 180)…
 */
export interface TableKind {
  italic?: boolean;
  primaryKey?: boolean;
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

/** Clé primaire des tables qui en ont une : premier champ, souligné, ni retiré ni déplacé. */
export const PRIMARY_KEY = 'id';

/**
 * Tables du mode, par id de forme : le rendu et les opérations du mode (hauteur, échelle) en dépendent. Le modèle
 * abstrait est la base des autres : jamais posé depuis la palette (sujet 180), il reste dessiné s'il est dans un
 * fichier.
 */
export const TABLE_KINDS: Record<string, TableKind> = {
  'rdd-model': { italic: true },
  'rdd-entity': { primaryKey: true },
  'rdd-enum': { primaryKey: true, doubleHeader: true, mark: 'list' },
  // Sujet 181 : objet incorporé (bas ondulé, sujet 219), document JSONB (clés indicatives), vue (coins arrondis).
  'rdd-embedded': { wavy: true, mark: 'plug' },
  'rdd-document': { italicFields: true, requiredName: 'Document', folded: true },
  'rdd-view': { style: 'rounded=1;absoluteArcSize=1;arcSize=16;', mark: 'binoculars' },
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

/** Nom vide d'une table au nom obligatoire (document JSONB) ? */
export const missingName = (shape: ShapeModel) =>
  tableKindOf(shape)?.requiredName !== undefined && shape.label.trim() === '';

/** Icône d'entête affichée : celle de la forme de table, sauf si la table la masque (`spatial.icon=0`). */
export function shownMark(shape: ShapeModel): HeaderMark | undefined {
  const mark = tableKindOf(shape)?.mark;
  return mark && spatialValue(shape, ICON) !== '0' ? mark : undefined;
}

export const isSecondary = (shape: ShapeModel) => spatialValue(shape, SECONDARY) === '1';

/** Hauteur de l'entête, à l'échelle de la table. */
export function headerHeight(secondary: boolean): number {
  return TABLE.header * (secondary ? SECONDARY_SCALE : 1);
}

/**
 * Hauteur de la table pour `count` champs : entête et une ligne par champ (au moins une ligne vide), plus la place de
 * la vague d'un bas ondulé.
 */
export function tableHeight(kind: TableKind, secondary: boolean, count: number): number {
  const rows = Math.max(1, count) * TABLE.row + (kind.wavy ? 2 * TABLE.wave : 0);
  return headerHeight(secondary) + rows * (secondary ? SECONDARY_SCALE : 1);
}
