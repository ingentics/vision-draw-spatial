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
  /**
   * Texte du milieu d'une flèche tourné dans le sens du segment où il est posé (`1`) ; absent = horizontal.
   * draw.io l'ignore et garde le texte horizontal.
   */
  labelFollow: 'spatial.labelFollow',
  /**
   * Texte du milieu qui suit sa flèche : décalage le long du trait, en pixels de page (positif = vers la fin,
   * négatif = vers le début) ; absent = aucun. Sans effet sans `labelFollow`.
   */
  labelFollowShift: 'spatial.labelFollowShift',
  /** Mode de la page (attribut de `<diagram>`) : id d'un mode de `modes/` (ex. `sequences`) ; absent = page normale. */
  mode: 'spatial.mode',
  /**
   * Effets de la page (attribut de `<diagram>`) : ids d'effets de `effects/` séparés par des virgules (ex. `forest`) ;
   * absent = aucun. Ils se cumulent, sous l'autorité du mode de la page.
   */
  effects: 'spatial.effects',
  /** Ancrage des flèches de la page (attribut de `<diagram>`) : `manual` ou `auto` ; absent = réglage de l'appli. */
  anchoring: 'spatial.anchoring',
  /**
   * Saut des flèches de la page aux croisements (attribut de `<diagram>`) : `none`, `arc`, `gap`, `sharp` ou `line` ;
   * absent = réglage de l'appli. Une flèche sans `jumpStyle` le suit.
   */
  jumps: 'spatial.jumps',
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

/** Drapeau spatial : vrai pour `1` (convention draw.io des booléens). */
export function spatialFlag(element: SpatialSource, key: string): boolean {
  return spatialValue(element, key) === '1';
}

/**
 * Liste JSON écrite dans un attribut spatial (ex. `spatial.fields`, `spatial.flows`), lue au mieux (sujet 291) : la liste,
 * ou undefined si le texte n'est pas une liste JSON (absent : liste vide). Chaque plugin vérifie ensuite ses entrées.
 */
export function readJsonList(text: string | undefined): unknown[] | undefined {
  try {
    const value: unknown = JSON.parse(text ?? '[]');
    return Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Valeur à écrire d'une liste JSON : undefined (attribut retiré) pour une liste vide. */
export function jsonListValue(items: readonly unknown[]): string | undefined {
  return items.length > 0 ? JSON.stringify(items) : undefined;
}

/** Tous les attributs spatiaux d'un élément (style puis objet), pour l'affichage et les diagnostics. */
export function spatialAttributes(element: SpatialSource): Record<string, string> {
  const result: Record<string, string> = {};
  for (const source of [element.attributes, element.style]) {
    for (const [key, value] of Object.entries(source)) if (key.startsWith(SPATIAL_PREFIX)) result[key] = value;
  }
  return result;
}
