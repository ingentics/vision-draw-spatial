/**
 * Attributs spatiaux (SPEC §14.3) : informations propres au mode spatial, stockées dans le fichier
 * draw.io avec un préfixe unique (`spatial.`), soit dans le style de la cellule
 * (`…;spatial.height=40;`), soit en attribut de son `<object>` / `<UserObject>`
 * (`spatial.height="40"`, « Modifier les données » dans draw.io). draw.io conserve les deux.
 * Le style l'emporte s'il y a les deux.
 */

export const SPATIAL_PREFIX = 'spatial.';

/** Attributs connus du moteur. */
export const SPATIAL = {
  /** Épaisseur du volume en iso, en pixels de page (défaut : réglage « Épaisseur »). */
  height: 'spatial.height',
  /** Hauteur du dessous du volume au-dessus de sa base (sol ou dessus du conteneur), en pixels de page. */
  elevation: 'spatial.elevation',
  /** `1` : lien sans pastille (ex. cartes de la vue graphe). */
  noLinkBadge: 'spatial.noLinkBadge',
  /** État de vue d'une page (attribut de `<diagram>`, voir `format/viewState`). */
  view: 'spatial.view',
} as const;

export type SpatialKey = (typeof SPATIAL)[keyof typeof SPATIAL];

interface SpatialSource {
  style: Record<string, string>;
  attributes: Record<string, string>;
}

/** Valeur d'un attribut spatial : style de la cellule, sinon attribut de son objet. */
export function spatialValue(element: SpatialSource, key: string): string | undefined {
  return element.style[key] ?? element.attributes[key];
}

/** Valeur numérique positive ou nulle ; undefined si absente ou invalide. */
export function spatialNumber(element: SpatialSource, key: string): number | undefined {
  const value = parseFloat(spatialValue(element, key) ?? '');
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Tous les attributs spatiaux d'un élément (style puis objet), pour l'affichage et les diagnostics. */
export function spatialAttributes(element: SpatialSource): Record<string, string> {
  const result: Record<string, string> = {};
  for (const source of [element.attributes, element.style]) {
    for (const [key, value] of Object.entries(source)) if (key.startsWith(SPATIAL_PREFIX)) result[key] = value;
  }
  return result;
}
