import type { EdgeModel, PageModel, ShapeModel } from '../model/types';

/**
 * Modes de page (sujet 69) : un mode spécialise une page (`spatial.mode=<id>` sur `<diagram>`). Il ajoute des
 * données de page, des réglages sur les éléments et un habillage du rendu, stockés en attributs `spatial.*` : draw.io
 * n'en montre rien. Chaque mode vit dans son dossier (`modes/<id>/index.ts`, qui exporte `definition`) ; le moteur ne
 * connaît aucun mode en particulier. Les sections React propres à un mode sont dans `src/app/modes/<id>/`.
 */
export interface PageModeDefinition {
  /** Identifiant, valeur de `spatial.mode` : nom du dossier. */
  id: string;
  /** Nom affiché dans le choix du mode. */
  name: string;
  /** Aide au survol du choix du mode. */
  description?: string;
  /** Réglages déclarés de la page, d'une flèche, d'une forme : affichés par des champs génériques du panneau. */
  pageProperties?: ModeProperty[];
  edgeProperties?: ModeProperty[];
  shapeProperties?: ModeProperty[];
  /** Habillage du rendu de la page, appliqué au dessin sans modifier le style draw.io. */
  dressing?(page: PageModel): PageDressing;
  /** Incohérences des données (ex. fichier modifié dans draw.io), remises en ordre au mieux et signalées. */
  check?(page: PageModel): ModeIssue[];
  /** Remise en ordre écrite dans le fichier, après une suppression d'éléments (même étape d'annulation). */
  repair?(edit: ModeEdit): void;
  /** Attributs retirés des éléments collés ou dupliqués (sur toutes les pages : ils dorment hors du mode). */
  pasteKeys?: string[];
}

/** Élément d'une page qui peut porter les réglages d'un mode. */
export type ModeTarget = PageModel | ShapeModel | EdgeModel;

/**
 * Écritures d'une opération de mode sur la page courante, groupées en une étape d'annulation. `page` est l'état
 * avant l'opération (le modèle n'est relu qu'à la fin) ; une écriture identique à la valeur en place est ignorée.
 */
export interface ModeEdit {
  readonly page: PageModel;
  /** Attribut de `<diagram>` ; undefined le retire. */
  setPageAttribute(key: string, value: string | undefined): void;
  /** Attribut spatial d'une forme ou d'une flèche (là où il est déjà, sinon dans le style) ; undefined le retire. */
  setElementAttribute(elementId: string, key: string, value: string | undefined): void;
}

export interface ModeOption {
  value: string;
  label: string;
  /** Pastille de couleur devant l'option (#rrggbb). */
  color?: string;
}

/**
 * Réglage déclaré par un mode, rendu par un champ générique. Par défaut, il lit et écrit l'attribut `key` de sa
 * cible ; `value` et `write` le remplacent quand le réglage passe par les règles du mode (ex. un rang qui s'échange).
 */
export type ModeProperty = {
  key: string;
  label: string;
  /** Aide au survol. */
  title?: string;
  placeholder?: string;
  /** Valeur affichée ; défaut : l'attribut `key`. */
  value?(page: PageModel, target: ModeTarget): string | undefined;
  /** Écriture (undefined = vide) ; défaut : l'attribut `key`. */
  write?(edit: ModeEdit, target: ModeTarget, value: string | undefined): void;
  /** Champ masqué pour cette cible (ex. rang d'une flèche sans flux). */
  hidden?(page: PageModel, target: ModeTarget): boolean;
} & (
  | { type: 'toggle' }
  | { type: 'number' }
  | { type: 'text' }
  | {
      type: 'select';
      /** Choix offerts (valeur vide = aucun). */
      options(page: PageModel): ModeOption[];
    }
);

/** Habillage d'une page par son mode. */
export interface PageDressing {
  /** Couleur imposée au trait et aux pointes d'une flèche (#rrggbb) ; undefined = son style. */
  edgeColor?(edge: EdgeModel): string | undefined;
  /** Pastille posée sur une flèche, face à la caméra. */
  edgeBadge?(edge: EdgeModel): EdgeBadge | undefined;
}

/** Pastille ronde d'une flèche : au-dessus de son texte du milieu, plus petite au milieu de la flèche sans texte. */
export interface EdgeBadge {
  text: string;
  /** Fond (#rrggbb) ; le texte est blanc ou noir selon le contraste. */
  color: string;
}

export interface ModeIssue {
  cellId?: string;
  message: string;
}
