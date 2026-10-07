import type { ViewMode } from '../interaction/cameraMath';
import type { EdgeModel, PageModel, Point, Rect, ShapeModel } from '../model/types';
import type { PaletteCategory } from '../shapes/types';

/**
 * Modes de page (sujet 69) : un mode spécialise une page (`spatial.mode=<id>` sur `<diagram>`). Il ajoute des
 * données de page, des réglages sur les éléments et un habillage du rendu, stockés en attributs `spatial.*` : draw.io
 * n'en montre rien. Chaque mode vit dans son dossier (`modes/<id>/index.ts`, qui exporte `definition`) ; le moteur ne
 * connaît aucun mode en particulier. Les sections React propres à un mode sont dans `src/app/modes/<id>/`. Ses formes
 * propres sont dans `modes/<id>/shapes/<forme>/index.ts` (sujet 178), id préfixé par celui du mode.
 */
export interface PageModeDefinition {
  /** Identifiant, valeur de `spatial.mode` : nom du dossier. */
  id: string;
  /** Nom affiché dans le choix du mode. */
  name: string;
  /** Aide au survol du choix du mode. */
  description?: string;
  /** Icône de l'onglet d'une page du mode (sujets 197, 198). */
  icon?: ModeIcon;
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
  /** « Courant » du mode sur une page (ex. flux courant) : état de session, gardé par le moteur, jamais écrit. */
  current?: ModeCurrent;
  /** Flèche créée sur la page (tirée depuis une forme), dans la même étape d'annulation ; `current` : le courant. */
  edgeCreated?(edit: ModeEdit, edgeId: string, current: string | undefined): void;
  /**
   * Formes proposées par la palette sur une page du mode (ids, générales ou du mode), dans l'ordre de la palette ;
   * absent = palette normale et formes du mode. Les formes déjà sur la page et le collage ne sont pas filtrés.
   */
  shapes?: string[];
  /** Catégories de palette propres au mode (ex. « RDD »), rangées avec celles de la palette par `order`. */
  paletteCategories?: PaletteCategory[];
  /** Modes d'affichage permis sur une page du mode ; absent = tous. La page s'affiche dans le premier. */
  viewModes?: ViewMode[];
  /** Effet de page permis sur une page de ce mode (le mode reste maître) ; absent = tous. */
  allowsEffect?(effectId: string): boolean;
  /** Touches sur l'élément sélectionné seul, par `KeyboardEvent.key` (ex. `+`). */
  keys?: Record<string, ModeKey>;
  /**
   * Formes emportées quand on déplace `shape` (ex. contenu d'une région RDD, sujet 182) : calculées, sans parent
   * draw.io. Elles bougent dans la même étape d'annulation, avec les flèches qui les relient entre elles.
   */
  carries?(page: PageModel, shape: ShapeModel): string[];
  /**
   * Formes posées : déplacées (fin d'un glisser, flèches du clavier) ou ajoutées depuis la palette ; remise en ordre
   * dans la même étape d'annulation (ex. région RDD agrandie pour les contenir, sujet 183). `edit.page` est la page
   * après la pose ; `before`, la page avant un déplacement (absente pour un ajout, sujet 234).
   */
  placed?(edit: ModeEdit, shapeIds: string[], before?: PageModel): void;
  /**
   * Texte d'un élément changé (édition sur place ou panneau) ; remise en ordre dans la même étape d'annulation (ex.
   * table RDD élargie pour son nom, sujet 247). `edit.page` montre le nouveau texte.
   */
  relabeled?(edit: ModeEdit, elementId: string): void;
  /**
   * Remise en ordre d'une page du mode à l'ouverture du document, et de nouveau quand la mesure exacte du texte arrive
   * (ex. tables RDD ajustées à leur contenu, sujet 255) ; une étape d'annulation pour tout le document, rien si rien ne
   * change ni dans un document en lecture seule.
   */
  opened?(edit: ModeEdit): void;
  /**
   * Mise en valeur de la sélection imposée sur une page du mode (sujet 254, ex. RDD : contour) ; le paramètre
   * `selection.style` vaut sur les autres pages.
   */
  selectionStyle?: 'veil' | 'outline';
  /** Parties sélectionnables à l'intérieur des formes du mode (ex. champs d'une table RDD, sujet 249). */
  parts?: ModeParts;
  /**
   * Poignées propres au mode sur la forme sélectionnée seule, modifiable (sujet 250, ex. « + » d'une table RDD) ;
   * `part` : sa partie sélectionnée.
   */
  handles?(page: PageModel, shape: ShapeModel, part?: string): ModeHandle[];
  /**
   * Clic sur une poignée : opération du mode (une étape d'annulation, sujet 256). Renvoie la partie à sélectionner
   * ensuite (son texte passe en édition s'il en a un) ; undefined : la sélection ne change pas.
   */
  handleClicked?(edit: ModeEdit, shape: ShapeModel, handle: string, part?: string): string | undefined;
  /**
   * Bornes d'une forme qu'on déplace ou redimensionne (sujet 241, ex. régions sœurs d'une région RDD) : obstacles à ne
   * pas approcher à moins de l'écart des paramètres (`shapes.modeObstacleGap`) ; undefined = aucune borne.
   */
  obstacles?(page: PageModel, shape: ShapeModel): ModeObstacles | undefined;
}

/**
 * Parties d'une forme du mode (sujet 249) : un clic sur l'une d'elles la sélectionne directement (Échap revient à la
 * forme). Une partie est désignée par une chaîne propre au mode (ex. rang d'un champ).
 */
export interface ModeParts {
  /** Partie sous `point` (pixels de page) ; undefined = la forme elle-même (ex. son entête). */
  at(page: PageModel, shape: ShapeModel, point: Point): string | undefined;
  /** Emprise de la partie (pixels de page), mise en valeur à la sélection ; undefined = partie disparue. */
  bounds(page: PageModel, shape: ShapeModel, part: string): Rect | undefined;
  /** Texte modifiable sur place (double-clic, sur une ligne : Entrée valide) ; undefined = pas de texte. */
  text?(page: PageModel, shape: ShapeModel, part: string): ModePartText | undefined;
  /** Écrit le texte validé (le mode décide d'un texte vide : refusé, ou partie retirée). */
  setText?(edit: ModeEdit, shape: ShapeModel, part: string, text: string): void;
  /**
   * Suppr sur la partie sélectionnée (sujet 251) : la retire ; le mode peut refuser (ex. clé primaire), rien n'est
   * alors écrit. Dans tous les cas, la forme elle-même n'est pas supprimée.
   */
  remove?(edit: ModeEdit, shape: ShapeModel, part: string): void;
  /**
   * Glisser de la partie sélectionnée (sujet 252) : place visée sous `point` (pixels de page), désignée par une chaîne
   * du mode ; undefined = aucune place (le lâcher ne fait rien).
   */
  dropAt?(page: PageModel, shape: ShapeModel, part: string, point: Point): string | undefined;
  /**
   * Aperçu pendant le glisser : la forme telle qu'elle serait avec la partie à la place `target` (sans rien écrire),
   * et la partie à cette place ; la forme est redessinée ainsi en direct.
   */
  preview?(shape: ShapeModel, part: string, target: string): { shape: ShapeModel; part: string } | undefined;
  /** Lâcher sur une place de `dropAt` : déplace la partie ; renvoie la partie à sélectionner ensuite. */
  move?(edit: ModeEdit, shape: ShapeModel, part: string, target: string): string | undefined;
}

/** Poignée d'un mode (sujet 250) : disque de couleur marqué d'un « + » blanc. */
export interface ModeHandle {
  id: string;
  /** Point d'accroche, en pixels de page ; le centre en est décalé de `offset` pixels écran. */
  at: Point;
  offset: Point;
  /** Fond du disque (#rrggbb). */
  color: string;
  /** Aide au survol, et titre de l'étape d'annulation. */
  title: string;
}

/** Texte d'une partie : valeur, cadre de l'éditeur (pixels de page) et taille du texte (pixels de page). */
export interface ModePartText {
  text: string;
  zone: Rect;
  fontSize: number;
  /** Texte en italique. */
  italic?: boolean;
}

/** Obstacles d'une forme (sujet 241), en emprises (ex. onglet d'une région compris). */
export interface ModeObstacles {
  rects: Array<{ id: string; rect: Rect }>;
  /** Ce que la forme dessine au-dessus de ses bornes et qui compte dans son emprise (ex. onglet), en pixels de page. */
  above?: number;
}

/**
 * Icône d'un mode (sujet 198), au style des icônes d'arrangement : tracés SVG (`d`) dans un carré de 16. `fill` :
 * formes pleines grises ; `line` : repères fins gris en pointillé ; `accent` : traits de couleur d'accent.
 */
export interface ModeIcon {
  fill?: string;
  line?: string;
  accent?: string;
}

/** « Courant » d'un mode (ex. flux courant du mode Séquences). */
export interface ModeCurrent {
  /** Valeur quand rien n'est choisi ou que le choix n'est plus valable (ex. premier flux) ; undefined = aucun. */
  initial(page: PageModel): string | undefined;
  /** Le choix est-il encore valable sur la page (ex. flux toujours là) ? */
  valid(page: PageModel, value: string): boolean;
  /**
   * Nouveau courant pour un élément (ex. flux de la flèche) ; undefined = inchangé. Un clic sur un élément qui change
   * le courant ne fait que le changer (un second clic le sélectionne) ; les autres sélections d'un seul élément le
   * changent aussi.
   */
  pick?(page: PageModel, target: ModeTarget): string | undefined;
  /** Couleur de la barre du courant, en haut de la zone de dessin (#rrggbb) ; undefined = pas de barre. */
  color?(page: PageModel, value: string): string | undefined;
  /** Libellé du courant dans la barre (ex. titre du flux) ; défaut : la valeur. */
  label?(page: PageModel, value: string): string;
  /** Valeurs possibles, dans l'ordre (boutons précédent / suivant de la barre) ; défaut : aucune. */
  values?(page: PageModel): string[];
  /**
   * Éléments gardés nets pour ce courant (ex. flèches du flux et leurs formes) ; les autres sont estompés (paramètre
   * « Opacité hors du flux courant »). Undefined : rien n'est estompé.
   */
  focus?(page: PageModel, value: string): string[] | undefined;
  /** Renomme le courant (ex. titre du flux), depuis la barre ; `label` n'est jamais vide. */
  rename?(edit: ModeEdit, value: string, label: string): void;
}

/** Touche d'un mode sur l'élément sélectionné : opération (une étape d'annulation, libellée `label`). */
export interface ModeKey {
  label: string;
  /** L'élément est-il concerné (sinon la touche n'est pas prise) ? */
  applies(page: PageModel, target: ModeTarget): boolean;
  run(edit: ModeEdit, target: ModeTarget, current: string | undefined): void;
}

/** Élément d'une page qui peut porter les réglages d'un mode. */
export type ModeTarget = PageModel | ShapeModel | EdgeModel;

/**
 * Écritures d'une opération de mode sur la page courante, groupées en une étape d'annulation. `page` est l'état
 * avant l'opération (le modèle n'est relu qu'à la fin) ; une écriture identique à la valeur en place est ignorée.
 */
export interface ModeEdit {
  readonly page: PageModel;
  /** Couleurs proposées par l'appli (fonds des styles de forme des paramètres, `modePalette`) ; peut être vide. */
  readonly palette: readonly string[];
  /** Attribut de `<diagram>` ; undefined le retire. */
  setPageAttribute(key: string, value: string | undefined): void;
  /** Attribut spatial d'une forme ou d'une flèche (là où il est déjà, sinon dans le style) ; undefined le retire. */
  setElementAttribute(elementId: string, key: string, value: string | undefined): void;
  /** Clé du style draw.io d'un élément (ex. `fillColor`, sujet 179) ; undefined la retire. */
  setElementStyle(elementId: string, key: string, value: string | undefined): void;
  /** Nouvelles bornes d'une forme, en coordonnées page (sujet 179) ; ses enfants suivent son coin haut-gauche. */
  setShapeBounds(shapeId: string, bounds: Rect): void;
  /** Envoie ces formes au fond de l'ordre de dessin, dans cet ordre (la première tout au fond) (sujet 230). */
  sendToBack(shapeIds: readonly string[]): void;
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
  /**
   * Réglage d'une partie de la forme (sujet 249) : montré seulement quand une partie est sélectionnée, et les autres
   * réglages de forme seulement quand aucune ne l'est ; `part` est alors passé à `value`, `write` et `hidden`.
   */
  part?: boolean;
  /** Valeur affichée ; défaut : l'attribut `key`. */
  value?(page: PageModel, target: ModeTarget, part?: string): string | undefined;
  /** Écriture (undefined = vide) ; défaut : l'attribut `key`. */
  write?(edit: ModeEdit, target: ModeTarget, value: string | undefined, part?: string): void;
  /** Champ masqué pour cette cible (ex. rang d'une flèche sans flux). */
  hidden?(page: PageModel, target: ModeTarget, part?: string): boolean;
  /** Affiché sans être modifiable (ex. clé primaire d'une entité). */
  readOnly?: boolean;
} & (
  | { type: 'toggle' }
  | { type: 'number' }
  | {
      type: 'text';
      /** Plusieurs lignes (zone de texte, ⌘ + Entrée ou sortie du champ pour valider). */
      multiline?: boolean;
    }
  | {
      type: 'select';
      /** Choix offerts (valeur vide = aucun) ; `palette` : couleurs proposées par l'appli (`ModeEdit.palette`). */
      options(page: PageModel, palette: readonly string[]): ModeOption[];
    }
);

/** Habillage d'une page par son mode. */
export interface PageDressing {
  /**
   * Couleur du mode pour une flèche (#rrggbb, ex. celle de son flux) : trait et pointes la prennent, assombrie selon
   * le paramètre « Assombrissement du trait » ; undefined = son style.
   */
  edgeColor?(edge: EdgeModel): string | undefined;
  /** Pastille posée sur une flèche, face à la caméra. */
  edgeBadge?(edge: EdgeModel): EdgeBadge | undefined;
}

/** Pastille ronde d'une flèche : au-dessus de son texte du milieu, plus petite au milieu de la flèche sans texte. */
export interface EdgeBadge {
  text: string;
  /** Fond (#rrggbb) ; le texte est noir. */
  color: string;
}

export interface ModeIssue {
  cellId?: string;
  message: string;
}
