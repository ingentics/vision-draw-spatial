import { drawioStyle } from '../../../../core/plugins';
import type { Field, FieldKind } from './fieldModel';

/**
 * Couleurs des tables du mode RDD, sans dépendance au rendu : la logique (texte en place d'un séparateur) et le dessin
 * (`shapes/common/`) les partagent.
 */

/** Couleur d'entête par défaut : le style « Gris » des styles de forme (sujet 235), avec son texte et sa bordure. */
const GRAY = drawioStyle('Gris');
export const DEFAULT_HEADER_COLOR = GRAY.fillColor;
export const DEFAULT_HEADER_TEXT = GRAY.fontColor!;
/** Bordure d'une table neuve. */
export const TABLE_BORDER = GRAY.strokeColor;
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
/** Couleur du losange d'un champ : celle de son kind ; un champ non structuré prend celle de l'embed (sujet 375). */
export const fieldIconColor = (field: Field): string =>
  field.type === 'dynamic' ? FIELD_KIND_COLORS.embed : FIELD_KIND_COLORS[field.kind];
/** Contour gris des losanges de kind. */
export const FIELD_ICON_STROKE = '#888888';
/** Gris du type de donnée (et du label d'un séparateur). */
export const TYPE_COLOR = '#999999';
/** Gris du trait d'un séparateur. */
export const DIVIDER_STROKE = '#cccccc';
