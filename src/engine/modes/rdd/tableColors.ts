import type { FieldKind } from './fieldModel';

/**
 * Couleurs des tables du mode RDD, sans dépendance au rendu : la logique (texte en place d'un séparateur) et le dessin
 * (`shapes/common/`) les partagent.
 */

/** Couleur d'entête par défaut : le style « Gris » des styles de forme (sujet 235), avec son texte. */
export const DEFAULT_HEADER_COLOR = '#f5f5f5';
export const DEFAULT_HEADER_TEXT = '#333333';
/** Bordure d'une table neuve. */
export const TABLE_BORDER = '#666666';
/** Fond de la zone des champs. */
export const FIELDS_FILL = '#ffffff';

/** Couleur du losange par kind (sujet 248). */
export const FIELD_KIND_COLORS: Record<FieldKind, string> = {
  pk: '#ffd700',
  property: '#4a90e2',
  fk: '#e74c3c',
  'external-fk': '#3c9641',
  embed: '#ae62e3',
};
/** Contour gris des losanges de kind. */
export const FIELD_ICON_STROKE = '#888888';
/** Gris du type de donnée (et du label d'un séparateur). */
export const TYPE_COLOR = '#999999';
/** Gris du trait d'un séparateur. */
export const DIVIDER_STROKE = '#cccccc';
