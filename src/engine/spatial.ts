/**
 * Attributs spatiaux (SPEC §14.3) : informations propres au mode spatial, stockées dans le fichier
 * draw.io avec un préfixe unique (`spatial.`), soit dans le style de la cellule
 * (`…;spatial.height=40;`), soit en attribut de son `<object>` / `<UserObject>`
 * (`spatial.height="40"`, « Modifier les données » dans draw.io). draw.io conserve les deux.
 * Le style l'emporte s'il y a les deux.
 */

export const SPATIAL_PREFIX = 'spatial.';

/** Épaisseur par défaut des volumes (iso / 3D), commune à toutes les formes, en pixels de page. */
export const DEFAULT_DEPTH = 32;
/** Ancienne épaisseur par défaut (avant que toutes les formes partagent 32) : migrée vers `DEFAULT_DEPTH`. */
export const LEGACY_DEFAULT_DEPTH = 16;

/** Attributs connus du moteur. */
export const SPATIAL = {
  /** Forme dessinée par Drawio Spatial (`ShapeModel.kind`), à la place de celle devinée du style draw.io. */
  kind: 'spatial.kind',
  /** Épaisseur du volume en iso, en pixels de page (défaut : réglage « Épaisseur »). */
  height: 'spatial.height',
  /** Hauteur du dessous du volume au-dessus de sa base (sol ou dessus du conteneur), en pixels de page. */
  elevation: 'spatial.elevation',
  /** Étiquette des façades d'un bâtiment iso (BDD, queue, cache) : remplace « DB »… ; vide = aucune. */
  tag: 'spatial.tag',
  /** Nombre de nœuds d'un cache distribué : disques empilés en iso (réglage déclaré par `shapes/datastore`). */
  nodes: 'spatial.nodes',
  /** Mode de la page (attribut de `<diagram>`) : id d'un mode de `modes/` (ex. `sequences`) ; absent = page normale. */
  mode: 'spatial.mode',
  /** Ancrage des flèches de la page (attribut de `<diagram>`) : `manual` ou `auto` ; absent = réglage de l'appli. */
  anchoring: 'spatial.anchoring',
  /** Graine d'agencement de la page en ancrage automatique (attribut de `<diagram>`, touche F) ; absente = 0. */
  anchorSeed: 'spatial.anchorSeed',
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
