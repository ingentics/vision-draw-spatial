import { ISOMETRIC_ELEVATION_DEG } from './interaction/camera';
import { DEFAULT_DEPTH } from './spatial';
import { DRAWIO_STYLES, PASTEL_STYLES, TEXT_STYLES } from './edit/styles';
import type { StylePreset, TextPreset } from './edit/styles';
import { DEFAULT_CONTROLS } from './interaction/controls';
import type { ControlSettings, Shortcuts } from './interaction/controls';
import { FOLLOW_LINK_GESTURES, FOLLOW_LINK_KEYS, MULTI_SELECT_KEYS } from './interaction/selection';

/**
 * Paramètres de l'expérience (SPEC §13) : tout ce qui touche au ressenti est réglable, avec des
 * valeurs par défaut agréables. Objet sérialisable, fusionnable par morceaux, valeurs bornées.
 */

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
  /** Étiquettes sur les façades des bâtiments iso (DB, QUEUE, CACHE ; `spatial.tag` par forme). */
  facadeTags: boolean;
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
}

/** Contour de sélection (SPEC §11.1). */
export interface SelectionSettings {
  /** Mise en valeur : voile d'ombre sur le reste de la page, ou contour bleu pointillé. */
  style: 'veil' | 'outline';
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
  edgeLineStyle: 'straight' | 'sharp' | 'rounded' | 'curved';
  /**
   * Ancrage des flèches sur les formes : manuel (points d'ancrage subdivisés, au choix) ou automatique (on choisit
   * le côté, les flèches y sont réparties) ; une page peut le surcharger (`spatial.anchoring`).
   */
  edgeAnchoring: 'manual' | 'auto';
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
  /**
   * Fond du texte des flèches sans `labelBackgroundColor` explicite : halo de la couleur de la page
   * autour de chaque lettre, fond uni de la couleur de la page, ou transparent.
   */
  edgeLabelBackdrop: 'halo' | 'solid' | 'none';
  /** Épaisseur du halo, en pixels de page. */
  edgeLabelHaloWidth: number;
  /** Flou du bord du halo, en pixels de page (0 = net). */
  edgeLabelHaloBlur: number;
  /** Pastille d'une flèche posée par un mode de page (ex. rang dans un flux) : flèche avec texte, puis sans. */
  edgeBadgeRadius: number;
  edgeBadgeTextSize: number;
  edgeBadgeSmallRadius: number;
  edgeBadgeSmallTextSize: number;
  /** Bordure de la pastille (#rrggbb, pixels de page). */
  edgeBadgeBorderColor: string;
  edgeBadgeBorderWidth: number;
  /** Chiffre de la pastille (#rrggbb). */
  edgeBadgeTextColor: string;
  edgeBadgeBold: boolean;
  /** Écart entre la pastille et le texte du milieu de la flèche, en pixels de page. */
  edgeBadgeGap: number;
  /** Pastille face à la caméra (sinon couchée à plat dans le plan de la page, comme le texte). */
  edgeBadgeFaceCamera: boolean;
  /** Texte d'une flèche qui porte une pastille face à la caméra (sinon à plat). */
  edgeBadgeLabelFaceCamera: boolean;
  /** Assombrissement du trait d'une flèche colorée par un mode (fraction de la luminosité, 0,25 = −25 %). */
  edgeDressingDarken: number;
  /** Opacité de ce qui est hors du courant d'un mode (ex. hors du flux courant du mode Séquences). */
  modeDimOpacity: number;
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

/** Vue graphe (SPEC §12) : disposition des cartes de pages. */
export interface GraphSettings {
  cardWidth: number;
  columnGap: number;
  rowGap: number;
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
}

/** Sauvegarde automatique (édition) : peu après chaque modification, sans interrompre un geste en cours. */
export interface SaveSettings {
  autosave: boolean;
  /** Délai après la dernière modification. */
  delayMs: number;
  /** Délai avant de mémoriser la position de consultation (page, caméra) après le dernier changement. */
  viewStateDelayMs: number;
}

export interface DebugSettings {
  /** Bouton et panneau « Diagnostics » (styles non supportés, SPEC §8.4). */
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
}

/** Moteur de rendu des exports PlantUML (sujet 100). */
export type PlantUmlRenderer = 'kroki' | 'plantuml' | 'local';

/** Exporteurs de l'appli (sujet 100) : rendu en ligne des textes exportés. */
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
        }
      : K extends 'exporters'
        ? { plantuml?: Partial<ExporterSettings['plantuml']> }
        : Partial<Settings[K]>;
};

export const DEFAULT_SETTINGS: Settings = {
  transition: { enabled: true, durationMs: 1000, easing: 'ease-in-out', fadeStart: 0.25, fadeEnd: 0.75 },
  preload: { onClick: true, onHover: false, hoverDelayMs: 300, maxCachedPages: 8 },
  controls: DEFAULT_CONTROLS,
  view: {
    defaultMode: 'top',
    isoAngleDeg: ISOMETRIC_ELEVATION_DEG,
    isoAzimuthDeg: -45,
    switchDurationMs: 450,
    isoVolume: true,
    isoDepth: DEFAULT_DEPTH,
    shadeLight: 0.9,
    shadeDark: 0.62,
    facadeTags: true,
  },
  camera: {
    minZoom: 0.05,
    maxZoom: 16,
    minZoom3d: 0.1,
    maxZoom3d: 4,
    maxTilt3dDeg: 65,
    fovDeg: 45,
    animationMs: 250,
    focusMaxZoom: 2,
    focusPadding: 80,
  },
  background: {
    color: '#ffffff',
    grid: true,
    gridFromPage: true,
    gridSize: 10,
    majorEvery: 4,
    gridColor: '#d4d9e0',
    minorStrength: 0.55,
  },
  minimap: { visible: true, size: 200 },
  selection: {
    style: 'veil',
    veilOpacity: 0.35,
    animated: true,
    speed: 12,
    veilColor: '#202124',
    veilPadding: 10,
    accentColor: '#1a73e8',
  },
  shapes: {
    edgeFontColor: '#000000',
    textSize: 12,
    edgeEndTextSize: 9,
    edgeEndTextColor: '#808080',
    edgeEndTextGapAlong: 6,
    edgeEndTextGapAcross: 4,
    edgeLineStyle: 'rounded',
    edgeAnchoring: 'manual',
    edgeAutoRoute: true,
    edgeShapeClearance: 10,
    edgeSpacing: 10,
    edgePortStub: 20,
    edgeCrossingDetour: 500,
    edgeLabelBackdrop: 'halo',
    edgeLabelHaloWidth: 1.5,
    edgeLabelHaloBlur: 1,
    edgeBadgeRadius: 12,
    edgeBadgeTextSize: 15,
    edgeBadgeSmallRadius: 5.5,
    edgeBadgeSmallTextSize: 7,
    edgeBadgeBorderColor: '#000000',
    edgeBadgeBorderWidth: 1,
    edgeBadgeTextColor: '#000000',
    edgeBadgeBold: false,
    edgeBadgeGap: 2,
    edgeBadgeFaceCamera: true,
    edgeBadgeLabelFaceCamera: true,
    edgeDressingDarken: 0.25,
    modeDimOpacity: 0.3,
    placeholderFill: '#eeeeee',
    placeholderStroke: '#9e9e9e',
  },
  styles: { base: DRAWIO_STYLES, extended: PASTEL_STYLES, text: TEXT_STYLES },
  graph: { cardWidth: 260, columnGap: 200, rowGap: 90 },
  edit: { edgePickTolerance: 6, handlePickTolerance: 8, handleSize: 4, minShapeSize: 10 },
  save: { autosave: true, delayMs: 1000, viewStateDelayMs: 500 },
  debug: { showUnsupportedPanel: true },
  accessibility: { reducedMotion: 'system' },
  panels: {
    left: { collapsed: false, width: 208 },
    right: { collapsed: false, width: 380 },
    stripText: 'up',
    shadow: 0.06,
  },
  exporters: { plantuml: { renderer: 'kroki', localUrl: 'http://localhost:8080' } },
};

/** Bornes des réglages numériques (et pas des curseurs de l'UI). */
export const SETTINGS_LIMITS = {
  'transition.durationMs': { min: 0, max: 5000, step: 50 },
  'transition.fadeStart': { min: 0, max: 1, step: 0.05 },
  'transition.fadeEnd': { min: 0, max: 1, step: 0.05 },
  'controls.orbitSpeed': { min: 0.001, max: 0.02, step: 0.0005 },
  'controls.rotateSpeed': { min: 15, max: 360, step: 5 },
  'preload.hoverDelayMs': { min: 50, max: 3000, step: 50 },
  'preload.maxCachedPages': { min: 1, max: 64, step: 1 },
  'controls.moveSpeed': { min: 50, max: 5000, step: 50 },
  'controls.zoomSpeed': { min: 0.0002, max: 0.01, step: 0.0001 },
  'controls.decelerationMs': { min: 0, max: 600, step: 10 },
  'view.isoAngleDeg': { min: 10, max: 80, step: 1 },
  'view.isoAzimuthDeg': { min: -180, max: 180, step: 1 },
  'view.switchDurationMs': { min: 0, max: 3000, step: 50 },
  'view.isoDepth': { min: 2, max: 120, step: 1 },
  'view.shadeLight': { min: 0.3, max: 1.2, step: 0.02 },
  'view.shadeDark': { min: 0.2, max: 1.2, step: 0.02 },
  'camera.minZoom': { min: 0.01, max: 1, step: 0.01 },
  'camera.maxZoom': { min: 1, max: 64, step: 1 },
  'camera.minZoom3d': { min: 0.02, max: 1, step: 0.01 },
  'camera.maxZoom3d': { min: 1, max: 16, step: 0.5 },
  'camera.maxTilt3dDeg': { min: 10, max: 85, step: 1 },
  'camera.fovDeg': { min: 15, max: 100, step: 1 },
  'camera.animationMs': { min: 0, max: 2000, step: 25 },
  'camera.focusMaxZoom': { min: 0.25, max: 8, step: 0.25 },
  'camera.focusPadding': { min: 0, max: 300, step: 5 },
  'background.gridSize': { min: 2, max: 200, step: 1 },
  'background.majorEvery': { min: 1, max: 20, step: 1 },
  'background.minorStrength': { min: 0, max: 1, step: 0.05 },
  'minimap.size': { min: 120, max: 400, step: 10 },
  'shapes.textSize': { min: 4, max: 72, step: 1 },
  'shapes.edgeEndTextSize': { min: 4, max: 72, step: 1 },
  'shapes.edgeEndTextGapAlong': { min: 0, max: 40, step: 1 },
  'shapes.edgeEndTextGapAcross': { min: 0, max: 40, step: 1 },
  'shapes.edgeShapeClearance': { min: 0, max: 40, step: 1 },
  'shapes.edgeSpacing': { min: 2, max: 40, step: 1 },
  'shapes.edgePortStub': { min: 5, max: 60, step: 1 },
  'shapes.edgeCrossingDetour': { min: 0, max: 2000, step: 50 },
  'shapes.edgeLabelHaloWidth': { min: 0.5, max: 6, step: 0.25 },
  'shapes.edgeLabelHaloBlur': { min: 0, max: 4, step: 0.25 },
  'shapes.edgeBadgeRadius': { min: 3, max: 40, step: 0.5 },
  'shapes.edgeBadgeTextSize': { min: 4, max: 60, step: 1 },
  'shapes.edgeBadgeSmallRadius': { min: 2, max: 20, step: 0.5 },
  'shapes.edgeBadgeSmallTextSize': { min: 3, max: 30, step: 1 },
  'shapes.edgeBadgeBorderWidth': { min: 0, max: 6, step: 0.5 },
  'shapes.edgeBadgeGap': { min: 0, max: 30, step: 1 },
  'shapes.edgeDressingDarken': { min: 0, max: 0.9, step: 0.05 },
  'shapes.modeDimOpacity': { min: 0.05, max: 1, step: 0.05 },
  'selection.speed': { min: 2, max: 80, step: 1 },
  'selection.veilOpacity': { min: 0.05, max: 0.85, step: 0.05 },
  'selection.veilPadding': { min: 0, max: 60, step: 1 },
  'graph.cardWidth': { min: 120, max: 600, step: 10 },
  'graph.columnGap': { min: 40, max: 600, step: 10 },
  'graph.rowGap': { min: 20, max: 400, step: 10 },
  'edit.edgePickTolerance': { min: 1, max: 30, step: 1 },
  'edit.handlePickTolerance': { min: 2, max: 30, step: 1 },
  'edit.handleSize': { min: 2, max: 12, step: 0.5 },
  'edit.minShapeSize': { min: 1, max: 100, step: 1 },
  'save.delayMs': { min: 300, max: 30000, step: 100 },
  'save.viewStateDelayMs': { min: 100, max: 5000, step: 100 },
  'panels.left.width': { min: 160, max: 400, step: 16 },
  'panels.right.width': { min: 240, max: 600, step: 16 },
  'panels.shadow': { min: 0, max: 0.3, step: 0.01 },
} as const;

const EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const;
const MOVE_KEYS = ['letters', 'arrows', 'all'] as const;
const VIEW_MODES = ['top', 'iso', '3d'] as const;
const REDUCED_MOTION = ['system', 'always', 'never'] as const;
const SELECTION_STYLES = ['veil', 'outline'] as const;
const LABEL_BACKDROPS = ['halo', 'solid', 'none'] as const;
const EDGE_LINES = ['straight', 'sharp', 'rounded', 'curved'] as const;
const EDGE_ANCHORINGS = ['manual', 'auto'] as const;
const STRIP_TEXT = ['up', 'down'] as const;
const PLANTUML_RENDERERS = ['kroki', 'plantuml', 'local'] as const;

/**
 * Fusionne une modification dans des paramètres. Les valeurs invalides (mauvais type, hors liste)
 * sont ignorées, les nombres sont ramenés dans leurs bornes : un stockage abîmé ou ancien ne peut
 * pas casser l'application.
 */
export function mergeSettings(base: Settings, patch: SettingsPatch | undefined): Settings {
  const p = patch ?? {};
  const num = (key: keyof typeof SETTINGS_LIMITS, value: unknown, fallback: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    const { min, max } = SETTINGS_LIMITS[key];
    return Math.min(max, Math.max(min, value));
  };
  const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
  const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T =>
    list.includes(value as T) ? (value as T) : fallback;
  const code = (value: unknown, fallback: string) => (typeof value === 'string' && value.length > 0 ? value : fallback);
  const color = (value: unknown, fallback: string) =>
    typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;

  /** Liste de styles : remplacée en entier si chaque entrée est valide (nom, couleurs #rrggbb). */
  const presets = (value: unknown, fallback: StylePreset[]): StylePreset[] => {
    if (!Array.isArray(value)) return fallback;
    const valid = (c: unknown) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
    const list = value.map((entry: Partial<StylePreset> | null) =>
      entry &&
      typeof entry.name === 'string' &&
      valid(entry.fillColor) &&
      valid(entry.strokeColor) &&
      (entry.fontColor === undefined || valid(entry.fontColor))
        ? {
            name: entry.name,
            fillColor: entry.fillColor!.toLowerCase(),
            strokeColor: entry.strokeColor!.toLowerCase(),
            ...(entry.fontColor ? { fontColor: entry.fontColor.toLowerCase() } : {}),
          }
        : undefined,
    );
    return list.every((entry) => entry !== undefined) ? (list as StylePreset[]) : fallback;
  };
  /** Styles de texte : remplacés en entier si chaque entrée est valide (nom, taille, couleur, police). */
  const textPresets = (value: unknown, fallback: TextPreset[]): TextPreset[] => {
    if (!Array.isArray(value)) return fallback;
    const list = value.map((entry: Partial<TextPreset> | null) => {
      if (!entry || typeof entry.name !== 'string') return undefined;
      const size = entry.fontSize;
      if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return undefined;
      if (
        entry.fontColor !== undefined &&
        !(typeof entry.fontColor === 'string' && /^#[0-9a-f]{6}$/i.test(entry.fontColor))
      )
        return undefined;
      if (entry.fontFamily !== undefined && typeof entry.fontFamily !== 'string') return undefined;
      return {
        name: entry.name,
        fontSize: size,
        ...(entry.fontColor ? { fontColor: entry.fontColor.toLowerCase() } : {}),
        ...(entry.fontFamily ? { fontFamily: entry.fontFamily } : {}),
      };
    });
    return list.every((entry) => entry !== undefined) ? (list as TextPreset[]) : fallback;
  };
  const t = p.transition ?? {};
  const pr = p.preload ?? {};
  const c = p.controls ?? {};
  const v = p.view ?? {};
  const m = p.minimap ?? {};
  const b = p.background ?? {};
  const shortcuts = c.shortcuts ?? {};
  return {
    transition: {
      enabled: bool(t.enabled, base.transition.enabled),
      durationMs: num('transition.durationMs', t.durationMs, base.transition.durationMs),
      easing: oneOf(EASINGS, t.easing, base.transition.easing),
      fadeStart: num('transition.fadeStart', t.fadeStart, base.transition.fadeStart),
      fadeEnd: num('transition.fadeEnd', t.fadeEnd, base.transition.fadeEnd),
    },
    preload: {
      onClick: bool(pr.onClick, base.preload.onClick),
      onHover: bool(pr.onHover, base.preload.onHover),
      hoverDelayMs: num('preload.hoverDelayMs', pr.hoverDelayMs, base.preload.hoverDelayMs),
      maxCachedPages: Math.round(num('preload.maxCachedPages', pr.maxCachedPages, base.preload.maxCachedPages)),
    },
    controls: {
      moveKeys: oneOf(MOVE_KEYS, c.moveKeys, base.controls.moveKeys),
      moveSpeed: num('controls.moveSpeed', c.moveSpeed, base.controls.moveSpeed),
      zoomSpeed: num('controls.zoomSpeed', c.zoomSpeed, base.controls.zoomSpeed),
      decelerationMs: num('controls.decelerationMs', c.decelerationMs, base.controls.decelerationMs),
      orbitSpeed: num('controls.orbitSpeed', c.orbitSpeed, base.controls.orbitSpeed),
      multiSelectKey: oneOf(MULTI_SELECT_KEYS, c.multiSelectKey, base.controls.multiSelectKey),
      followLinkKey: oneOf(FOLLOW_LINK_KEYS, c.followLinkKey, base.controls.followLinkKey),
      followLinkGesture: oneOf(FOLLOW_LINK_GESTURES, c.followLinkGesture, base.controls.followLinkGesture),
      rotateSpeed: num('controls.rotateSpeed', c.rotateSpeed, base.controls.rotateSpeed),
      shortcuts: {
        toggleViewMode: code(shortcuts.toggleViewMode, base.controls.shortcuts.toggleViewMode),
        toggle3d: code(shortcuts.toggle3d, base.controls.shortcuts.toggle3d),
        toggleGraph: code(shortcuts.toggleGraph, base.controls.shortcuts.toggleGraph),
        toggleMinimap: code(shortcuts.toggleMinimap, base.controls.shortcuts.toggleMinimap),
        toggleFlatten: code(shortcuts.toggleFlatten, base.controls.shortcuts.toggleFlatten),
        overview: code(shortcuts.overview, base.controls.shortcuts.overview),
        back: code(shortcuts.back, base.controls.shortcuts.back),
        deleteSelection: code(shortcuts.deleteSelection, base.controls.shortcuts.deleteSelection),
        placementVariant: code(shortcuts.placementVariant, base.controls.shortcuts.placementVariant),
      },
    },
    view: {
      defaultMode: oneOf(VIEW_MODES, v.defaultMode, base.view.defaultMode),
      isoAngleDeg: num('view.isoAngleDeg', v.isoAngleDeg, base.view.isoAngleDeg),
      isoAzimuthDeg: num('view.isoAzimuthDeg', v.isoAzimuthDeg, base.view.isoAzimuthDeg),
      switchDurationMs: num('view.switchDurationMs', v.switchDurationMs, base.view.switchDurationMs),
      isoVolume: bool(v.isoVolume, base.view.isoVolume),
      isoDepth: num('view.isoDepth', v.isoDepth, base.view.isoDepth),
      shadeLight: num('view.shadeLight', v.shadeLight, base.view.shadeLight),
      shadeDark: num('view.shadeDark', v.shadeDark, base.view.shadeDark),
      facadeTags: bool(v.facadeTags, base.view.facadeTags),
    },
    camera: mergeCamera(base.camera, p.camera ?? {}, num),
    background: {
      color: color(b.color, base.background.color),
      grid: bool(b.grid, base.background.grid),
      gridFromPage: bool(b.gridFromPage, base.background.gridFromPage),
      gridSize: num('background.gridSize', b.gridSize, base.background.gridSize),
      majorEvery: Math.round(num('background.majorEvery', b.majorEvery, base.background.majorEvery)),
      gridColor: color(b.gridColor, base.background.gridColor),
      minorStrength: num('background.minorStrength', b.minorStrength, base.background.minorStrength),
    },
    minimap: {
      visible: bool(m.visible, base.minimap.visible),
      size: num('minimap.size', m.size, base.minimap.size),
    },
    selection: {
      style: oneOf(SELECTION_STYLES, p.selection?.style, base.selection.style),
      veilOpacity: num('selection.veilOpacity', p.selection?.veilOpacity, base.selection.veilOpacity),
      animated: bool(p.selection?.animated, base.selection.animated),
      speed: num('selection.speed', p.selection?.speed, base.selection.speed),
      veilColor: color(p.selection?.veilColor, base.selection.veilColor),
      veilPadding: num('selection.veilPadding', p.selection?.veilPadding, base.selection.veilPadding),
      accentColor: color(p.selection?.accentColor, base.selection.accentColor),
    },
    shapes: {
      edgeFontColor: color(p.shapes?.edgeFontColor, base.shapes.edgeFontColor),
      textSize: Math.round(num('shapes.textSize', p.shapes?.textSize, base.shapes.textSize)),
      edgeEndTextColor: color(p.shapes?.edgeEndTextColor, base.shapes.edgeEndTextColor),
      edgeEndTextGapAlong: num(
        'shapes.edgeEndTextGapAlong',
        p.shapes?.edgeEndTextGapAlong,
        base.shapes.edgeEndTextGapAlong,
      ),
      edgeEndTextGapAcross: num(
        'shapes.edgeEndTextGapAcross',
        p.shapes?.edgeEndTextGapAcross,
        base.shapes.edgeEndTextGapAcross,
      ),
      edgeLineStyle: oneOf(EDGE_LINES, p.shapes?.edgeLineStyle, base.shapes.edgeLineStyle),
      edgeAnchoring: oneOf(EDGE_ANCHORINGS, p.shapes?.edgeAnchoring, base.shapes.edgeAnchoring),
      edgeAutoRoute: bool(p.shapes?.edgeAutoRoute, base.shapes.edgeAutoRoute),
      edgeShapeClearance: num(
        'shapes.edgeShapeClearance',
        p.shapes?.edgeShapeClearance,
        base.shapes.edgeShapeClearance,
      ),
      edgeSpacing: num('shapes.edgeSpacing', p.shapes?.edgeSpacing, base.shapes.edgeSpacing),
      edgePortStub: num('shapes.edgePortStub', p.shapes?.edgePortStub, base.shapes.edgePortStub),
      edgeCrossingDetour: num(
        'shapes.edgeCrossingDetour',
        p.shapes?.edgeCrossingDetour,
        base.shapes.edgeCrossingDetour,
      ),
      edgeEndTextSize: Math.round(
        num('shapes.edgeEndTextSize', p.shapes?.edgeEndTextSize, base.shapes.edgeEndTextSize),
      ),
      edgeLabelBackdrop: oneOf(LABEL_BACKDROPS, p.shapes?.edgeLabelBackdrop, base.shapes.edgeLabelBackdrop),
      edgeLabelHaloWidth: num(
        'shapes.edgeLabelHaloWidth',
        p.shapes?.edgeLabelHaloWidth,
        base.shapes.edgeLabelHaloWidth,
      ),
      edgeLabelHaloBlur: num('shapes.edgeLabelHaloBlur', p.shapes?.edgeLabelHaloBlur, base.shapes.edgeLabelHaloBlur),
      edgeBadgeRadius: num('shapes.edgeBadgeRadius', p.shapes?.edgeBadgeRadius, base.shapes.edgeBadgeRadius),
      edgeBadgeTextSize: num('shapes.edgeBadgeTextSize', p.shapes?.edgeBadgeTextSize, base.shapes.edgeBadgeTextSize),
      edgeBadgeSmallRadius: num(
        'shapes.edgeBadgeSmallRadius',
        p.shapes?.edgeBadgeSmallRadius,
        base.shapes.edgeBadgeSmallRadius,
      ),
      edgeBadgeSmallTextSize: num(
        'shapes.edgeBadgeSmallTextSize',
        p.shapes?.edgeBadgeSmallTextSize,
        base.shapes.edgeBadgeSmallTextSize,
      ),
      edgeBadgeBorderColor: color(p.shapes?.edgeBadgeBorderColor, base.shapes.edgeBadgeBorderColor),
      edgeBadgeBorderWidth: num(
        'shapes.edgeBadgeBorderWidth',
        p.shapes?.edgeBadgeBorderWidth,
        base.shapes.edgeBadgeBorderWidth,
      ),
      edgeBadgeTextColor: color(p.shapes?.edgeBadgeTextColor, base.shapes.edgeBadgeTextColor),
      edgeBadgeBold: bool(p.shapes?.edgeBadgeBold, base.shapes.edgeBadgeBold),
      edgeBadgeGap: num('shapes.edgeBadgeGap', p.shapes?.edgeBadgeGap, base.shapes.edgeBadgeGap),
      edgeBadgeFaceCamera: bool(p.shapes?.edgeBadgeFaceCamera, base.shapes.edgeBadgeFaceCamera),
      edgeBadgeLabelFaceCamera: bool(p.shapes?.edgeBadgeLabelFaceCamera, base.shapes.edgeBadgeLabelFaceCamera),
      edgeDressingDarken: num(
        'shapes.edgeDressingDarken',
        p.shapes?.edgeDressingDarken,
        base.shapes.edgeDressingDarken,
      ),
      modeDimOpacity: num('shapes.modeDimOpacity', p.shapes?.modeDimOpacity, base.shapes.modeDimOpacity),
      placeholderFill: color(p.shapes?.placeholderFill, base.shapes.placeholderFill),
      placeholderStroke: color(p.shapes?.placeholderStroke, base.shapes.placeholderStroke),
    },
    styles: {
      base: presets(p.styles?.base, base.styles.base),
      extended: presets(p.styles?.extended, base.styles.extended),
      text: textPresets(p.styles?.text, base.styles.text),
    },
    graph: {
      cardWidth: num('graph.cardWidth', p.graph?.cardWidth, base.graph.cardWidth),
      columnGap: num('graph.columnGap', p.graph?.columnGap, base.graph.columnGap),
      rowGap: num('graph.rowGap', p.graph?.rowGap, base.graph.rowGap),
    },
    edit: {
      edgePickTolerance: num('edit.edgePickTolerance', p.edit?.edgePickTolerance, base.edit.edgePickTolerance),
      handlePickTolerance: num('edit.handlePickTolerance', p.edit?.handlePickTolerance, base.edit.handlePickTolerance),
      handleSize: num('edit.handleSize', p.edit?.handleSize, base.edit.handleSize),
      minShapeSize: num('edit.minShapeSize', p.edit?.minShapeSize, base.edit.minShapeSize),
    },
    save: {
      autosave: bool(p.save?.autosave, base.save.autosave),
      delayMs: num('save.delayMs', p.save?.delayMs, base.save.delayMs),
      viewStateDelayMs: num('save.viewStateDelayMs', p.save?.viewStateDelayMs, base.save.viewStateDelayMs),
    },
    debug: { showUnsupportedPanel: bool(p.debug?.showUnsupportedPanel, base.debug.showUnsupportedPanel) },
    accessibility: {
      reducedMotion: oneOf(REDUCED_MOTION, p.accessibility?.reducedMotion, base.accessibility.reducedMotion),
    },
    panels: {
      left: {
        collapsed: bool(p.panels?.left?.collapsed, base.panels.left.collapsed),
        width: Math.round(num('panels.left.width', p.panels?.left?.width, base.panels.left.width)),
      },
      right: {
        collapsed: bool(p.panels?.right?.collapsed, base.panels.right.collapsed),
        width: Math.round(num('panels.right.width', p.panels?.right?.width, base.panels.right.width)),
      },
      stripText: oneOf(STRIP_TEXT, p.panels?.stripText, base.panels.stripText),
      shadow: num('panels.shadow', p.panels?.shadow, base.panels.shadow),
    },
    exporters: {
      plantuml: {
        renderer: oneOf(PLANTUML_RENDERERS, p.exporters?.plantuml?.renderer, base.exporters.plantuml.renderer),
        localUrl: serverUrl(p.exporters?.plantuml?.localUrl, base.exporters.plantuml.localUrl),
      },
    },
  };
}

/** URL de serveur : http(s) seulement, espaces et barres finales retirés ; sinon la valeur précédente. */
function serverUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const url = value.trim().replace(/\/+$/, '');
  return /^https?:\/\/\S+$/i.test(url) ? url : fallback;
}

/**
 * Caméra : bornes cohérentes (le minimum ne dépasse pas le maximum, même s'ils arrivent dans le
 * désordre d'un stockage ancien).
 */
function mergeCamera(
  base: CameraSettings,
  patch: Partial<CameraSettings>,
  num: (key: keyof typeof SETTINGS_LIMITS, value: unknown, fallback: number) => number,
): CameraSettings {
  const value = (key: keyof CameraSettings) => num(`camera.${key}`, patch[key], base[key]);
  const minZoom = value('minZoom');
  const minZoom3d = value('minZoom3d');
  return {
    minZoom,
    maxZoom: Math.max(minZoom, value('maxZoom')),
    minZoom3d,
    maxZoom3d: Math.max(minZoom3d, value('maxZoom3d')),
    maxTilt3dDeg: value('maxTilt3dDeg'),
    fovDeg: value('fovDeg'),
    animationMs: value('animationMs'),
    focusMaxZoom: value('focusMaxZoom'),
    focusPadding: value('focusPadding'),
  };
}

/** Faut-il réduire les animations ? (`systemPrefersReduced` = `prefers-reduced-motion: reduce`). */
export function resolveReducedMotion(
  setting: AccessibilitySettings['reducedMotion'],
  systemPrefersReduced: boolean,
): boolean {
  return setting === 'always' || (setting === 'system' && systemPrefersReduced);
}

/**
 * Couleurs proposées aux modes de page (ex. couleur d'un nouveau flux) : les fonds des styles de forme, styles de base
 * puis palette étendue, à partir du 3ᵉ (ni le blanc ni le gris du début).
 */
export function modePalette(styles: StyleSettings): string[] {
  return [...styles.base, ...styles.extended].slice(2).map((preset) => preset.fillColor);
}
