/** Types publics du moteur, réexportés par la façade `Engine`. */
import type { ElementComment } from '../edit/comment';
import type { PageEffectRegistry } from '../effects/registry';
import type { EdgeEnd } from '../edit/edgeLabels';
import type { CameraState } from '../interaction/cameraMath';
import type { HistoryEntry, LinkUsage, ParentLink } from '../interaction/navigationHistory';
import type { PickedElement } from '../interaction/pick';
import type { DocumentModel, PageModel, Point, Rect } from '../model/types';
import type { PageModeRegistry } from '../modes/registry';
import type { FontSet } from '../render/troikaText';
import type { Settings, SettingsPatch } from '../settings';
import type { ShapeRegistry } from '../shapes/registry';
import type { ModeOption, ModeProperty } from '../modes/types';

export interface Selection {
  pageId: string;
  /** Dernier élément sélectionné (le seul, hors sélection multiple). */
  picked: PickedElement;
  /** Tous les éléments sélectionnés, dans l'ordre de sélection (`picked` est le dernier). */
  items: PickedElement[];
  /** Partie de la forme sélectionnée seule (ex. champ d'une table RDD, sujet 249), définie par le mode de la page. */
  part?: string;
}

/** Registres des plugins (formes, modes, effets) que reçoit le cœur du moteur. */
export interface PluginRegistries {
  registry: ShapeRegistry;
  modes: PageModeRegistry;
  effects: PageEffectRegistry;
}

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  fonts?: FontSet;
  /** Pour ajouter ou surcharger des renderers de formes. */
  registry?: ShapeRegistry;
  /** Pour ajouter ou surcharger des modes de page (sujet 69). */
  modes?: PageModeRegistry;
  /** Pour ajouter ou surcharger des effets de page (sujet 143). */
  effects?: PageEffectRegistry;
  /** Couleur de fond initiale (#rrggbb) ; le paramètre `background.color` la remplace s'il est fourni. */
  background?: string;
  /** Paramètres (SPEC §13) ; ensuite modifiables par `updateSettings`. */
  settings?: SettingsPatch;
  /** Ouverture des liens URL (par défaut : nouvel onglet du navigateur). */
  openUrl?: (href: string) => void;
  /**
   * Édition (SPEC §14) : déplacer, redimensionner, créer, modifier… Désactivée par défaut :
   * le moteur est alors une visionneuse (navigation, liens, sélection).
   */
  editable?: boolean;
}

/** Vue à restaurer au chargement (SPEC §5.3) : dernière page active et caméras par page. */
export interface InitialView {
  pageId?: string;
  /** Caméra de la page `pageId` (prioritaire sur `cameraByPage`). */
  camera?: CameraState;
  cameraByPage?: Record<string, CameraState>;
  /** Pile de navigation à restaurer (SPEC §11.3). */
  history?: HistoryEntry[];
  /** Dernière utilisation des liens du fichier, pour trier les pages parentes. */
  linkUsage?: LinkUsage;
}

/** Ce que ferait « Retour » depuis la page courante. */
export type BackTarget =
  | { kind: 'history'; entry: HistoryEntry; pageName: string }
  | { kind: 'parent'; parent: ParentLink }
  | { kind: 'choose'; parents: ParentLink[] }
  | { kind: 'none' };

/** Mode d'interaction signalé à l'UI : touche pour suivre un lien, ou de sélection multiple, maintenue. */
export type ModeHint = 'navigation' | 'multiSelect';

export type EngineEvents = {
  load: [document: DocumentModel, fileId: string];
  pageChange: [page: PageModel];
  cameraChange: [state: CameraState];
  selectionChange: [selection: Selection | undefined];
  /** « Courant » du mode d'une page changé (ex. flux courant du mode Séquences). */
  modeCurrentChange: [pageId: string, current: string | undefined];
  /** Transition vers une page par un lien : début et fin (entrées ignorées entre les deux). */
  transitionStart: [fromPageId: string, toPageId: string];
  transitionEnd: [pageId: string];
  /** Les paramètres ont changé (à persister / refléter dans l'UI). */
  settingsChange: [settings: Settings];
  /** Touche M : l'UI affiche ou masque la mini-carte. */
  minimapToggle: [];
  /** Touche G : l'UI affiche ou masque le mini-graphe (sujet 366). */
  minigraphToggle: [];
  /** Volumes aplatis ou rétablis (touche V, `setFlattened`). */
  flattenChange: [flattened: boolean];
  /** La pile de navigation a changé (à persister). */
  historyChange: [entries: HistoryEntry[]];
  /** Un lien entre pages vient d'être suivi (à persister pour trier les parents). */
  linkUsed: [fromPageId: string, toPageId: string, at: number];
  /** « Retour » sans historique et plusieurs parents possibles : à l'UI de proposer le choix. */
  backChoice: [parents: ParentLink[]];
  /** Pages ou formes ajoutées, retirées ou renommées : nouveau modèle du document. */
  documentChange: [document: DocumentModel];
  /** Édition du label d'un élément demandée (double-clic, F2) : à l'UI d'afficher un champ. */
  labelEdit: [request: LabelEditRequest];
  /** Mode d'interaction en cours (touche maintenue), pour l'aide de l'UI ; undefined : aucun. */
  modeHint: [hint: ModeHint | undefined];
  /** Commentaire de l'élément survolé (flèche ou forme), pour l'encart de l'UI ; undefined : aucun élément commenté. */
  commentHover: [comment: ElementComment | undefined];
  /** Édition en place du commentaire d'un élément demandée (bouton Modifier, touche C) : à l'UI d'afficher l'éditeur. */
  commentEdit: [request: CommentEditRequest];
  /** Ce qu'annuleraient / rétabliraient `undo` et `redo` (undefined : rien). */
  undoChange: [undoLabel: string | undefined, redoLabel: string | undefined];
  /** Le document a été modifié (déplacement) ou vient d'être sérialisé pour la sauvegarde. */
  modifiedChange: [modified: boolean];
};
export type EngineEvent = keyof EngineEvents;

/**
 * Réglage déclaré par le mode, évalué pour une cible (sujet 294) : ce que le panneau affiche, sans rappeler le mode.
 * Un point d'entrée du réglage qui lève une exception est traité comme absent.
 */
export interface ModePropertyView {
  property: ModeProperty;
  /** Valeur affichée : celle du mode (`value`), sinon l'attribut `key` de la cible. */
  value: string | undefined;
  readOnly: boolean;
  /** Choix offerts (réglage `select`) ; vide pour les autres. */
  options: ModeOption[];
}

/** Barre du courant du mode d'une page (ex. flux courant du mode Séquences). */
export interface ModeIndicator {
  value: string;
  /** #rrggbb */
  color: string;
  label: string;
  /** Valeurs possibles dans l'ordre : boutons précédent / suivant s'il y en a au moins deux. */
  values: string[];
  /** Le libellé se renomme depuis la barre (`renameModeCurrent`). */
  renamable: boolean;
  /** Glissement de la barre quand elle part ou arrive avec une transition, en ms (0 = sans ; réglage du mode). */
  slideDuration: number;
}

/** Commentaire à éditer en place (`commentEdit`) : l'élément, flèche ou forme, et son commentaire actuel. */
export interface CommentEditRequest {
  pageId: string;
  elementId: string;
  onEdge: boolean;
  comment?: ElementComment;
  /** Partie de la forme dont on édite le commentaire (sujet 262) : texte brut, sans format ; `setPartComment`. */
  part?: string;
  /**
   * Élément sélectionné pour l'occasion depuis la navigation libre (« C » sans sélection) : la sortie de l'éditeur
   * retire la sélection (ticket 203).
   */
  fromNavigation?: boolean;
}

/** Champ d'édition de label à afficher par l'UI, à l'emprise de l'élément (pixels du canvas). */
export interface LabelEditRequest {
  pageId: string;
  elementId: string;
  /** Texte de début ou de fin d'une flèche (`setEdgeEndLabel`) ; absent = label de l'élément (`setLabel`). */
  end?: EdgeEnd;
  /**
   * Label enfant d'une flèche en cours d'édition (texte de début, de fin, ou placé ailleurs) : validé par
   * `setEdgeText`. Absent : le label de l'élément, ou un texte de début / fin encore à créer (`end`).
   */
  labelCellId?: string;
  /** Partie de la forme dont on édite le texte (sujet 249) : validé par `setPartText`. */
  part?: string;
  /** Texte d'une seule ligne : Entrée valide (sinon ⌘ + Entrée). */
  singleLine?: boolean;
  /**
   * Texte brut (sujet 258, ex. tables RDD, parties de forme) : ni mise en forme ni panneau de format ; validé sans
   * HTML.
   */
  plain?: boolean;
  /** Texte brut actuel. */
  text: string;
  screen: Rect;
  /**
   * Forme vue de biais ou tournée (iso, volume, vue inclinée ou pivotée) : sa zone de texte, en pixels de
   * page, et ses quatre coins à l'écran (haut-gauche, haut-droit, bas-droit, bas-gauche), là où le label est
   * dessiné. L'éditeur s'y plaque (même plan, même sens). Absent : vue de dessus, `screen` suffit.
   */
  plane?: LabelEditPlane;
  /**
   * Cellule dont le style porte le format du texte (la forme, l'arête, ou le label enfant d'un début /
   * fin) ; absente quand le texte n'existe pas encore (début / fin à créer) : pas de format possible.
   */
  styleCellId?: string;
  /** Style draw.io de cette cellule (police, taille, couleur, alignement), pour un éditeur fidèle. */
  style: Record<string, string>;
  /**
   * Style de l'éditeur quand le texte est dessiné autrement que ne le dit `style` (ex. centré et ajusté sur la
   * pancarte d'un Actor) ; absent : `style`. Le panneau de format garde `style`, celui de la cellule.
   */
  displayStyle?: Record<string, string>;
  /** Label HTML de la cellule (`html=1`), avec sa mise en forme partielle ; absent : texte brut. */
  html?: string;
  /** Pixels écran par pixel de page à cet endroit : taille du texte dans l'éditeur. */
  scale: number;
  /**
   * Texte d'une flèche : `screen` est alors le point du texte (largeur et hauteur nulles), l'éditeur se
   * centre dessus et prend la taille du texte, comme le label dessiné.
   */
  onEdge: boolean;
  /** Fond du texte (`labelBackgroundColor` explicite) ; absent : transparent. */
  background?: string;
  /** Texte de début / fin encore à créer, de l'autre côté du trait (bascule avant la création). */
  flipped?: boolean;
  /**
   * Texte du milieu qui suit sa flèche (`spatial.labelFollow`) : angle à l'écran (radians, sens horaire, jamais
   * à l'envers) du trait au point du texte ; l'éditeur et sa poignée tournent d'autant. Absent : horizontal.
   */
  angle?: number;
  /**
   * Bascule possible de l'autre côté du trait (texte de début / fin dans sa configuration par défaut) :
   * direction du saut à l'écran de la page. Absente si le texte a été placé à la main.
   */
  flip?: 'up' | 'down' | 'left' | 'right';
  /** Halo autour des lettres (texte de flèche sans fond, paramètre `shapes.edgeLabelBackdrop`) : couleur de la page. */
  halo?: string;
  /** Épaisseur et flou du halo, en pixels de page. */
  haloWidth?: number;
  haloBlur?: number;
}

/** Plan du texte d'une forme à l'écran (`LabelEditRequest.plane`). */
export interface LabelEditPlane {
  width: number;
  height: number;
  corners: [Point, Point, Point, Point];
}

/** Ancre d'un texte de flèche : début, milieu ou fin (position le long du tracé). */
export type EdgeTextAnchor = 'start' | 'middle' | 'end';
