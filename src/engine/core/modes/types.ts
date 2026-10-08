import type { ViewMode } from '../interaction/cameraMath';
import type { EdgeEnd, EndTextGap } from '../edit/edgeLabels';
import type { Point, Rect } from '../model/types';
// Modèle en lecture seule (sujet 303) : un mode lit la page, il n'écrit que par `ModeEdit`.
import type {
  ReadonlyEdgeModel as EdgeModel,
  ReadonlyPageModel as PageModel,
  ReadonlyShapeModel as ShapeModel,
} from '../model/readonly';
import type { EdgeBadgeStyle } from '../render/types';
import type { PluginSetting, PluginValues } from '../settings/pluginSettings';
import type { PaletteCategory } from '../shapes/types';

/**
 * Modes de page (sujet 69) : un mode spécialise une page (`spatial.mode=<id>` sur `<diagram>`). Il ajoute des
 * données de page, des réglages sur les éléments et un habillage du rendu, stockés en attributs `spatial.*` : draw.io
 * n'en montre rien. Chaque mode vit dans son dossier (`plugins/modes/<id>/index.ts`, qui exporte `definition`) ; le
 * moteur ne connaît aucun mode en particulier. Les sections React propres à un mode sont dans
 * `src/app/plugins/modes/<id>/`. Ses formes propres sont dans `plugins/modes/<id>/shapes/<forme>/index.ts` (sujet
 * 178), id préfixé par celui du mode.
 */
export interface PageModeDefinition {
  /** Identifiant, valeur de `spatial.mode` : nom du dossier. */
  id: string;
  /**
   * Espace de noms des clés du mode (sujet 301, `^[a-z][a-z0-9]*$`, ex. `seq`) : il les écrit sous
   * `spatial.<namespace>.<nom>` en ne donnant que le nom court ; propre au mode (deux modes ne le partagent pas).
   */
  namespace: string;
  /** Nom affiché dans le choix du mode. */
  name: string;
  /** Nom court, là où la place manque (sous-page du mode dans les paramètres, ticket 283) ; défaut : `name`. */
  shortName?: string;
  /** Aide au survol du choix du mode. */
  description?: string;
  /** Icône de l'onglet d'une page du mode (sujets 197, 198). */
  icon?: ModeIcon;
  /**
   * Réglages globaux du mode (Paramètres › Modes, ticket 283), bornés ; leurs valeurs sont passées aux mécanismes qu'il
   * fournit (`gestures.obstacles`, `dressing`, `current.look`), qui les rendent au moteur.
   */
  settings?: PluginSetting[];
  /** La page du mode : ses réglages, ses vues, sa palette (sujet 295). */
  page?: ModePage;
  /** Moments de la vie du document : lecture, ouverture, suppression d'éléments. */
  lifecycle?: ModeLifecycle;
  /** Habillage du rendu de la page, appliqué au dessin sans modifier le style draw.io ; `values` : ses réglages. */
  dressing?(page: PageModel, values: PluginValues): PageDressing;
  /** Les flèches de la page : réglages, accroches permises, flèches gérées, création et rebranchement. */
  edges?: ModeEdges;
  /** Les formes et les gestes sur elles : réglages, formes emportées, bornes, pose, texte, poignées. */
  gestures?: ModeGestures;
  /** Parties sélectionnables à l'intérieur des formes du mode (ex. champs d'une table RDD, sujet 249). */
  parts?: ModeParts;
  /** « Courant » du mode sur une page (ex. flux courant) : état de session, gardé par le moteur, jamais écrit. */
  current?: ModeCurrent;
  /** Touches sur l'élément sélectionné seul, par `KeyboardEvent.key` (ex. `+`). */
  keys?: Record<string, ModeKey>;
  /**
   * Attributs du mode, par leur nom court, retirés des éléments collés ou dupliqués (sur toutes les pages : ils dorment
   * hors du mode ; ex. flux et rang d'une flèche).
   */
  pasteKeys?: string[];
}

/** La page d'un mode (sujet 295). */
export interface ModePage {
  /** Réglages déclarés de la page : affichés par des champs génériques du panneau. */
  properties?: ModeProperty[];
  /** Modes d'affichage permis sur une page du mode ; absent = tous. La page s'affiche dans le premier. */
  viewModes?: ViewMode[];
  /** Effet de page permis sur une page de ce mode (le mode reste maître) ; absent = tous. */
  allowsEffect?(effectId: string): boolean;
  /**
   * Mise en valeur de la sélection imposée sur une page du mode (sujet 254, ex. RDD : contour) ; le paramètre
   * `selection.style` vaut sur les autres pages.
   */
  selectionStyle?: 'veil' | 'outline';
  /** Palette d'une page du mode. */
  palette?: {
    /**
     * Formes proposées (ids, générales ou du mode), dans l'ordre de la palette ; absent = palette normale et formes du
     * mode. Les formes déjà sur la page et le collage ne sont pas filtrés.
     */
    shapes?: string[];
    /** Catégories de palette propres au mode (ex. « RDD »), rangées avec celles de la palette par `order`. */
    categories?: PaletteCategory[];
  };
}

/** Moments de la vie du document où le mode remet en ordre ou signale (sujet 295). */
export interface ModeLifecycle {
  /** Incohérences des données (ex. fichier modifié dans draw.io), remises en ordre au mieux et signalées. */
  check?(page: PageModel): ModeIssue[];
  /**
   * Remise en ordre d'une page du mode à l'ouverture du document, et de nouveau quand la mesure exacte du texte arrive
   * (ex. tables RDD ajustées à leur contenu, sujet 255) ; une étape d'annulation pour tout le document, rien si rien ne
   * change ni dans un document en lecture seule.
   */
  opened?(edit: ModeEdit): void;
  /** Éléments supprimés : remise en ordre écrite dans le fichier, dans la même étape d'annulation (ex-`repair`). */
  removed?(edit: ModeEdit): void;
}

/** Les flèches d'une page du mode (sujet 295). */
export interface ModeEdges {
  /** Réglages déclarés d'une flèche : affichés par des champs génériques du panneau. */
  properties?: ModeProperty[];
  /**
   * Flèche permise de `source` vers `target` (sujet 265, ex. liaisons des tables RDD) : le bout tiré ou rebranché ne
   * s'accroche qu'aux formes permises ; absent = toutes. Une forme sans aucune flèche se déclare `connectable: false`.
   * `part` (sujet 333) : partie de `target` sous le pointeur (`parts.at`), undefined = la forme elle-même ; seul le bout
   * d'arrivée en a une.
   */
  connects?(page: PageModel, source: ShapeModel, target: ShapeModel, part?: string): boolean;
  /**
   * Flèche gérée par le mode (sujet 265, ex. relation RDD et ses cardinalités) : dans le panneau, les réglages du mode
   * en tête, texte du milieu et commentaire modifiables, le reste en lecture seule ; positions des textes et lien
   * masqués.
   */
  manages?(page: PageModel, edge: EdgeModel): boolean;
  /**
   * Flèches dont le mode place le point d'arrivée (sujet 338, ex. flèches vers un champ RDD, sujet 333) : en ancrage
   * automatique et Typon, ce bout n'est pas réparti sur son côté ; le tracé arrive là où le mode l'a mis.
   */
  placedEntries?(page: PageModel): readonly string[];
  /**
   * Flèche créée sur la page (tirée depuis une forme), dans la même étape d'annulation ; `current` : le courant.
   * `part` (sujet 333) : partie visée au bout d'arrivée. Le mode la retient dans son attribut et place le point
   * d'arrivée (`edit.setElementStyle`, `sideConstraintAt`).
   */
  created?(edit: ModeEdit, edgeId: string, current: string | undefined, part?: string): void;
  /**
   * Bout d'une flèche rebranché (poignée de son extrémité), déjà écrit ; remise en ordre dans la même étape d'annulation
   * (ex. champ de relation RDD qui suit sa flèche, sujet 265). `part` (sujet 333) : partie visée, seulement si c'est le
   * bout d'arrivée qui a été rebranché ; sinon le mode garde la partie qu'il a retenue.
   */
  reconnected?(edit: ModeEdit, edgeId: string, part?: string): void;
}

/** Les formes d'une page du mode et les gestes sur elles (sujet 295). */
export interface ModeGestures {
  /** Réglages déclarés d'une forme ou de sa partie : affichés par des champs génériques du panneau. */
  properties?: ModeProperty[];
  /**
   * Formes emportées quand on déplace `shape` (ex. contenu d'une région RDD, sujet 182) : calculées, sans parent
   * draw.io. Elles bougent dans la même étape d'annulation, avec les flèches qui les relient entre elles.
   */
  carries?(page: PageModel, shape: ShapeModel): string[];
  /**
   * Bornes d'une forme qu'on déplace ou redimensionne (sujet 241, ex. régions sœurs d'une région RDD) : obstacles à ne
   * pas approcher à moins de leur écart (`gap`, réglage du mode) ; undefined = aucune borne.
   */
  obstacles?(page: PageModel, shape: ShapeModel, values: PluginValues): ModeObstacles | undefined;
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
  /** Poignées propres au mode sur la forme sélectionnée seule, modifiable (sujet 250, ex. « + » d'une table RDD). */
  handles?: ModeHandleSet;
}

/** Poignées d'un mode (sujets 250, 256). */
export interface ModeHandleSet {
  /** Poignées de `shape` ; `part` : sa partie sélectionnée. */
  list(page: PageModel, shape: ShapeModel, part?: string): ModeHandle[];
  /**
   * Clic sur une poignée : opération du mode (une étape d'annulation, sujet 256). Renvoie la partie à sélectionner
   * ensuite (son texte passe en édition s'il en a un) ; undefined : la sélection ne change pas.
   */
  clicked?(edit: ModeEdit, shape: ShapeModel, handle: string, part?: string): string | undefined;
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
  /**
   * Partie dont le texte s'édite au double-clic sous `point` (pixels de page) sans être sélectionnable : ni survol, ni
   * sélection, ni glisser (sujet 269, ex. corps d'un document RDD) ; undefined = aucune. Son texte passe par `text` et
   * `setText` comme celui d'une partie.
   */
  textAt?(page: PageModel, shape: ShapeModel, point: Point): string | undefined;
  /** Texte modifiable sur place (double-clic, sur une ligne : Entrée valide) ; undefined = pas de texte. */
  text?(page: PageModel, shape: ShapeModel, part: string): ModePartText | undefined;
  /** Écrit le texte validé (le mode décide d'un texte vide : refusé, ou permis). */
  setText?(edit: ModeEdit, shape: ShapeModel, part: string, text: string): void;
  /**
   * Commentaire d'une partie (sujet 262) : titre (ex. nom du champ) et texte brut, vide s'il n'y en a pas encore ;
   * undefined si la partie ne peut pas en avoir (ex. séparateur).
   */
  comment?(shape: ShapeModel, part: string): { title: string; text: string } | undefined;
  /** Commentaire d'une partie édité en place (touche C, sujet 262) : texte brut ; vide le retire. */
  setComment?(edit: ModeEdit, shape: ShapeModel, part: string, text: string): void;
  /**
   * Aperçu pendant la saisie (sujet 253) : la forme telle qu'elle serait avec ce texte (sans rien écrire), redessinée
   * en direct ; le texte dessiné de la partie (objets marqués `userData.part`) est masqué pendant l'édition.
   * `gridSize` : celui de `ModeEdit`, pour que l'aperçu ait la taille écrite ensuite (sujet 263).
   */
  textPreview?(shape: ShapeModel, part: string, text: string, gridSize: number): ShapeModel;
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
  /** Texte centré dans son cadre (sinon à gauche). */
  center?: boolean;
  /** Éditeur sans fond (ex. séparateur, sujet 253) ; sinon fond blanc, qui couvre le dessin de la ligne. */
  transparent?: boolean;
  /** Couleur du texte dans l'éditeur (#rrggbb, celle du texte dessiné) ; défaut : noir. */
  color?: string;
  /**
   * Texte sur plusieurs lignes (sujet 331) : Entrée passe à la ligne (⌘ + Entrée ou clic dehors valide), texte en haut
   * à gauche du cadre sans retour automatique, ascenseurs si le texte dépasse ; `setText` le reçoit tel quel.
   */
  multiline?: boolean;
  /** Éditeur en police à chasse fixe (police de code). */
  monospace?: boolean;
}

/** Obstacles d'une forme (sujet 241), en emprises (ex. onglet d'une région compris). */
export interface ModeObstacles {
  rects: Array<{ id: string; rect: Rect }>;
  /** Ce que la forme dessine au-dessus de ses bornes et qui compte dans son emprise (ex. onglet), en pixels de page. */
  above?: number;
  /** Écart minimal à garder avec les obstacles, en pixels de page (réglage du mode, ticket 283). */
  gap: number;
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
   * « Opacité hors du courant »). Undefined : rien n'est estompé.
   */
  focus?(page: PageModel, value: string): string[] | undefined;
  /** Renomme le courant (ex. titre du flux), depuis la barre ; `label` n'est jamais vide. */
  rename?(edit: ModeEdit, value: string, label: string): void;
  /** Apparence du courant d'après les réglages du mode (ticket 283) ; absent = défauts du moteur. */
  look?(values: PluginValues): ModeCurrentLook;
}

/** Apparence du courant d'un mode ; une valeur absente prend le défaut du moteur. */
export interface ModeCurrentLook {
  /** Opacité de ce que le courant ne garde pas net (`focus`), de 0 à 1 (défaut : 0,3). */
  dimOpacity?: number;
  /** Glissement de la barre quand elle part ou arrive avec une transition, en ms (0 = sans ; défaut : 200). */
  barSlideDuration?: number;
}

/** Touche d'un mode sur l'élément sélectionné : opération (une étape d'annulation, libellée `label`). */
export interface ModeKey {
  label: string;
  /** L'élément est-il concerné (sinon la touche n'est pas prise) ? `part` : sa partie sélectionnée (sujet 253). */
  applies(page: PageModel, target: ModeTarget, part?: string): boolean;
  /**
   * Opération de la touche ; peut renvoyer la partie de la forme à sélectionner ensuite, dont le texte passe en
   * édition s'il en a un (ex. séparateur ajouté, sujet 253).
   */
  run(edit: ModeEdit, target: ModeTarget, current: string | undefined, part?: string): string | void;
}

/** Élément d'une page qui peut porter les réglages d'un mode. */
export type ModeTarget = PageModel | ShapeModel | EdgeModel;

/** Ce que l'appli fournit aux opérations de mode : couleurs proposées et textes de début / fin (paramètres). */
export interface ModeEditContext {
  /** Fonds des styles de forme des paramètres (`modePalette`) ; peut être vide. */
  palette: readonly string[];
  /** Textes de début / fin des flèches : taille, couleur, écarts au bout (paramètres `shapes.edgeEndText…`). */
  endText: { size: number; color: string; gap: EndTextGap };
}

/**
 * Écritures d'une opération de mode sur la page courante, groupées en une étape d'annulation. `page` est l'état
 * avant l'opération (le modèle n'est relu qu'à la fin) ; une écriture identique à la valeur en place est ignorée. Une
 * clé invalide lève une exception (l'opération n'écrit alors rien) ; un élément verrouillé ne change ni d'attribut, ni de
 * style, ni de bornes, ni de place dans l'ordre, ni de textes de bout (sujet 301).
 */
export interface ModeEdit {
  readonly page: PageModel;
  /** Couleurs proposées par l'appli (fonds des styles de forme des paramètres, `modePalette`) ; peut être vide. */
  readonly palette: readonly string[];
  /** Pas de la grille de la page (`gridSize` draw.io), 0 sans grille (sujet 263). */
  readonly gridSize: number;
  /** Attribut du mode sur `<diagram>`, par son nom court (écrit `spatial.<namespace>.<name>`) ; undefined le retire. */
  setPageAttribute(name: string, value: string | undefined): void;
  /**
   * Attribut du mode sur une forme ou une flèche, par son nom court (là où il est déjà, sinon dans le style) ;
   * undefined le retire.
   */
  setElementAttribute(elementId: string, name: string, value: string | undefined): void;
  /**
   * Clé du style draw.io d'un élément (ex. `fillColor`, sujet 179) ; undefined la retire. Ni `spatial.*` ni clé de
   * verrou (`locked`, `movable`, `resizable`, `editable`, `deletable`).
   */
  setElementStyle(elementId: string, key: string, value: string | undefined): void;
  /** Nouvelles bornes d'une forme, en coordonnées page (sujet 179) ; ses enfants suivent son coin haut-gauche. */
  setShapeBounds(shapeId: string, bounds: Rect): void;
  /**
   * Supprime une flèche et ses textes (sujet 269, ex. flèche vers un champ qui n'existe plus) ; rien pour une flèche
   * verrouillée.
   */
  removeEdge(edgeId: string): void;
  /** Envoie ces formes au fond de l'ordre de dessin, dans cet ordre (la première tout au fond) (sujet 230). */
  sendToBack(shapeIds: readonly string[]): void;
  /**
   * Texte de début ou de fin d'une flèche (sujet 265, ex. cardinalité) : ajouté ou réécrit dans la configuration
   * par défaut de l'appli (contre le bout, la flèche partant dans le sens `direction`, alignement qui l'éloigne de la
   * forme ; taille et couleur des paramètres), ou retiré (undefined). `margin` s'ajoute aux écarts des paramètres
   * (ex. place d'une pointe large).
   */
  setEdgeEndText(
    edgeId: string,
    end: EdgeEnd,
    text: string | undefined,
    direction: Point,
    margin?: Partial<EndTextGap>,
  ): void;
}

export interface ModeOption {
  value: string;
  label: string;
  /** Pastille de couleur devant l'option (#rrggbb). */
  color?: string;
  /** Icône de l'option, mêmes tracés que l'icône d'un mode (sujet 319). */
  icon?: ModeIcon;
  /** Aide au survol d'une option en bouton (sujet 319) : ce que fait le choix ; défaut : `label`. */
  title?: string;
}

/**
 * Réglage déclaré par un mode, rendu par un champ générique. Par défaut, il lit et écrit l'attribut du mode de nom
 * court `key` sur sa cible (`spatial.<namespace>.<key>`) ; `value` et `write` le remplacent quand le réglage passe par
 * les règles du mode (ex. un rang qui s'échange).
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
  /** Montré que la forme seule ou une de ses parties soit sélectionnée (ex. bouton d'ajout d'un séparateur, 253). */
  anyPart?: boolean;
  /** Valeur affichée ; défaut : l'attribut `key`. */
  value?(page: PageModel, target: ModeTarget, part?: string): string | undefined;
  /**
   * Écriture (undefined = vide) ; défaut : l'attribut `key`. Peut renvoyer la partie de la forme à sélectionner ensuite,
   * dont le texte passe en édition s'il en a un (ex. séparateur ajouté, sujet 253).
   */
  write?(edit: ModeEdit, target: ModeTarget, value: string | undefined, part?: string): string | void;
  /** Champ masqué pour cette cible (ex. rang d'une flèche sans flux). */
  hidden?(page: PageModel, target: ModeTarget, part?: string): boolean;
  /** Affiché sans être modifiable (ex. clé primaire d'une entité) ; selon la cible (ex. label de la clé, sujet 260). */
  readOnly?: boolean | ((page: PageModel, target: ModeTarget, part?: string) => boolean);
  /** Section du panneau (titre) ; défaut : celle au nom du mode (sujet 260, ex. « PostgreSQL »). */
  section?: string;
} & (
  | { type: 'toggle' }
  | { type: 'number' }
  /** Bouton pleine largeur (sujet 253) : son clic appelle `write` (valeur undefined). */
  | { type: 'button' }
  | {
      type: 'text';
      /** Plusieurs lignes (zone de texte, ⌘ + Entrée ou sortie du champ pour valider). */
      multiline?: boolean;
      /** Zone de texte en police à chasse fixe, sans retour automatique (sujet 331). */
      monospace?: boolean;
      /** Écrit à chaque frappe, une seule étape d'annulation par saisie (sujet 271) ; sinon à la validation. */
      live?: boolean;
    }
  | {
      type: 'select';
      /**
       * Choix offerts (valeur vide = aucun) ; `palette` : couleurs proposées par l'appli (`ModeEdit.palette`). Si toutes
       * les options ont une icône ou une couleur, le panneau les montre en boutons (pastilles), sinon en liste (sujet
       * 319).
       */
      options(page: PageModel, palette: readonly string[]): ModeOption[];
    }
);

/** Habillage d'une page par son mode. */
export interface PageDressing {
  /**
   * Clés de style dessinées à la place de celles de la forme (ex. fond d'une région éclairci, sujet 345) ; le style
   * draw.io reste intact. undefined = son style.
   */
  shapeStyle?(shape: ShapeModel): Record<string, string> | undefined;
  /**
   * Couleur du mode pour une flèche (#rrggbb, ex. celle de son flux) : trait et pointes la prennent, assombrie de
   * `edgeDarken` ; undefined = son style.
   */
  edgeColor?(edge: EdgeModel): string | undefined;
  /** Assombrissement du trait coloré par le mode (fraction de la luminosité, 0,25 = −25 % ; défaut : 0,25). */
  edgeDarken?: number;
  /** Pastille posée sur une flèche, face à la caméra. */
  edgeBadge?(edge: EdgeModel): EdgeBadge | undefined;
  /** Apparence des pastilles (défaut : `DEFAULT_EDGE_BADGE`). */
  edgeBadgeStyle?: EdgeBadgeStyle;
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
