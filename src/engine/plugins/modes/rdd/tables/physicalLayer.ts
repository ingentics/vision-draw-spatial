import type { PageModeDefinition, ShapeModel } from '../../../../core/plugins';
import type { Field } from './fieldModel';
import { fieldNote } from './fieldModel';
import { tableKindOf, tableName } from './tableKinds';
import { keys } from '../keys';

/**
 * Couches logique et physique d'une page RDD (sujet 414) : courant du mode (état de session, jamais écrit), habillage
 * du rendu en couche physique, textes affichés dans chaque couche.
 */

export const LOGICAL = 'logical';
export const PHYSICAL = 'physical';

/** Nom en base d'une table (sujet 413) et d'un champ (`Field.dbName`). */
export const DB_NAME = 'dbName';

/** Partie du nom en base d'une table, éditée à la place de son texte en couche physique. */
export const NAME_PART = 'name';

/** Clé de style posée par l'habillage sur les tables en couche physique : dessinée, jamais écrite. */
const LAYER = 'layer';

const LAYERS: Record<string, { label: string; color: string }> = {
  [LOGICAL]: { label: 'Couche logique', color: '#dae8fc' },
  [PHYSICAL]: { label: 'Couche physique', color: '#d5e8d4' },
};

/** La table est-elle dessinée dans la couche physique (entité, énumération, vue, fragment) ? */
export const hasPhysicalLayer = (shape: ShapeModel): boolean => !!tableKindOf(shape)?.rules.physicalLayer;

/** La table a-t-elle un nom en base (entité, énumération, vue ; pas un fragment, incorporé) ? */
export const hasPhysicalName = (shape: ShapeModel): boolean => !!tableKindOf(shape)?.rules.physicalName;

/** Nom en base écrit d'une table qui peut en avoir un ; undefined sinon ou vide. */
export const physicalName = (shape: ShapeModel): string | undefined =>
  hasPhysicalName(shape) ? keys.value(shape, DB_NAME) || undefined : undefined;

/** Habillage d'une table en couche physique (clé de style dessinée) ; undefined en couche logique ou hors table. */
export const layerStyle = (shape: ShapeModel, current: string | undefined): Record<string, string> | undefined =>
  current === PHYSICAL && hasPhysicalLayer(shape) ? { [keys.key(LAYER)]: PHYSICAL } : undefined;

/** La table est-elle dessinée en couche physique (habillage de `layerStyle`) ? */
export const physicalShown = (shape: ShapeModel): boolean => keys.value(shape, LAYER) === PHYSICAL;

/** Texte affiché dans une couche ; `missing` : valeur physique absente, la logique la remplace (en italique). */
export interface LayerText {
  text: string;
  missing: boolean;
}

/** Titre d'une table dans une couche ; celui d'un fragment, sans nom en base, reste son nom. */
export function layerTitle(shape: ShapeModel, physical: boolean): LayerText {
  const named = physical && hasPhysicalName(shape);
  const name = named ? physicalName(shape) : undefined;
  return { text: name ?? tableName(shape), missing: named && name === undefined };
}

/** Label et texte gris (type) d'une ligne de champ dans une couche. */
export function layerFieldTexts(field: Field, physical: boolean): { label: LayerText; note: LayerText } {
  const label = physical ? field.dbName : undefined;
  const type = physical ? field.dbType : undefined;
  return {
    label: { text: label ?? field.label, missing: physical && label === undefined },
    note: { text: type ?? fieldNote(field), missing: physical && type === undefined },
  };
}

/** Le champ manque-t-il de son nom ou de son type en base (couche physique : icône d'alerte, sujet 425) ? */
export const physicalMissing = (field: Field): boolean => field.dbName === undefined || field.dbType === undefined;

/**
 * Courant du mode : la couche affichée, logique par défaut, dans la barre du courant. Les tables sans couche physique
 * sont estompées en couche physique ; la page est redessinée à chaque bascule.
 */
export const LAYER_CURRENT: NonNullable<PageModeDefinition['current']> = {
  initial: () => LOGICAL,
  valid: (_page, value) => value in LAYERS,
  color: (_page, value) => LAYERS[value]?.color,
  label: (_page, value) => LAYERS[value]?.label ?? value,
  values: () => [LOGICAL, PHYSICAL],
  focus: (page, value) =>
    value === PHYSICAL
      ? [
          ...page.shapes.filter((shape) => !tableKindOf(shape) || hasPhysicalLayer(shape)).map((shape) => shape.id),
          ...page.edges.map((edge) => edge.id),
        ]
      : undefined,
  redraws: true,
};
