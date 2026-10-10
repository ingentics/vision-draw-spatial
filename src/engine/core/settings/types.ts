import type { AlignReference } from '../edit/align';
import type { Anchoring, EdgeLine } from '../edit/anchoring/mode';
import type { StylePreset, TextPreset } from '../edit/stylePresets';
import type { ControlSettings, Shortcuts } from '../interaction/controls';
import type { PluginSettings, PluginSettingValue } from './pluginSettings';

/** Types des paramètres (SPEC §13), section par section. */

/** Transition entre pages par un lien (SPEC §11.2). */
export interface TransitionSettings {
  enabled: boolean;
  durationMs: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  /** Fondu croisé des deux pages, en fraction de la durée (début et fin, SPEC §11.2). */
  fadeStart: number;
  fadeEnd: number;
}

/** Préchargement de la page cible d'un lien (SPEC §11.1) et cache des scènes. */
export interface PreloadSettings {
  onClick: boolean;
  onHover: boolean;
  hoverDelayMs: number;
  maxCachedPages: number;
}

/** Modes de vue (SPEC §9.1). */
export interface ViewSettings {
  defaultMode: 'top' | 'iso' | '3d';
  /** Élévation de la caméra au-dessus du sol en mode iso, en degrés (35,26 = isométrie vraie). */
  isoAngleDeg: number;
  /**
   * Rotation ajoutée en passant en iso, en degrés : ±45 = isométrie vraie (vers la droite ou la
   * gauche), 0 = simple inclinaison.
   */
  isoAzimuthDeg: number;
  /** Durée de la bascule 2D ↔ iso. */
  switchDurationMs: number;
  /** Formes en volume en vue iso (blocs) ; sinon tout reste à plat. */
  isoVolume: boolean;
  /** Épaisseur par défaut des volumes, en pixels de page (`spatial.height` par forme). */
  isoDepth: number;
  /** Luminosité des côtés des volumes (fraction de la couleur de fond) : face éclairée, face à l'ombre. */
  shadeLight: number;
  shadeDark: number;
}

/** Caméra (SPEC §9) : bornes de zoom et d'inclinaison, perspective, animations. */
export interface CameraSettings {
  /** Zoom minimal et maximal en 2D et en iso (1 = 100 %). */
  minZoom: number;
  maxZoom: number;
  /** Zoom minimal et maximal en 3D. */
  minZoom3d: number;
  maxZoom3d: number;
  /** Inclinaison maximale de la caméra en 3D, en degrés depuis la verticale. */
  maxTilt3dDeg: number;
  /** Champ de vision vertical de la perspective 3D, en degrés. */
  fovDeg: number;
  /** Durée des déplacements animés (vue globale, réinitialiser la vue, aller à un élément). */
  animationMs: number;
  /** Aller à un élément : zoom maximal et marge autour, en pixels écran. */
  focusMaxZoom: number;
  focusPadding: number;
}

/** Fond de la vue et grille (SPEC §9.5), dans les trois modes. */
export interface BackgroundSettings {
  /** Couleur du fond (#rrggbb). */
  color: string;
  /** Grille affichée. */
  grid: boolean;
  /** Pas de la grille : celui de la page draw.io (`gridSize`) quand elle en a un, sinon `gridSize` ci-dessous. */
  gridFromPage: boolean;
  /** Pas de la grille en pixels de page (draw.io : 10). */
  gridSize: number;
  /** Une ligne principale toutes les N cases (draw.io : 4) ; 1 = pas de lignes principales. */
  majorEvery: number;
  /** Couleur des lignes (#rrggbb) ; les lignes secondaires en sont une version plus légère. */
  gridColor: string;
  /** Intensité des lignes secondaires par rapport aux principales (0–1). */
  minorStrength: number;
}

export interface MinimapSettings {
  visible: boolean;
  /** Largeur en pixels CSS (la hauteur suit les proportions de la page). */
  size: number;
  /** Trait des flèches (#rrggbb). */
  edgeColor: string;
  /** Contour des formes (#rrggbb). */
  outlineColor: string;
}

/** Mini-graphe (sujet 366) : graphe des pages à gauche de la mini-carte, de sa largeur (`minimap.size`). */
export interface MinigraphSettings {
  visible: boolean;
}

/**
 * Commentaire de l'élément survolé, flèche ou forme (étapes 188 à 190) : texte en bas à gauche du rendu, sur un voile
 * dégradé dont la courbe finit au-dessus et à droite du texte.
 */
export interface CommentSettings {
  /** Couleur du voile (#rrggbb). */
  veilColor: string;
  /** Opacité du voile dans le coin et vers la courbe (0–1). */
  opacityCorner: number;
  opacityEdge: number;
  /** Distance de la courbe au texte, au-dessus et à droite, en pixels. */
  marginTop: number;
  marginRight: number;
  /** Rayon de l'arrondi de la courbe (pixels) : 0 = coin droit. */
  curveRadius: number;
  /** Longueur du dégradé du bord, de part et d'autre de la courbe, en pixels. */
  fadeLength: number;
  /** Distance du texte aux bords gauche et bas du rendu, en pixels. */
  padding: number;
  /** Texte : couleur (#rrggbb), taille et largeur maximale en pixels. */
  textColor: string;
  textSize: number;
  textMaxWidth: number;
  /** Durée du fondu à l'apparition et à la disparition, en millisecondes. */
  fadeInMs: number;
  fadeOutMs: number;
}

/**
 * Mise en valeur d'un élément sélectionné : voile d'ombre sur le reste de la page, contour bleu pointillé, ou rien
 * (`none`, imposé par une forme, sujet 330).
 */
export type SelectionStyle = 'veil' | 'outline' | 'none';

/** Contour de sélection (SPEC §11.1). */
export interface SelectionSettings {
  /** Mise en valeur : voile d'ombre sur le reste de la page, ou contour bleu pointillé. */
  style: Exclude<SelectionStyle, 'none'>;
  /** Opacité du voile (0 = invisible, 1 = noir). */
  veilOpacity: number;
  /** Contour : tirets qui défilent lentement le long du contour (« fourmis »). */
  animated: boolean;
  /** Vitesse de défilement, en pixels écran par seconde. */
  speed: number;
  /** Couleur du voile (#rrggbb). */
  veilColor: string;
  /** Marge autour de l'élément sélectionné, dans le voile, en pixels de page. */
  veilPadding: number;
  /** Couleur d'accent : contour de sélection, poignées, cadre de la mini-carte. */
  accentColor: string;
}

/** Rendu des formes et des flèches : valeurs par défaut quand le style draw.io ne précise rien. */
export interface ShapeSettings {
  /** Couleur du texte des flèches sans `fontColor` (#rrggbb). */
  edgeFontColor: string;
  /** Taille du texte des formes et des flèches créées (`fontSize`, pixels de page). */
  textSize: number;
  /** Taille des textes de début et de fin de flèche créés. */
  edgeEndTextSize: number;
  /** Couleur des textes de début et de fin de flèche créés (#rrggbb). */
  edgeEndTextColor: string;
  /** Écarts du placement par défaut d'un texte de début / fin : le long de la flèche, et de côté. */
  edgeEndTextGapAlong: number;
  edgeEndTextGapAcross: number;
  /** Tracé des flèches créées : droite, angles droits, coudes arrondis, ou courbe. */
  edgeLineStyle: EdgeLine;
  /** Saut des flèches créées là où elles passent au-dessus d'une autre (`jumpStyle`, ticket 132). */
  edgeJumpStyle: 'none' | 'arc' | 'gap' | 'sharp' | 'line';
  /** Taille de ce saut (`jumpSize`, pt ; 6 comme draw.io). */
  edgeJumpSize: number;
  /**
   * Ancrage des flèches sur les formes : manuel (points d'ancrage subdivisés, au choix) ou automatique (on choisit
   * le côté, les flèches y sont réparties) ; une page peut le surcharger (`spatial.anchoring`).
   */
  edgeAnchoring: Anchoring;
  /** Ancrage automatique : le tracé contourne les formes et les autres flèches (points intermédiaires écrits). */
  edgeAutoRoute: boolean;
  /** Ancrage automatique : écart minimal entre un tracé et une forme, en pixels de page. */
  edgeShapeClearance: number;
  /** Ancrage automatique : écart entre deux flèches qui partagent un couloir. */
  edgeSpacing: number;
  /** Ancrage automatique : longueur du premier et du dernier segment, perpendiculaires au côté. */
  edgePortStub: number;
  /** Ancrage automatique : détour accepté pour éviter un croisement, en pixels. */
  edgeCrossingDetour: number;
  /** Ancrage Typon : réglages propres, comme ceux de l'automatique (pas de la grille = écart entre flèches). */
  edgePcbAutoRoute: boolean;
  edgePcbShapeClearance: number;
  edgePcbSpacing: number;
  edgePcbPortStub: number;
  edgePcbCrossingDetour: number;
  /** Ancrage Typon : coût d'un coude à 45° et à 90°, en pixels de longueur équivalente. */
  edgePcbBend45: number;
  edgePcbBend90: number;
  /** Marge d'une boucle (flèche d'une forme vers elle-même) autour de la forme, en pixels de page. */
  edgeLoopMargin: number;
  /**
   * Fond du texte des flèches sans `labelBackgroundColor` explicite : halo de la couleur de la page
   * autour de chaque lettre, fond uni de la couleur de la page, ou transparent.
   */
  edgeLabelBackdrop: 'halo' | 'solid' | 'none';
  /** Épaisseur du halo, en pixels de page. */
  edgeLabelHaloWidth: number;
  /** Flou du bord du halo, en pixels de page (0 = net). */
  edgeLabelHaloBlur: number;
  /** Flèche coupée (`split=1`, ticket 219) : longueur visible d'un tronçon, en pixels de page. */
  edgeSplitLength: number;
  /** Longueur du fondu au bout d'un tronçon, comprise dans la longueur visible (0 = sans fondu). */
  edgeSplitFade: number;
  /** Marge entre le texte de renvoi et le bord de son cadre. */
  edgeSplitLabelPadding: number;
  /** Taille du texte de renvoi (pt). */
  edgeSplitLabelSize: number;
  /** Formes non supportées (SPEC §8.4). */
  placeholderFill: string;
  placeholderStroke: string;
}

/** Palettes de styles du panneau « Forme » (fond, contour, texte). */
export interface StyleSettings {
  /** Styles de base de draw.io. */
  base: StylePreset[];
  /** Palette étendue (pastels). */
  extended: StylePreset[];
  /** Styles de texte (taille, couleur, police). */
  text: TextPreset[];
}

/** Vue graphe (SPEC §12) : disposition des nœuds de pages. */
export interface GraphSettings {
  /** Diamètre d'un nœud (cercle). */
  nodeSize: number;
  /** Écart entre deux nœuds voisins d'une rangée (de bord de nom à bord de nom) et entre deux rangées. */
  nodeGap: number;
  layerGap: number;
  /** Écart entre les deux arcs d'un aller-retour, pour qu'ils ne se superposent pas. */
  pairOffset: number;
  /** Couleurs (#rrggbb) : contour d'un nœud, page orpheline, page inaccessible, arcs, noms des pages. La page de départ
   * prend la couleur d'accent (`selection.accentColor`). */
  cardColor: string;
  orphanColor: string;
  unreachableColor: string;
  arcColor: string;
  titleColor: string;
  /** Durée des transitions vue graphe ↔ page, dans les deux sens (ms ; 0 = passage direct). */
  transitionMs: number;
}

/** Édition (SPEC §16) : tolérances et tailles. */
export interface EditSettings {
  /** Distance de clic sur une flèche, en pixels écran. */
  edgePickTolerance: number;
  /** Distance de clic sur une poignée, en pixels écran. */
  handlePickTolerance: number;
  /** Demi-taille des poignées, en pixels écran. */
  handleSize: number;
  /** Taille minimale d'une forme redimensionnée, en pixels de page. */
  minShapeSize: number;
  /** Pas d'une flèche du clavier sur la sélection, en pixels de page. */
  nudgeStep: number;
  /** Pas avec Maj, en pixels de page ; 0 = un pas de grille, calé sur la grille. */
  nudgeCoarseStep: number;
  /** Référence d'« Aligner » (ticket 136) : cadre de la sélection, premier ou dernier élément sélectionné. */
  alignReference: AlignReference;
  /** Nombre d'étapes d'annulation gardées. */
  undoLimit: number;
  /** Décalage d'un collage quand la page n'a pas de grille, en pixels de page. */
  pasteOffset: number;
  /**
   * Point intermédiaire de flèche ramené à moins de cette distance de l'alignement de ses voisins : retiré, en
   * pixels écran (draw.io : `mxGraph.tolerance`, 4).
   */
  edgePointAlignTolerance: number;
  /** Écart des poignées de connexion au bord de la forme, en pixels écran. */
  connectHandleOffset: number;
  /** Taille à l'écran sous laquelle les poignées du milieu d'un côté sont masquées, en pixels. */
  middleHandleMinSpan: number;
}

/** Sauvegarde automatique (édition) : peu après chaque modification, sans interrompre un geste en cours. */
export interface SaveSettings {
  autosave: boolean;
  /** Délai après la dernière modification. */
  delayMs: number;
  /** Délai avant de mémoriser la position de consultation (page, caméra) après le dernier changement. */
  viewStateDelayMs: number;
  /** Nombre de fichiers récents listés par le lanceur. */
  recentLimit: number;
}

export interface DebugSettings {
  /** Bouton et panneau « Diagnostics » (erreurs, styles non supportés, avertissements, SPEC §8.4). */
  showUnsupportedPanel: boolean;
}

export interface AccessibilitySettings {
  /** Réduire les animations : selon le système (`prefers-reduced-motion`), toujours, ou jamais. */
  reducedMotion: 'system' | 'always' | 'never';
}

/** Une barre latérale de l'appli : repliée ou non, largeur en pixels. */
export interface SidePanelSettings {
  collapsed: boolean;
  width: number;
}

/** Barres latérales de l'appli de démo (palette à gauche, panneaux à droite), réglées à la souris. */
export interface PanelsSettings {
  left: SidePanelSettings;
  right: SidePanelSettings;
  /** Sens du nom écrit sur la bande d'une barre repliée : de bas en haut, ou de haut en bas. */
  stripText: 'up' | 'down';
  /** Ombre que les barres projettent sur la zone de dessin : opacité, 0 = pas d'ombre. */
  shadow: number;
  /** Largeur que la zone de dessin garde toujours quand on élargit une barre, en pixels CSS. */
  minCanvas: number;
}

/** Moteur de rendu des exports PlantUML (sujets 100, 439). */
export type PlantUmlRenderer = 'kroki' | 'plantuml' | 'local';

/** Exporteurs de l'appli (sujet 439) : rendu en ligne des textes exportés par les modes, commun à tous. */
export interface ExporterSettings {
  plantuml: {
    renderer: PlantUmlRenderer;
    /** Serveur PlantUML local (`renderer: 'local'`), http(s), sans barre finale. */
    localUrl: string;
  };
}

export interface Settings {
  transition: TransitionSettings;
  preload: PreloadSettings;
  controls: ControlSettings;
  view: ViewSettings;
  camera: CameraSettings;
  background: BackgroundSettings;
  minimap: MinimapSettings;
  minigraph: MinigraphSettings;
  comment: CommentSettings;
  selection: SelectionSettings;
  shapes: ShapeSettings;
  styles: StyleSettings;
  graph: GraphSettings;
  edit: EditSettings;
  save: SaveSettings;
  debug: DebugSettings;
  accessibility: AccessibilitySettings;
  panels: PanelsSettings;
  exporters: ExporterSettings;
  /**
   * Réglages globaux des effets (sujet 145) et des modes (ticket 283) de page : `[id][clé]`, seulement les valeurs
   * changées (nombre, booléen ou couleur #rrggbb). Chaque plugin déclare ses réglages, leurs bornes et leurs défauts
   * (`PluginSetting`) : son registre les résout.
   */
  effects: PluginSettings;
  modes: PluginSettings;
  /** Réglages déclarés par les catégories de formes (sujet 380), même forme : `[catégorie][clé]`. */
  shapeCategories: PluginSettings;
}

/** Modification partielle, section par section (raccourcis compris). */
export type SettingsPatch = {
  [K in keyof Settings]?: K extends 'controls'
    ? Partial<Omit<ControlSettings, 'shortcuts'>> & { shortcuts?: Partial<Shortcuts> }
    : K extends 'panels'
      ? {
          left?: Partial<SidePanelSettings>;
          right?: Partial<SidePanelSettings>;
          stripText?: PanelsSettings['stripText'];
          shadow?: number;
          minCanvas?: number;
        }
      : K extends 'exporters'
        ? { plantuml?: Partial<ExporterSettings['plantuml']> }
        : K extends 'effects' | 'modes' | 'shapeCategories'
          ? Record<string, Record<string, PluginSettingValue | undefined>>
          : Partial<Settings[K]>;
};
